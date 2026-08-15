// PrecisionFlow lives in a submodule with its own dependencies (vitest, vite, tsc).
// Deploy environments clone the submodule but do not install its dev dependencies, so
// running its verify script there fails on a missing binary rather than a real defect.
// Skip loudly when the dependencies are absent; CI installs them, so coverage is kept
// wherever it can actually run.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.join(root, "tools", "Techniek-PrecisionFlow");

if (!existsSync(path.join(project, "package.json"))) {
  console.log("SKIP PrecisionFlow verify: submodule not initialized.");
  process.exit(0);
}

if (!existsSync(path.join(project, "node_modules"))) {
  console.log(
    "SKIP PrecisionFlow verify: dependencies not installed. " +
      "Run `npm ci --prefix tools/Techniek-PrecisionFlow` to include it."
  );
  process.exit(0);
}

const result = spawnSync("npm", ["run", "verify", "--prefix", project], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
