import { chance, createRng, sampleDistribution } from "./random.js";
import { isWithinCalendar, nextCalendarOpen } from "./time.js";

const PROCESS_TYPES = new Set([
  "processor",
  "batchProcessor",
  "assembler",
  "inspection",
  "rework",
  "machine",
  "disciplineWork",
  "checker",
  "clientReview",
  "approvalGate"
]);

const SINK_TYPES = new Set(["finishedGoods", "scrapSink", "deliverableRelease"]);

function clone(value) {
  return structuredClone(value);
}

function routeMap(connectors = []) {
  return connectors.reduce((map, connector) => {
    if (!map.has(connector.from)) map.set(connector.from, []);
    map.get(connector.from).push(connector);
    return map;
  }, new Map());
}

function pickConnector(connectors = [], token, rng) {
  if (!connectors.length) return null;
  const sorted = [...connectors].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const conditional = sorted.find((connector) => {
    if (!connector.condition || connector.condition === "any") return false;
    if (connector.condition === "failed") return token.qualityState === "failed";
    if (connector.condition === "passed") return token.qualityState !== "failed";
    if (connector.condition === token.productType) return true;
    return false;
  });
  if (conditional) return conditional;

  const probabilistic = sorted.filter((connector) => Number(connector.probability) > 0);
  if (probabilistic.length) {
    const roll = rng.next();
    let total = 0;
    for (const connector of probabilistic) {
      total += Number(connector.probability);
      if (roll <= total) return connector;
    }
  }
  return sorted[0];
}

function objectProcessSpec(object, tokenType) {
  const stationSpec = tokenType?.processTimes?.[object.id];
  return stationSpec || object.properties?.processTime || { distribution: "constant", value: 10 };
}

function objectCapacity(object) {
  return Math.max(1, Number(object.properties?.capacity || object.properties?.operators || 1));
}

function objectCalendar(object, scenario) {
  const calendarId = object.properties?.calendarId || "standard";
  return scenario.calendars?.find((calendar) => calendar.id === calendarId) || scenario.calendars?.[0] || {};
}

function requirementsForToken(object, tokenType, token) {
  const tokenRequirements = token?.materialsConsumed ? [] : tokenType?.materialRequirements || [];
  return [...tokenRequirements, ...(object.properties?.materialRequirements || [])];
}

function createStationState(objects) {
  return objects.reduce((states, object) => {
    states[object.id] = {
      id: object.id,
      label: object.label,
      type: object.type,
      queue: [],
      active: [],
      busyTime: 0,
      idleTime: 0,
      downtimeTime: 0,
      blockedTime: 0,
      completed: 0,
      failures: 0,
      batches: 0,
      maxQueue: 0,
      lastClock: 0,
      down: false
    };
    return states;
  }, {});
}

function makeMetrics(scenario) {
  return {
    scenarioName: scenario.scenarioName,
    startedAt: new Date().toISOString(),
    seed: scenario.simulation?.seed || 12345,
    throughput: 0,
    scrapCount: 0,
    reworkCount: 0,
    stockoutCount: 0,
    materialDelayTime: 0,
    completedTokens: [],
    tokenCount: 0,
    wipTrend: [],
    throughputTrend: [],
    queueTrend: [],
    inventoryTrend: [],
    timeline: [],
    events: []
  };
}

export function runSimulation(scenarioInput, options = {}) {
  const scenario = clone(scenarioInput);
  const settings = { ...(scenario.simulation || {}), ...(options.settings || {}) };
  const runDuration = Number(options.durationOverride || settings.runDuration || 960);
  const eventLimit = Number(options.eventLimit || 5000);
  const rng = createRng(settings.seed || 12345);
  const objects = new Map((scenario.objects || []).map((object) => [object.id, object]));
  const routes = routeMap(scenario.connectors || []);
  const stationState = createStationState(scenario.objects || []);
  const materials = new Map(
    (scenario.materials || []).map((material) => [
      material.id,
      {
        ...material,
        inventory: Number(material.startingInventory || 0),
        inbound: [],
        lateDeliveries: 0,
        stockouts: 0
      }
    ])
  );
  const metrics = makeMetrics(scenario);
  const events = [];
  const blocked = [];
  let clock = 0;
  let tokenSerial = 0;

  function schedule(time, type, payload = {}) {
    if (!Number.isFinite(time) || time > runDuration * 2) return;
    events.push({ time: Math.max(0, time), type, payload });
    events.sort((a, b) => a.time - b.time);
  }

  function pushEvent(type, detail = {}) {
    metrics.events.push({ time: clock, type, ...detail });
  }

  function stationMetrics(id) {
    return stationState[id];
  }

  function recordTimeline(token, object, type, start, end) {
    metrics.timeline.push({
      tokenId: token.id,
      tokenLabel: token.label,
      objectId: object.id,
      objectLabel: object.label,
      type,
      start,
      end
    });
  }

  function materialSnapshot() {
    metrics.inventoryTrend.push({
      time: clock,
      ...Object.fromEntries([...materials.values()].map((material) => [material.name, material.inventory]))
    });
  }

  function updateWipSnapshot() {
    const queueTotal = Object.values(stationState).reduce((sum, state) => sum + state.queue.length + state.active.length, 0);
    metrics.wipTrend.push({ time: clock, wip: queueTotal });
    metrics.throughputTrend.push({ time: clock, throughput: metrics.throughput });
    metrics.queueTrend.push({
      time: clock,
      ...Object.fromEntries(Object.values(stationState).map((state) => [state.label, state.queue.length]))
    });
    materialSnapshot();
  }

  function requestReorder(material) {
    if (!material || material.inventory > Number(material.reorderPoint ?? -1)) return;
    if (material.inbound.some((delivery) => delivery.time >= clock)) return;
    const deliveryTime = clock + Number(material.supplierLeadTime || 240) + Number(material.receivingDelay || 0);
    material.inbound.push({ time: deliveryTime, quantity: Number(material.reorderQuantity || 0) });
    schedule(deliveryTime, "material_delivery", { materialId: material.id });
    pushEvent("reorder", { materialId: material.id, quantity: material.reorderQuantity });
  }

  function aggregateRequirements(object, tokenType, tokens) {
    const totals = new Map();
    for (const token of tokens) {
      for (const requirement of requirementsForToken(object, tokenType, token)) {
        const current = totals.get(requirement.materialId) || 0;
        totals.set(requirement.materialId, current + Number(requirement.quantity || 1));
      }
    }
    return [...totals.entries()].map(([materialId, quantity]) => ({ materialId, quantity }));
  }

  function hasMaterials(object, tokenType, tokens) {
    for (const requirement of aggregateRequirements(object, tokenType, tokens)) {
      const material = materials.get(requirement.materialId);
      if (material && material.inventory < requirement.quantity) return false;
    }
    return true;
  }

  function consumeMaterials(object, tokenType, tokens) {
    for (const requirement of aggregateRequirements(object, tokenType, tokens)) {
      const material = materials.get(requirement.materialId);
      if (!material) continue;
      material.inventory -= requirement.quantity;
      requestReorder(material);
    }
    for (const token of tokens) token.materialsConsumed = true;
  }

  function blockForMaterial(object, token, tokenType) {
    blocked.push({ objectId: object.id, token, tokenType, since: clock });
    metrics.stockoutCount += 1;
    stationMetrics(object.id).blockedTime += 1;
    for (const requirement of aggregateRequirements(object, tokenType, [token])) {
      const material = materials.get(requirement.materialId);
      if (material) {
        material.stockouts += 1;
        requestReorder(material);
      }
    }
    pushEvent("stockout", { tokenId: token.id, objectId: object.id });
  }

  function tryBlockedTokens() {
    for (let i = blocked.length - 1; i >= 0; i -= 1) {
      const item = blocked[i];
      const object = objects.get(item.objectId);
      if (object && hasMaterials(object, item.tokenType, [item.token])) {
        blocked.splice(i, 1);
        metrics.materialDelayTime += clock - item.since;
        enqueueAtObject(item.objectId, item.token);
      }
    }
  }

  function nextObjectId(fromId, token) {
    const connector = pickConnector(routes.get(fromId) || [], token, rng);
    return connector?.to || null;
  }

  function completeToken(token, object) {
    token.completedAt = clock;
    token.exitObjectId = object.id;
    metrics.throughput += object.type === "scrapSink" ? 0 : 1;
    if (object.type === "scrapSink") metrics.scrapCount += 1;
    metrics.completedTokens.push(token);
    recordTimeline(token, object, "exit", clock, clock);
    pushEvent("token_exit", { tokenId: token.id, objectId: object.id });
  }

  function routeFrom(objectId, token) {
    const object = objects.get(objectId);
    if (!object) return;
    if (SINK_TYPES.has(object.type)) {
      completeToken(token, object);
      return;
    }
    const targetId = nextObjectId(objectId, token);
    if (!targetId) {
      completeToken(token, object);
      return;
    }
    enqueueAtObject(targetId, token);
  }

  function startProcessing(objectId) {
    const object = objects.get(objectId);
    const state = stationMetrics(objectId);
    if (!object || !state || state.down) return;
    if (!PROCESS_TYPES.has(object.type)) {
      while (state.queue.length) {
        const token = state.queue.shift();
        recordTimeline(token, object, object.type === "queue" ? "queue" : "pass", token.arrivedAtObject || clock, clock);
        routeFrom(objectId, token);
      }
      return;
    }
    const calendar = objectCalendar(object, scenario);
    if (!isWithinCalendar(clock, calendar, settings)) {
      schedule(nextCalendarOpen(clock, calendar, settings), "resource_check", { objectId });
      return;
    }

    const capacity = objectCapacity(object);
    while (state.active.length < capacity && state.queue.length) {
      const batchEnabled = Boolean(object.properties?.batchEnabled || object.type === "batchProcessor");
      const batchSize = batchEnabled ? Number(object.properties?.batchSize || 4) : 1;
      if (batchEnabled && state.queue.length < batchSize) {
        const oldest = state.queue[0];
        const waited = clock - (oldest.arrivedAtObject || clock);
        const maxWait = Number(object.properties?.maxBatchWait || 60);
        if (waited < maxWait) {
          schedule(clock + Math.max(1, maxWait - waited), "batch_wait_expired", { objectId });
          break;
        }
      }

      const batch = state.queue.splice(0, batchEnabled ? Math.min(batchSize, state.queue.length) : 1);
      const tokenType = scenario.tokenTypes.find((type) => type.id === batch[0].productType);
      if (!hasMaterials(object, tokenType, batch)) {
        for (const token of batch) blockForMaterial(object, token, tokenType);
        continue;
      }
      consumeMaterials(object, tokenType, batch);
      const duration = Math.max(0.1, sampleDistribution(objectProcessSpec(object, tokenType), rng));
      const end = clock + duration;
      const activity = { tokens: batch, startedAt: clock, endsAt: end };
      state.active.push(activity);
      state.busyTime += duration;
      if (batch.length > 1) state.batches += 1;
      for (const token of batch) {
        recordTimeline(token, object, "process", clock, end);
      }
      schedule(end, "process_complete", { objectId, activity });
    }
  }

  function enqueueAtObject(objectId, token) {
    const object = objects.get(objectId);
    const state = stationMetrics(objectId);
    if (!object || !state) return;
    token.currentObjectId = objectId;
    token.arrivedAtObject = clock;
    state.queue.push(token);
    state.maxQueue = Math.max(state.maxQueue, state.queue.length);
    pushEvent("token_arrive", { tokenId: token.id, objectId });
    startProcessing(objectId);
  }

  function completeActivity(objectId, activity) {
    const object = objects.get(objectId);
    const state = stationMetrics(objectId);
    if (!object || !state) return;
    if (state.down) {
      schedule(clock + 1, "process_complete", { objectId, activity });
      return;
    }
    state.active = state.active.filter((item) => item !== activity);
    state.completed += activity.tokens.length;
    const tokenType = scenario.tokenTypes.find((type) => type.id === activity.tokens[0].productType);
    const failureProbability = Number(object.properties?.failureProbability ?? tokenType?.failureProbability ?? 0);
    const scrapProbability = Number(object.properties?.scrapProbability ?? tokenType?.scrapProbability ?? 0.2);
    const reworkProbability = Number(object.properties?.reworkProbability ?? tokenType?.reworkProbability ?? 0.6);

    for (const token of activity.tokens) {
      token.qualityState = "passed";
      if (failureProbability > 0 && chance(failureProbability, rng)) {
        state.failures += 1;
        token.qualityState = "failed";
        if (chance(scrapProbability, rng)) {
          const scrapConnector = (routes.get(objectId) || []).find((connector) => connector.type === "scrap");
          if (scrapConnector) {
            enqueueAtObject(scrapConnector.to, token);
            continue;
          }
        }
        if (chance(reworkProbability, rng)) {
          const reworkConnector = (routes.get(objectId) || []).find((connector) => connector.type === "rework");
          if (reworkConnector) {
            metrics.reworkCount += 1;
            enqueueAtObject(reworkConnector.to, token);
            continue;
          }
        }
        token.qualityState = "passed";
      }
      routeFrom(objectId, token);
    }
    startProcessing(objectId);
  }

  function createToken(tokenType) {
    tokenSerial += 1;
    metrics.tokenCount += 1;
    return {
      id: `T${String(tokenSerial).padStart(4, "0")}`,
      label: `${tokenType.label || tokenType.id} ${tokenSerial}`,
      productType: tokenType.id,
      priority: Number(tokenType.priority || 3),
      dueAt: clock + Number(tokenType.dueIn || 0),
      createdAt: clock,
      route: tokenType.route || []
    };
  }

  function scheduleArrivals() {
    for (const tokenType of scenario.tokenTypes || []) {
      const interval = Number(tokenType.arrivalInterval || 60);
      const maxTokens = Number(tokenType.maxTokens || 10);
      const first = Number(tokenType.firstArrival || 0);
      for (let i = 0; i < maxTokens; i += 1) {
        schedule(first + i * interval, "arrival", { tokenTypeId: tokenType.id });
      }
    }
  }

  function scheduleDowntime() {
    for (const object of scenario.objects || []) {
      const downtime = object.properties?.downtime;
      if (!downtime) continue;
      for (const planned of downtime.scheduled || []) {
        schedule(Number(planned.start || 0), "downtime_start", {
          objectId: object.id,
          duration: Number(planned.duration || 30)
        });
      }
      if (downtime.randomEnabled && downtime.mtbf) {
        let t = sampleDistribution({ distribution: "exponential", mean: Number(downtime.mtbf) }, rng);
        while (t < runDuration) {
          schedule(t, "downtime_start", {
            objectId: object.id,
            duration: Number(downtime.mttr || 30)
          });
          t += sampleDistribution({ distribution: "exponential", mean: Number(downtime.mtbf) }, rng);
        }
      }
    }
  }

  scheduleArrivals();
  scheduleDowntime();
  schedule(0, "snapshot");

  let processed = 0;
  while (events.length && processed < eventLimit) {
    const event = events.shift();
    if (event.time > runDuration) break;
    clock = event.time;
    processed += 1;

    if (event.type === "arrival") {
      const tokenType = scenario.tokenTypes.find((type) => type.id === event.payload.tokenTypeId);
      if (!tokenType) continue;
      const token = createToken(tokenType);
      enqueueAtObject(tokenType.sourceId, token);
    }
    if (event.type === "process_complete") {
      completeActivity(event.payload.objectId, event.payload.activity);
    }
    if (event.type === "resource_check" || event.type === "batch_wait_expired") {
      startProcessing(event.payload.objectId);
    }
    if (event.type === "material_delivery") {
      const material = materials.get(event.payload.materialId);
      const delivery = material?.inbound.shift();
      if (material && delivery) {
        material.inventory += Number(delivery.quantity || 0);
        pushEvent("material_delivery", { materialId: material.id, quantity: delivery.quantity });
        tryBlockedTokens();
      }
    }
    if (event.type === "downtime_start") {
      const state = stationMetrics(event.payload.objectId);
      if (state) {
        state.down = true;
        state.downtimeTime += Number(event.payload.duration || 0);
        schedule(clock + Number(event.payload.duration || 0), "downtime_end", { objectId: event.payload.objectId });
        pushEvent("downtime_start", { objectId: event.payload.objectId });
      }
    }
    if (event.type === "downtime_end") {
      const state = stationMetrics(event.payload.objectId);
      if (state) {
        state.down = false;
        pushEvent("downtime_end", { objectId: event.payload.objectId });
        startProcessing(event.payload.objectId);
      }
    }
    if (event.type === "snapshot") {
      updateWipSnapshot();
      schedule(clock + Number(settings.reportingPeriod || 60), "snapshot");
    }
  }

  clock = Math.min(clock, runDuration);
  updateWipSnapshot();

  const stationMetricsList = Object.values(stationState).map((state) => {
    const utilization = runDuration ? Math.min(1, state.busyTime / runDuration) : 0;
    return {
      id: state.id,
      label: state.label,
      type: state.type,
      completed: state.completed,
      utilization,
      queueLength: state.queue.length,
      maxQueue: state.maxQueue,
      busyTime: state.busyTime,
      idleTime: Math.max(0, runDuration - state.busyTime - state.downtimeTime),
      downtimeTime: state.downtimeTime,
      failures: state.failures,
      batches: state.batches
    };
  });
  const bottleneck = [...stationMetricsList]
    .filter((station) => PROCESS_TYPES.has(station.type))
    .sort((a, b) => b.utilization + b.maxQueue / 100 - (a.utilization + a.maxQueue / 100))[0];
  const cycleTimes = metrics.completedTokens.map((token) => (token.completedAt || clock) - token.createdAt);
  const averageCycleTime = cycleTimes.length
    ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length
    : 0;

  return {
    scenarioName: scenario.scenarioName,
    runDuration,
    completedAt: new Date().toISOString(),
    settings,
    clock,
    metrics: {
      ...metrics,
      averageCycleTime,
      wip: metrics.wipTrend.at(-1)?.wip || 0,
      bottleneck,
      stationMetrics: stationMetricsList,
      materials: [...materials.values()].map((material) => ({
        id: material.id,
        name: material.name,
        inventory: material.inventory,
        reorderPoint: material.reorderPoint,
        reorderQuantity: material.reorderQuantity,
        inbound: material.inbound,
        stockouts: material.stockouts
      }))
    }
  };
}
