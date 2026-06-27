#!/usr/bin/env node
// Generates the "Project Readiness Guide" lead-magnet PDF from site copy.
// Zero dependencies: writes a valid multi-page PDF using the standard
// Helvetica core fonts (no font embedding required).
//
// Usage: node tools/generate-lead-magnet.mjs
// Output: outputs/assets/techniek-project-readiness-guide.pdf

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "outputs/assets/techniek-project-readiness-guide.pdf");

const CONTACT_EMAIL = "gregory@techniekengineering.com";

// Page geometry (US Letter, points).
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 64;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Document content, derived from the homepage copy (services + project
// readiness evidence cards + secure-intake note).
const BLOCKS = [
  { type: "title", text: "Project Readiness Guide" },
  { type: "subtitle", text: "What to bring to your first conversation with Techniek Engineering" },
  { type: "space", size: 6 },
  {
    type: "body",
    text:
      "A short, well-organized document set helps Techniek Engineering move quickly from the issue to a practical recommendation. Use this guide to gather the right evidence before the first conversation so the discussion stays focused on decisions, not document hunting."
  },
  { type: "h2", text: "How Techniek can help" },
  { type: "bullet", text: "Engineering Support: practical technical review, documentation, and problem-solving so a decision has a clear basis before scope, cost, or schedule moves." },
  { type: "bullet", text: "Project Management: structured planning, coordination, and progress tracking that keeps owners, engineers, contractors, and operators aligned on the same picture." },
  { type: "bullet", text: "Energy Management: performance guidance that turns energy data into specific actions, owners, and follow-up checks." },
  { type: "h2", text: "Bring the right evidence (by area)" },
  { type: "h3", text: "Mechanical / equipment issue" },
  { type: "bullet", text: "Drawings, photos, trend data, reports, and maintenance history." },
  { type: "h3", text: "Civil / facility question" },
  { type: "bullet", text: "Condition notes, site photos, inspection records, utility maps, and known constraints." },
  { type: "h3", text: "Project control" },
  { type: "bullet", text: "Schedules, logs, meeting notes, decision history, and current blockers." },
  { type: "h3", text: "Energy action" },
  { type: "bullet", text: "Bills, interval data, BAS exports, occupancy and operating schedules, and operating limits." },
  { type: "h2", text: "Frame the conversation" },
  { type: "bullet", text: "Name the asset, facility, or project phase involved." },
  { type: "bullet", text: "State the decision, blocker, or deadline that matters most." },
  { type: "bullet", text: "Keep controlled or client-confidential files off public channels until a secure intake path is agreed." },
  { type: "h2", text: "Secure document handling" },
  {
    type: "body",
    text:
      "Do not submit FCI, CUI, export-controlled technical data, credentials, pricing, or client-confidential records through public channels. Controlled project artifacts should use an owner-approved secure intake path and be reviewed before any public summary is created."
  },
  { type: "h2", text: "Start a conversation" },
  { type: "body", text: `Email: ${CONTACT_EMAIL}` },
  { type: "body", text: "Techniek Engineering | Engineering | Project Management | Energy Management" }
];

// Approximate Helvetica advance widths (em fraction). Good enough for wrapping.
function charEm(bold) {
  return bold ? 0.56 : 0.52;
}

function textWidth(text, size, bold) {
  return text.length * size * charEm(bold);
}

function wrap(text, size, bold, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const STYLE = {
  title: { size: 26, bold: true, gapAfter: 10, leading: 30 },
  subtitle: { size: 13, bold: false, gapAfter: 14, leading: 17 },
  h2: { size: 15, bold: true, gapBefore: 14, gapAfter: 6, leading: 19 },
  h3: { size: 12, bold: true, gapBefore: 8, gapAfter: 2, leading: 16 },
  body: { size: 11, bold: false, gapAfter: 8, leading: 15 },
  bullet: { size: 11, bold: false, gapAfter: 5, leading: 15, indent: 16, marker: "\u2022  " }
};

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Lay blocks out into pages of positioned text lines.
function layout() {
  const pages = [];
  let lines = [];
  let y = PAGE_H - MARGIN_TOP;

  const newPage = () => {
    pages.push(lines);
    lines = [];
    y = PAGE_H - MARGIN_TOP;
  };

  for (const block of BLOCKS) {
    if (block.type === "space") {
      y -= block.size;
      continue;
    }
    const style = STYLE[block.type] || STYLE.body;
    if (style.gapBefore) y -= style.gapBefore;
    const indent = style.indent || 0;
    const marker = style.marker || "";
    const maxWidth = CONTENT_W - indent - textWidth(marker, style.size, style.bold);
    const wrapped = wrap(block.text, style.size, style.bold, maxWidth);
    wrapped.forEach((lineText, index) => {
      if (y - style.leading < MARGIN_BOTTOM) newPage();
      const prefix = index === 0 ? marker : "";
      const x = MARGIN_X + indent + (index === 0 ? 0 : textWidth(marker, style.size, style.bold));
      lines.push({ x, y, size: style.size, bold: style.bold, text: prefix + lineText });
      y -= style.leading;
    });
    y -= style.gapAfter || 0;
  }
  pages.push(lines);
  return pages;
}

function pageContentStream(lines) {
  const parts = [];
  for (const line of lines) {
    const font = line.bold ? "/F2" : "/F1";
    parts.push(
      `BT ${font} ${line.size} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`
    );
  }
  return parts.join("\n");
}

function buildPdf(pages) {
  const P = pages.length;
  // Object numbering: 1 catalog, 2 pages, 3 F1, 4 F2,
  // page objects 5..4+P, content objects 5+P..4+2P.
  const pageObjStart = 5;
  const contentObjStart = 5 + P;

  const objects = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const kids = Array.from({ length: P }, (_, i) => `${pageObjStart + i} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${P} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  for (let i = 0; i < P; i += 1) {
    const contentObj = contentObjStart + i;
    objects[pageObjStart + i] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
  }
  for (let i = 0; i < P; i += 1) {
    const stream = pageContentStream(pages[i]);
    const length = Buffer.byteLength(stream, "latin1");
    objects[contentObjStart + i] = `<< /Length ${length} >>\nstream\n${stream}\nendstream`;
  }

  const total = 4 + 2 * P;
  let pdf = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets = new Array(total + 1).fill(0);
  for (let n = 1; n <= total; n += 1) {
    offsets[n] = Buffer.byteLength(pdf, "latin1");
    pdf += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${total + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let n = 1; n <= total; n += 1) {
    pdf += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const pages = layout();
const pdf = buildPdf(pages);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, pdf);
console.log(`Wrote ${OUT} (${pages.length} page(s), ${pdf.length} bytes).`);
