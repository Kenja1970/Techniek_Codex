import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const toolDir = path.resolve(testDir, "..");
const sharedDir = path.resolve(testDir, "../../_shared");

const sandbox = { window: {}, console, performance: { now: () => 0 } };
vm.createContext(sandbox);

for (const [base, file] of [
  [sharedDir, "blueledger-core.js"],
  [toolDir, "engine.js"],
]) {
  vm.runInContext(fs.readFileSync(path.join(base, file), "utf8"), sandbox, { filename: file });
}

const Engine = sandbox.window.PrecisionFlowEngine.PrecisionFlowEngine;
const engine = new Engine();
assert.equal(engine.start(), true, "Standard recipe must start");
engine.tick();
engine.tick();
const snap = engine.snapshot();
assert.ok(snap.tags.length >= 10, "Tag table populated");
assert.equal(snap.recipe.hazardProfileComplete, true);

engine.setRecipe("draft");
assert.equal(engine.start(), false, "Draft recipe blocked without hazard profile");
engine.stop();

console.log("precisionflow tests passed");
