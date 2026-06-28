import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolDirectory = path.resolve(testDirectory, "..");

// Load app.js headlessly: provide `window` but no `document`, so the DOM
// bootstrap is skipped and only the pure API (window.flangeApp) is exposed.
const sandbox = { window: {}, console };
vm.createContext(sandbox);

for (const filename of [
  "materials-data.js",
  "bolt-materials-data.js",
  "compact-flanges-data.js",
  "asme-nominal-data.js",
  "configuration.js",
  "qualification.js",
  "app.js",
]) {
  vm.runInContext(
    fs.readFileSync(path.join(toolDirectory, filename), "utf8"),
    sandbox,
    { filename }
  );
}

const app = sandbox.window.flangeApp;
assert.ok(
  app && typeof app.calculate === "function",
  "flangeApp.calculate must load without a DOM"
);

const materials = sandbox.window.MATERIAL_STRESS_DATA;
const bolts = sandbox.window.BOLT_STRESS_DATA;
const materialId = (
  materials.find((m) => m.specNo === "SA-516" && String(m.typeGrade) === "70") ??
  materials[0]
).id;
const boltMaterialId = (
  bolts.find((m) => m.specNo === "SA-193" && String(m.typeGrade).includes("B7")) ??
  bolts[0]
).id;

const baseState = {
  productLine: "asme",
  family: "B16.5",
  nps: 4,
  ratingClass: 600,
  pressurePct: 100,
  temperatureF: 100,
  materialId,
  boltMaterialId,
  axialKip: 0,
  momentKipFt: 0,
};

const near = (actual, expected, tol, message) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${message} (expected ~${expected}, got ${actual})`
  );

// 1. ASME B16.5 Class 600 at 100 deg F: derate is unity and rating = table value.
const full = app.calculate(baseState);
near(full.derate, 1, 1e-9, "derate at 100F must be unity");
near(full.ratingPsi, 1480, 1e-6, "Class 600 rating at 100F must be 1480 psi");
near(full.pressurePsi, 1480, 1e-6, "100% of rating must equal the rating");

// 2. At 100% pressure with no external loads, utilization is exactly 1.0.
near(full.utilization, 1, 1e-9, "utilization at 100% pressure must be 1.0");

// 3. Utilization scales linearly with the pressure fraction (gasket area cancels).
const half = app.calculate({ ...baseState, pressurePct: 50 });
near(half.pressurePsi, 740, 1e-6, "50% of 1480 psi must be 740 psi");
near(half.utilization, 0.5, 1e-9, "utilization must track the pressure fraction");

// 4. With no external load the pressure capacity is the full rating (100%).
near(
  full.pressureCapacityPercent,
  100,
  1e-6,
  "zero external load leaves full pressure capacity"
);

// 5. Adding an external axial load raises utilization above the pressure-only case.
const loaded = app.calculate({ ...baseState, pressurePct: 50, axialKip: 100 });
assert.ok(loaded.axialForce === 100000, "axial kip must convert to pounds");
assert.ok(
  loaded.utilization > half.utilization,
  "external load must increase utilization"
);
// Available axial capacity reflects the pressure reserve, not the applied axial,
// so it is unchanged by the load and is larger when less pressure is used.
near(
  loaded.axialOnlyCapacityKip,
  half.axialOnlyCapacityKip,
  1e-9,
  "axial-only capacity is independent of the applied axial load"
);
assert.ok(
  half.axialOnlyCapacityKip > full.axialOnlyCapacityKip,
  "more pressure headroom yields more axial capacity"
);

// 6. Higher temperature derates the allowable stress and the rating.
const hot = app.calculate({ ...baseState, temperatureF: 700 });
assert.ok(hot.derate > 0 && hot.derate <= full.derate, "700F must not increase derate");
assert.ok(hot.ratingPsi <= full.ratingPsi + 1e-9, "derated rating must not exceed 100F");
assert.ok(Number.isFinite(hot.materialStress.allowableKsi), "allowable must be finite");

// 7. Moment loading produces a finite moment-equivalent force when a factor exists.
const moment = app.calculate({ ...baseState, pressurePct: 50, momentKipFt: 50 });
near(moment.momentInLb, 50 * 12000, 1e-6, "kip-ft must convert to in-lb");
assert.ok(Number.isFinite(moment.fm) && moment.fm > 0, "B16.5 NPS4/600 needs a moment factor");
assert.ok(moment.momentEquivalentForce > 0, "moment must add equivalent force");

// 8. Unsupported configurations are rejected (B16.5 Class 2500 stops at NPS 12).
assert.throws(
  () => app.calculate({ ...baseState, nps: 14, ratingClass: 2500 }),
  // The error is constructed inside the vm realm, so match by name, not instanceof.
  (err) => err?.name === "RangeError" && /Unsupported flange configuration/.test(err.message),
  "unsupported flange configuration must throw"
);

// 9. Compact product line returns the seal-preload screening fields.
const compact = app.calculate({
  ...baseState,
  productLine: "compact",
  nps: 4,
  ratingClass: 600,
});
assert.equal(compact.productLine, "compact");
assert.ok(compact.targetSealPreload > 0, "compact path must size a seal preload");
assert.ok(
  Number.isFinite(compact.sealReserveForce),
  "compact path must report a seal reserve"
);
assert.ok(Number.isFinite(compact.utilization), "compact utilization must be finite");
assert.equal(compact.iso27509Workflow.applicable, true, "compact ISO workflow must apply");
assert.ok(Array.isArray(compact.viii2Workflow.checks), "VIII-2 workflow checks must be present");

// 10. Published nominal row is used for B16.5 NPS 4 Class 600.
assert.equal(full.dimensions.matchType, "published-nominal");
assert.equal(full.dimensions.outsideDiameter, 9.5);
assert.equal(full.dimensions.thickness, 1.38);

console.log("calculation tests passed");
