import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const toolDirectory = path.resolve(testDirectory, "..");
const repositoryDirectory = path.resolve(toolDirectory, "../../..");
const outputsDirectory = path.join(repositoryDirectory, "outputs");
const publicBase = "https://kenja1970.github.io/Techniek_Codex/";
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const read = (...parts) =>
  fs.readFileSync(path.join(repositoryDirectory, ...parts), "utf8");

for (const filename of [
  "agent-manifest.json",
  "calculation-schema.json",
  "references.json",
]) {
  assert.doesNotThrow(
    () => JSON.parse(fs.readFileSync(path.join(toolDirectory, filename), "utf8")),
    `${filename} must contain valid JSON`
  );
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(toolDirectory, "agent-manifest.json"), "utf8")
);
assert.equal(manifest.humanEntryPoint, "./index.html");
assert.equal(
  manifest.machineInterfaces.liveSnapshot.schema,
  "./calculation-schema.json"
);
assert.match(manifest.legal.flangetec, /registered trademark of LTS Energy/);
assert.match(
  manifest.legal.asme,
  /do not imply endorsement, approval, or certification/
);

const toolHtml = fs.readFileSync(path.join(toolDirectory, "index.html"), "utf8");
for (const filename of [
  "configuration.js",
  "qualification.js",
  "materials-data.js",
  "bolt-materials-data.js",
  "compact-flanges-data.js",
  "app.js",
]) {
  assert.match(
    toolHtml,
    new RegExp(`src="\\./${escapeRegExp(filename)}(?:\\?[^"]*)?"`)
  );
  assert.equal(
    fs.existsSync(path.join(toolDirectory, filename)),
    true,
    `${filename} must exist beside the tool entry point`
  );
}
assert.match(toolHtml, /agentCalculationState/);
assert.match(toolHtml, /FlangeTec/);
assert.match(toolHtml, /ASME/);
assert.match(toolHtml, /A checkbox is not objective evidence/);
assert.equal(manifest.applicationVersion, "0.6.0-evidence-traceability");

const schema = JSON.parse(
  fs.readFileSync(path.join(toolDirectory, "calculation-schema.json"), "utf8")
);
assert.equal(schema.properties.schemaVersion.const, "1.2.0");

const sitemap = read("outputs", "sitemap.xml");
assert.equal(sitemap.includes("https://example.com"), false);
assert.match(
  sitemap,
  new RegExp(`${escapeRegExp(publicBase)}tools/flange-capacity/`)
);

const briefsFeed = read("outputs", "briefs.xml");
assert.equal(
  briefsFeed.includes("https://example.com"),
  false,
  "briefs.xml must not ship placeholder example.com links"
);
assert.match(
  briefsFeed,
  new RegExp(escapeRegExp(publicBase)),
  "briefs.xml must reference the public site base URL"
);

const robots = read("outputs", "robots.txt");
assert.match(robots, new RegExp(`${escapeRegExp(publicBase)}sitemap\\.xml`));

for (const requiredPath of [
  "index.html",
  "sitemap.xml",
  "tools/flange-capacity/index.html",
  "tools/flange-capacity/agent-manifest.json",
]) {
  assert.equal(
    fs.existsSync(path.join(outputsDirectory, requiredPath)),
    true,
    `${requiredPath} must exist in the publishable outputs tree`
  );
}

console.log("publishing tests passed");
