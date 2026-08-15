import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const canonicalOrigin = "https://kenja1970.github.io/Techniek_Codex";
const contactEmail = "gregory@techniekengineering.com";
const primaryCtaLabel = "Start a Project";
const navLabels = ["Services", "Tools", "Support Finder", "Contact"];
const errors = [];

const ownedPages = new Map([
  ["index.html", `${canonicalOrigin}/`],
  ["engineering-support.html", `${canonicalOrigin}/engineering-support.html`],
  ["project-management.html", `${canonicalOrigin}/project-management.html`],
  ["energy-management.html", `${canonicalOrigin}/energy-management.html`],
  ["support-finder.html", `${canonicalOrigin}/support-finder.html`],
  ["tools/index.html", `${canonicalOrigin}/tools/`]
]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(entryPath));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }

  return files;
}

function attributeValues(html, attribute) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(
    `<meta\\s+(?:property|name)=["']${escaped}["']\\s+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const contentFirst = new RegExp(
    `<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i"
  );
  return html.match(propertyFirst)?.[1] ?? html.match(contentFirst)?.[1];
}

function canonicalUrl(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["'][^>]*>/i)?.[1];
}

function idsIn(html) {
  return new Set(attributeValues(html, "id"));
}

function resolveLocalReference(htmlFile, reference) {
  const [rawTarget, fragment = ""] = reference.split("#", 2);
  let target = rawTarget.split("?", 1)[0];

  if (!target) return { file: htmlFile, fragment };
  if (target.startsWith("/Techniek_Codex/")) target = target.slice("/Techniek_Codex/".length);
  else if (target.startsWith("/")) target = target.slice(1);

  let resolved = path.resolve(path.dirname(htmlFile), decodeURIComponent(target));
  if (target.endsWith("/")) resolved = path.join(resolved, "index.html");
  return { file: resolved, fragment };
}

for (const [relativePath, expectedCanonical] of ownedPages) {
  const filePath = path.join(dist, relativePath);
  if (!await exists(filePath)) {
    errors.push(`${relativePath}: missing from deploy artifact`);
    continue;
  }

  const html = await readFile(filePath, "utf8");
  const canonical = canonicalUrl(html);
  const ogUrl = metaContent(html, "og:url");

  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relativePath}: missing title`);
  if (!metaContent(html, "description")) errors.push(`${relativePath}: missing description`);
  if (canonical !== expectedCanonical) errors.push(`${relativePath}: canonical must be ${expectedCanonical}`);
  if (ogUrl !== expectedCanonical) errors.push(`${relativePath}: og:url must match canonical`);
  if (!metaContent(html, "og:title")) errors.push(`${relativePath}: missing og:title`);
  if (!metaContent(html, "og:description")) errors.push(`${relativePath}: missing og:description`);
  if (!metaContent(html, "twitter:card")) errors.push(`${relativePath}: missing twitter:card`);

  for (const logo of html.matchAll(/<img\b[^>]*class=["'][^"']*(?:logo|te-logo)[^"']*["'][^>]*>/gi)) {
    if (!/\bwidth=["']294["']/i.test(logo[0]) || !/\bheight=["']99["']/i.test(logo[0])) {
      errors.push(`${relativePath}: logo is missing intrinsic 294x99 dimensions`);
    }
  }

  // Every page must offer a way to make contact without navigating elsewhere first.
  if (!html.includes(`mailto:${contactEmail}`)) {
    errors.push(`${relativePath}: no direct contact email`);
  }

  // One label for the conversion action, one navigation vocabulary, on every page.
  const headerCta = html.match(/<a class="te-button" href="[^"]*#contact">([^<]+)<\/a>/);
  if (!headerCta) {
    errors.push(`${relativePath}: missing the header contact button`);
  } else if (headerCta[1].trim() !== primaryCtaLabel) {
    errors.push(`${relativePath}: header button says "${headerCta[1].trim()}", expected "${primaryCtaLabel}"`);
  }

  const nav = html.match(/<nav class="te-nav-links"[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) {
    errors.push(`${relativePath}: missing the main navigation`);
  } else {
    const labels = [...nav[1].matchAll(/>([^<>]+)<\/a>/g)].map((match) => match[1].trim());
    if (labels.join("|") !== navLabels.join("|")) {
      errors.push(`${relativePath}: nav is [${labels.join(", ")}], expected [${navLabels.join(", ")}]`);
    }
  }
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const sitemapUrl = match[1];
  const publicUrl = new URL(sitemapUrl);
  let relativePath = publicUrl.pathname.replace(/^\/Techniek_Codex\/?/, "");
  if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
  const sitemapTarget = path.join(dist, relativePath);
  if (!await exists(sitemapTarget)) {
    errors.push(`sitemap.xml: ${sitemapUrl} does not resolve in dist`);
    continue;
  }

  if (relativePath.endsWith(".html")) {
    const html = await readFile(sitemapTarget, "utf8");
    if (canonicalUrl(html) !== sitemapUrl) {
      errors.push(`${relativePath}: canonical does not match sitemap URL ${sitemapUrl}`);
    }
    if (metaContent(html, "og:url") !== sitemapUrl) {
      errors.push(`${relativePath}: og:url does not match sitemap URL ${sitemapUrl}`);
    }
  }
}

const htmlFiles = await collectHtml(dist);
for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  const relativeHtml = path.relative(dist, htmlFile).replaceAll("\\", "/");
  const references = [...attributeValues(html, "href"), ...attributeValues(html, "src")];

  for (const reference of references) {
    if (
      /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(reference)
      || reference.includes("${")
      || reference.includes("{{")
    ) {
      continue;
    }

    const target = resolveLocalReference(htmlFile, reference);
    if (!await exists(target.file)) {
      errors.push(`${relativeHtml}: unresolved reference ${reference}`);
      continue;
    }

    if (target.fragment && target.file.endsWith(".html")) {
      const targetHtml = await readFile(target.file, "utf8");
      if (!idsIn(targetHtml).has(decodeURIComponent(target.fragment))) {
        errors.push(`${relativeHtml}: unresolved fragment ${reference}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML files and ${ownedPages.size} metadata contracts.`);
