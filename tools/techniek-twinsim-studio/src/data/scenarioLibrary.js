import batchProduction from "../../scenarios/batch-production.json";
import engineeringProductionQueue from "../../scenarios/engineering-production-queue.json";
import jobShopRouting from "../../scenarios/job-shop-routing.json";
import multiLineCell from "../../scenarios/multi-line-cell.json";
import simpleProductionLine from "../../scenarios/simple-production-line.json";

export const SCENARIOS = [
  simpleProductionLine,
  batchProduction,
  jobShopRouting,
  multiLineCell,
  engineeringProductionQueue
];

export const scenarioSummaries = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  name: scenario.scenarioName,
  type: scenario.scenarioType,
  summary: scenario.assumptions?.summary || "",
  objectCount: scenario.objects.length,
  connectorCount: scenario.connectors.length
}));
