import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolDirectory = path.resolve(testDirectory, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);

for (const filename of ["compact-flanges-data.js", "configuration.js"]) {
  vm.runInContext(
    fs.readFileSync(path.join(toolDirectory, filename), "utf8"),
    sandbox,
    { filename }
  );
}

const compactRows = sandbox.window.COMPACT_FLANGE_DATA;
const configuration = sandbox.window.FLANGE_CONFIGURATION;

assert.equal(compactRows.length, 52, "Expected the supplied 52-row compact dataset");
assert.deepEqual(
  [...configuration.npsOptionsFor({ productLine: "compact", compactRows })],
  [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24]
);
assert.equal(
  configuration.isSupportedConfiguration({
    productLine: "compact",
    family: "B16.5",
    nps: 1.5,
    ratingClass: 600,
    compactRows,
  }),
  false,
  "Unsupported compact NPS values must not map to a neighboring row"
);
assert.equal(
  configuration.exactCompactRecord(compactRows, 4, 600)?.id,
  "flangetec-cf-4p0-600"
);
assert.equal(
  configuration.exactCompactRecord(compactRows, 1.5, 600),
  null,
  "Exact lookup must reject missing catalog rows"
);
assert.equal(
  configuration.classOptionsFor({
    productLine: "asme",
    family: "B16.5",
    nps: 12,
  }).includes(2500),
  true
);
assert.equal(
  configuration.classOptionsFor({
    productLine: "asme",
    family: "B16.5",
    nps: 14,
  }).includes(2500),
  false,
  "B16.5 Class 2500 must stop at NPS 12"
);
assert.deepEqual(
  [...configuration.classOptionsFor({
    productLine: "asme",
    family: "B16.47A",
    nps: 26,
  })],
  [150, 300, 600, 900],
  "Only the currently implemented B16.47 classes may be selected"
);
assert.equal(
  configuration.npsOptionsFor({
    productLine: "asme",
    family: "B16.47B",
  })[0],
  26
);
assert.equal(
  configuration.npsOptionsFor({
    productLine: "asme",
    family: "B16.47B",
  }).at(-1),
  60
);
assert.deepEqual(
  [...configuration.classOptionsFor({
    productLine: "asme",
    family: "B16.47B",
    nps: 48,
  })],
  [150],
  "Series B selections at NPS 48-60 must stay inside the implemented moment-factor map"
);

console.log("configuration tests passed");
