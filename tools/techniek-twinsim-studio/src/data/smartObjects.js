export const SMART_OBJECT_TABS = [
  {
    id: "manufacturing",
    label: "Manufacturing",
    objects: [
      ["source", "Source", "S"],
      ["queue", "Queue/buffer", "Q"],
      ["processor", "Processor/workstation", "P"],
      ["batchProcessor", "Batch processor", "B"],
      ["assembler", "Assembler", "A"],
      ["inspection", "Inspection station", "I"],
      ["rework", "Rework station", "R"],
      ["scrapSink", "Scrap sink", "X"],
      ["finishedGoods", "Finished goods sink", "F"],
      ["machine", "Machine", "M"],
      ["operator", "Operator/resource", "O"],
      ["downtime", "Downtime event", "D"],
      ["shiftCalendar", "Shift calendar", "C"],
      ["kpiDashboard", "KPI dashboard object", "K"]
    ]
  },
  {
    id: "logistics",
    label: "Logistics",
    objects: [
      ["supplier", "Supplier", "S"],
      ["receivingDock", "Receiving dock", "D"],
      ["inventory", "Raw material inventory", "I"],
      ["staging", "Staging area", "G"],
      ["forklift", "Forklift/material handler", "F"],
      ["deliveryEvent", "Delivery event", "E"],
      ["reorderTrigger", "Reorder point trigger", "R"],
      ["stockoutEvent", "Stockout event", "!"],
      ["materialConnector", "Material supply connector", "L"]
    ]
  },
  {
    id: "engineering",
    label: "Engineering Work",
    objects: [
      ["projectIntake", "Project intake", "I"],
      ["disciplineQueue", "Discipline queue", "Q"],
      ["disciplineWork", "Discipline work package", "W"],
      ["checker", "Checker/reviewer", "C"],
      ["clientReview", "Client review", "V"],
      ["rework", "Rework loop", "R"],
      ["approvalGate", "Approval gate", "A"],
      ["deliverableRelease", "Deliverable release", "D"],
      ["resourcePool", "Resource pool", "P"],
      ["scheduleRisk", "Schedule risk indicator", "!"]
    ]
  }
].map((tab) => ({
  ...tab,
  objects: tab.objects.map(([type, label, icon]) => ({ type, label, icon, category: tab.id }))
}));

export function defaultObjectProperties(type) {
  const common = {
    capacity: 1,
    processTime: { distribution: "triangular", min: 18, mode: 24, max: 36 },
    failureProbability: 0,
    reworkProbability: 0.5,
    scrapProbability: 0.2,
    calendarId: "standard"
  };
  if (type === "source") return { capacity: 1 };
  if (type === "queue" || type === "disciplineQueue") return { capacity: 20 };
  if (type === "batchProcessor") return { ...common, batchEnabled: true, batchSize: 4, maxBatchWait: 80 };
  if (type === "inspection") return { ...common, processTime: { distribution: "uniform", min: 8, max: 16 }, failureProbability: 0.08 };
  if (type === "machine" || type === "processor") {
    return {
      ...common,
      downtime: {
        randomEnabled: true,
        mtbf: 420,
        mttr: 35,
        scheduled: [{ start: 300, duration: 20 }]
      }
    };
  }
  if (type === "rework") return { ...common, processTime: { distribution: "normal", mean: 30, stdev: 8 } };
  return common;
}

export function createSmartObject(type, label, x = 160, y = 160) {
  return {
    id: `${type}-${Date.now().toString(36)}-${Math.round(Math.random() * 9999)}`,
    type,
    label,
    category: SMART_OBJECT_TABS.find((tab) => tab.objects.some((object) => object.type === type))?.id || "manufacturing",
    x,
    y,
    properties: defaultObjectProperties(type)
  };
}
