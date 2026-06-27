import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(testDir, "../../_shared");
const gaDir = path.resolve(testDir, "..");

const sandbox = { window: {}, console };
vm.createContext(sandbox);

for (const file of ["blueledger-core.js", "data.js"]) {
  const base = file === "blueledger-core.js" ? sharedDir : gaDir;
  vm.runInContext(fs.readFileSync(path.join(base, file), "utf8"), sandbox, { filename: file });
}

assert.ok(sandbox.window.BL_GEORGIA_DATA?.stations?.length >= 5, "Georgia stations loaded");
assert.ok(sandbox.window.BL_GEORGIA_DATA.basins.length >= 4, "Georgia basins loaded");
assert.equal(
  sandbox.window.BL_GEORGIA_DATA.stations.find((s) => s.id === "usgs-02198500")?.periodOfRecord.start,
  "1878",
  "Savannah POR reaches 1878 target"
);

const station = sandbox.window.BL_GEORGIA_DATA.stations[0];
assert.ok(station.series.flow.length > 100, "Flow series generated");
assert.ok(station.source.url.startsWith("http"), "Source URL present");

console.log("blueledger-georgia tests passed");
