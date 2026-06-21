import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "../src/engine/simulationEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.resolve(__dirname, "../scenarios/simple-production-line.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

const result = runSimulation(scenario);
const repeat = runSimulation(scenario);

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

function clone(value) {
  return structuredClone(value);
}

function comparableSummary(simulationResult) {
  return {
    throughput: simulationResult.metrics.throughput,
    scrapCount: simulationResult.metrics.scrapCount,
    reworkCount: simulationResult.metrics.reworkCount,
    stockoutCount: simulationResult.metrics.stockoutCount,
    materialDelayTime: simulationResult.metrics.materialDelayTime,
    averageCycleTime: Number(simulationResult.metrics.averageCycleTime.toFixed(6)),
    bottleneckId: simulationResult.metrics.bottleneck?.id,
    stationMetrics: simulationResult.metrics.stationMetrics.map((station) => ({
      id: station.id,
      completed: station.completed,
      failures: station.failures,
      batches: station.batches,
      maxQueue: station.maxQueue,
      utilization: Number(station.utilization.toFixed(6))
    }))
  };
}

function makeLowInventoryScenario(sourceScenario) {
  const variant = clone(sourceScenario);
  variant.materials = variant.materials.map((material) => ({ ...material, startingInventory: 0 }));
  return variant;
}

function makeNoRouteReworkScenario(sourceScenario) {
  const variant = clone(sourceScenario);
  variant.objects = variant.objects.map((object) => {
    if (object.id === "machine-a") {
      return {
        ...object,
        properties: {
          ...object.properties,
          failureProbability: 1,
          scrapProbability: 0,
          reworkProbability: 1,
          downtime: { randomEnabled: false, scheduled: [] }
        }
      };
    }
    if (object.id === "inspect-a") {
      return {
        ...object,
        properties: {
          ...object.properties,
          failureProbability: 0,
          scrapProbability: 0,
          reworkProbability: 0
        }
      };
    }
    return object;
  });
  return variant;
}

check(Boolean(result.metrics), "missing metrics");
check(result.metrics.tokenCount > 0, "no tokens were created");
check(Array.isArray(result.metrics.stationMetrics) && result.metrics.stationMetrics.length > 0, "station metrics missing");
check(Array.isArray(result.metrics.timeline), "timeline missing");
check(Boolean(result.metrics.bottleneck), "bottleneck missing");
check(result.metrics.throughput > 0, "baseline produced no throughput");
check(result.metrics.averageCycleTime >= 0, "average cycle time is negative");

for (const segment of result.metrics.timeline || []) {
  check(Number.isFinite(segment.start), `timeline segment ${segment.tokenId} has non-finite start`);
  check(Number.isFinite(segment.end), `timeline segment ${segment.tokenId} has non-finite end`);
  check(segment.end >= segment.start, `timeline segment ${segment.tokenId} ends before it starts`);
}

for (const station of result.metrics.stationMetrics || []) {
  check(Number.isFinite(station.utilization), `${station.label} utilization is not finite`);
  check(station.utilization >= 0 && station.utilization <= 1, `${station.label} utilization outside 0..1`);
  check(station.maxQueue >= 0, `${station.label} max queue is negative`);
}

check(
  JSON.stringify(comparableSummary(result)) === JSON.stringify(comparableSummary(repeat)),
  "same seed did not reproduce comparable results"
);

const lowInventoryResult = runSimulation(makeLowInventoryScenario(scenario));
check(
  lowInventoryResult.metrics.stockoutCount > result.metrics.stockoutCount,
  "low inventory variant did not increase stockout count"
);
check(lowInventoryResult.metrics.materialDelayTime > 0, "low inventory variant did not record material delay");

const noRouteReworkResult = runSimulation(makeNoRouteReworkScenario(scenario));
const machineMetrics = noRouteReworkResult.metrics.stationMetrics.find((station) => station.id === "machine-a");
check(machineMetrics?.failures > 0, "no-route rework variant did not create machine failures");
check(
  noRouteReworkResult.metrics.reworkCount === 0,
  "rework count increased even though no rework connector was available"
);

if (failures.length) {
  console.error(`Smoke check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Smoke check passed for ${result.scenarioName}.`);
console.log(`Throughput: ${result.metrics.throughput}`);
console.log(`Bottleneck: ${result.metrics.bottleneck.label}`);
console.log(`Regression checks: repeatability, material delay, and no-route rework metrics.`);
