import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const possibleSiteRoot = path.resolve(projectRoot, "../..");
const expectedProjectRoot = path.resolve(
  possibleSiteRoot,
  "tools/techniek-twinsim-studio"
);

if (projectRoot.toLowerCase() !== expectedProjectRoot.toLowerCase()) {
  console.log("Standalone build complete; Techniek site publishing skipped.");
  process.exit(0);
}

const distPath = path.resolve(projectRoot, "dist");
const publicToolsRoot = path.resolve(possibleSiteRoot, "outputs/tools");
const publishPath = path.resolve(
  publicToolsRoot,
  "techniek-twinsim-studio"
);
const safePrefix = `${publicToolsRoot}${path.sep}`.toLowerCase();

if (!publishPath.toLowerCase().startsWith(safePrefix)) {
  throw new Error(`Unsafe publish target: ${publishPath}`);
}
if (!existsSync(distPath)) {
  throw new Error(`Build output was not found: ${distPath}`);
}

rmSync(publishPath, { recursive: true, force: true });
cpSync(distPath, publishPath, { recursive: true });
console.log(`Published TwinSim static files to ${publishPath}`);
