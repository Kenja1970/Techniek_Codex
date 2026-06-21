import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scenarioDir = path.join(root, "scenarios");
const requiredFiles = [
  "simple-production-line.json",
  "batch-production.json",
  "job-shop-routing.json",
  "multi-line-cell.json",
  "engineering-production-queue.json"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateScenario(file) {
  const fullPath = path.join(scenarioDir, file);
  const scenario = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  assert(scenario.schemaVersion, `${file}: missing schemaVersion`);
  assert(scenario.scenarioName, `${file}: missing scenarioName`);
  assert(Array.isArray(scenario.objects), `${file}: objects must be an array`);
  assert(Array.isArray(scenario.connectors), `${file}: connectors must be an array`);
  assert(Array.isArray(scenario.materials), `${file}: materials must be an array`);
  assert(Array.isArray(scenario.resources), `${file}: resources must be an array`);
  assert(Array.isArray(scenario.tokenTypes), `${file}: tokenTypes must be an array`);
  assert(scenario.simulation?.runDuration > 0, `${file}: simulation.runDuration must be positive`);

  const objectIds = new Set(scenario.objects.map((object) => object.id));
  for (const object of scenario.objects) {
    assert(object.id && object.type && object.label, `${file}: object missing id/type/label`);
    assert(Number.isFinite(Number(object.x)) && Number.isFinite(Number(object.y)), `${file}: ${object.id} missing x/y`);
  }

  for (const connector of scenario.connectors) {
    assert(objectIds.has(connector.from), `${file}: connector ${connector.id} has unknown from ${connector.from}`);
    assert(objectIds.has(connector.to), `${file}: connector ${connector.id} has unknown to ${connector.to}`);
    assert(connector.type, `${file}: connector ${connector.id} missing type`);
  }

  for (const tokenType of scenario.tokenTypes) {
    assert(objectIds.has(tokenType.sourceId), `${file}: token type ${tokenType.id} has unknown sourceId`);
    assert(tokenType.arrivalInterval > 0, `${file}: token type ${tokenType.id} needs arrivalInterval`);
    assert(tokenType.maxTokens >= 0, `${file}: token type ${tokenType.id} needs maxTokens`);
  }

  return `${file}: ok`;
}

try {
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(scenarioDir, file)));
  assert(!missing.length, `Missing scenario files: ${missing.join(", ")}`);
  const results = requiredFiles.map(validateScenario);
  console.log(results.join("\n"));
  console.log(`Validated ${results.length} scenarios.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
