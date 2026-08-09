import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const finderHtml = await readFile(path.join(root, "outputs", "support-finder.html"), "utf8");
const skills = JSON.parse(await readFile(path.join(root, "outputs", "skills.json"), "utf8"));

// The generated summary must use real newlines so copied and emailed text stays readable.
assert.ok(
  !finderHtml.includes('.join("\\\\n")'),
  "contact summary must join with real newlines"
);

// The primary handoff must transmit the generated summary, not just link to the homepage.
assert.ok(finderHtml.includes("const mailtoHref = `mailto:"), "result card must build a mailto link");
assert.ok(
  finderHtml.includes("encodeURIComponent(summary)"),
  "mailto link must carry the generated summary"
);
assert.ok(
  finderHtml.includes('href="${escapeHtml(mailtoHref)}"'),
  "summary email link must use the escaped mailto href"
);

// The embedded fallback knowledge must stay aligned with the published skills.json contract.
for (const recommendation of skills.recommendations) {
  assert.ok(
    finderHtml.includes(`"${recommendation.id}"`),
    `support finder fallback is missing recommendation ${recommendation.id}`
  );
}

const issueQuestion = skills.questions.find((question) => question.id === "issue");
const offeredIssues = issueQuestion.options.map((option) => option.value);

for (const recommendation of skills.recommendations) {
  for (const issue of recommendation.match?.issue ?? []) {
    assert.ok(
      offeredIssues.includes(issue),
      `recommendation ${recommendation.id} matches unavailable issue option ${issue}`
    );
  }
}

// Retired options must not linger in either the data contract or the embedded fallback.
assert.ok(!finderHtml.includes("ai-workflow"), "retired ai-workflow option must be removed");
assert.ok(
  !offeredIssues.includes("ai-workflow"),
  "retired ai-workflow option must be removed from skills.json"
);

console.log("support finder tests passed");
