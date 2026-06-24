import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolDirectory = path.resolve(testDirectory, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(toolDirectory, "qualification.js"), "utf8"),
  sandbox,
  { filename: "qualification.js" }
);

const qualification = sandbox.window.FLANGE_QUALIFICATION;

const legacyCheckboxOnly = qualification.evaluateEvidenceState({
  productLine: "asme",
  numericalPass: true,
  rawState: Object.fromEntries(
    qualification.requirementsFor("asme").map((item) => [item.id, true])
  ),
});
assert.equal(legacyCheckboxOnly.asserted, 10);
assert.equal(legacyCheckboxOnly.confirmed, 0);
assert.equal(legacyCheckboxOnly.complete, false);
assert.equal(legacyCheckboxOnly.level, "SCREENING ONLY");
assert.match(legacyCheckboxOnly.missing[0].issue, /reference required/i);

const documentedState = Object.fromEntries(
  qualification.requirementsFor("compact").map((item, index) => [
    item.id,
    {
      asserted: true,
      evidenceReference: `DOC-${String(index + 1).padStart(2, "0")}`,
    },
  ])
);
const documentedCompact = qualification.evaluateEvidenceState({
  productLine: "compact",
  numericalPass: true,
  rawState: documentedState,
});
assert.equal(documentedCompact.required, 11);
assert.equal(documentedCompact.confirmed, 11);
assert.equal(documentedCompact.complete, true);
assert.equal(
  documentedCompact.level,
  "READY FOR ENGINEER-OF-RECORD REVIEW"
);

const failedNumerical = qualification.evaluateEvidenceState({
  productLine: "compact",
  numericalPass: false,
  rawState: documentedState,
});
assert.equal(failedNumerical.complete, true);
assert.equal(failedNumerical.level, "SCREENING CHECK FAILED");

console.log("qualification evidence tests passed");
