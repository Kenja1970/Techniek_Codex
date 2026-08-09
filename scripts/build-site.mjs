import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "outputs");
const destination = path.join(root, "dist");

const rootFiles = [
  "index.html",
  "engineering-support.html",
  "project-management.html",
  "energy-management.html",
  "support-finder.html",
  "robots.txt",
  "sitemap.xml",
  "skills.json",
  ".nojekyll",
  "_redirects"
];

const excludedNames = new Set(["README.md", "CHANGELOG.md"]);
const excludedRelativePaths = new Set([
  "tools/flange-capacity/qualification-packages-compact-4in-600.md"
]);

const canonicalOrigin = "https://kenja1970.github.io/Techniek_Codex";
const toolRoutes = new Map([
  ["tools/techniek-opsboard/index.html", "/tools/techniek-opsboard/"],
  ["tools/techniek-twinsim-studio/index.html", "/tools/techniek-twinsim-studio/"],
  ["tools/flange-capacity/index.html", "/tools/flange-capacity/"],
  ["tools/blueledger-georgia/index.html", "/tools/blueledger-georgia/"],
  ["tools/blueledger-west/index.html", "/tools/blueledger-west/"],
  ["tools/precisionflow/index.html", "/tools/precisionflow/"],
  ["tools/greg-brown-site/index.html", "/tools/greg-brown-site/"]
]);

function shouldCopy(sourcePath) {
  const relativePath = path.relative(source, sourcePath).replaceAll("\\", "/");
  const segments = relativePath.split("/");

  if (segments.includes(".git") || segments.includes(".github") || segments.includes("tests")) {
    return false;
  }

  if (relativePath.startsWith("tools/greg-brown-site/_not-found")) {
    return false;
  }

  if (excludedNames.has(path.basename(sourcePath))) {
    return false;
  }

  return !excludedRelativePaths.has(relativePath);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const file of rootFiles) {
  await cp(path.join(source, file), path.join(destination, file));
}

for (const directory of ["assets", "tools"]) {
  await cp(path.join(source, directory), path.join(destination, directory), {
    recursive: true,
    filter: shouldCopy
  });
}

for (const [relativePath, route] of toolRoutes) {
  const filePath = path.join(destination, relativePath);
  const html = await readFile(filePath, "utf8");
  if (/rel=["']canonical["']/i.test(html)) continue;

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "Techniek Engineering Tool";
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? "A practical engineering tool from Techniek Engineering.";
  const canonical = `${canonicalOrigin}${route}`;
  const metadata = [
    `  <link rel="canonical" href="${canonical}">`,
    "  <meta property=\"og:site_name\" content=\"Techniek Engineering\">",
    "  <meta property=\"og:type\" content=\"website\">",
    `  <meta property="og:title" content="${title.replaceAll("\"", "&quot;")}">`,
    `  <meta property="og:description" content="${description.replaceAll("\"", "&quot;")}">`,
    `  <meta property="og:url" content="${canonical}">`,
    `  <meta property="og:image" content="${canonicalOrigin}/assets/logo.png">`,
    "  <meta name=\"twitter:card\" content=\"summary\">"
  ].join("\n");

  await writeFile(filePath, html.replace(/<\/head>/i, `${metadata}\n</head>`));
}

console.log(`Built deployable site at ${destination}`);
