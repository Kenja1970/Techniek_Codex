import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "tools", "Techniek-PrecisionFlow", "dist");
const dest = path.join(root, "outputs", "tools", "precisionflow");
const readme = `# Techniek PrecisionFlow (published build)

This folder contains the **built static output** of Techniek PrecisionFlow,
served by GitHub Pages at \`tools/precisionflow/\` and the local preview server.
Do not edit these files by hand.

- Source of truth: https://github.com/Kenja1970/Techniek-PrecisionFlow
- Monorepo submodule: \`tools/Techniek-PrecisionFlow\`
- Tech: Vite + React (\`base: "./"\`, portable to this subpath)

## Updating

From the Techniek_Codex repository root:

\`\`\`powershell
npm run publish:precisionflow
\`\`\`

Or manually:

\`\`\`powershell
cd tools/Techniek-PrecisionFlow
npm run build
# copy dist/* to outputs/tools/precisionflow/ (keep this README)
\`\`\`
`;

if (!fs.existsSync(src)) {
  console.error("Missing build output:", src);
  console.error("Run: npm run build --prefix tools/Techniek-PrecisionFlow");
  process.exit(1);
}

for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
  if (entry.name === "README.md") continue;
  const target = path.join(dest, entry.name);
  fs.rmSync(target, { recursive: true, force: true });
}

for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
  fs.cpSync(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true });
}

fs.writeFileSync(path.join(dest, "README.md"), readme);
console.log("Published PrecisionFlow build to outputs/tools/precisionflow/");
