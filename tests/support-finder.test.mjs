import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const finderHtml = await readFile(path.join(root, "outputs", "support-finder.html"), "utf8");
const skills = JSON.parse(await readFile(path.join(root, "outputs", "skills.json"), "utf8"));

// The generated summary must use real newlines so copied and emailed text stays readable.
assert.ok(!finderHtml.includes('.join("\\\\n")'), "contact summary must join with real newlines");

// The primary handoff must transmit the generated summary to the backend API.
assert.ok(finderHtml.includes('fetch("/api/intake"'), "result card must submit to the intake API");
assert.ok(
  finderHtml.includes('body: JSON.stringify(payload)'),
  "intake submission must carry the generated summary payload"
);

// Form submission is the conversion action, so it must outrank copying it.
assert.ok(
  finderHtml.includes('<button type="submit" id="intake-submit" class="te-button">Submit Inquiry</button>'),
  "the submit action must be the primary button in the result card"
);
assert.ok(
  !finderHtml.includes('<button class="te-button" type="button" data-copy-summary>'),
  "copying must not be styled as the primary action"
);

// The page embeds a copy of skills.json for the offline path. The two are edited by hand, so
// compare them in full rather than spot-checking ids.
const fallbackSource = finderHtml.match(/const fallbackKnowledge = (\{[\s\S]*?\r?\n\});\r?\n/)?.[1];
assert.ok(fallbackSource, "support finder must embed fallbackKnowledge");

let fallback;
assert.doesNotThrow(() => {
  fallback = JSON.parse(fallbackSource);
}, "embedded fallbackKnowledge must be valid JSON");

assert.deepEqual(
  fallback,
  skills,
  "embedded fallbackKnowledge has drifted from outputs/skills.json"
);

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

// Exhaustive correctness check: the visitor's stated need must never be overruled by the
// broader stage/outcome overlap. Weights are read from the page so the two cannot drift.
const weightSource = finderHtml.match(/const ANSWER_WEIGHTS = \{([^}]*)\}/)?.[1];
assert.ok(weightSource, "support finder must declare ANSWER_WEIGHTS");

const weights = Object.fromEntries(
  weightSource
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, value] = entry.split(":").map((part) => part.trim());
      return [key, Number(value)];
    })
);

const score = (recommendation, answers) =>
  Object.entries(answers).reduce(
    (total, [questionId, answer]) =>
      total +
      ((recommendation.match?.[questionId] || []).includes(answer) ? weights[questionId] ?? 1 : 0),
    0
  );

const [issues, stages, outcomes] = skills.questions.map((question) =>
  question.options.map((option) => option.value)
);

const serviceForIssue = new Map(
  skills.recommendations.map((recommendation) => [recommendation.match.issue[0], recommendation.service])
);

const contradictions = [];

for (const issue of issues) {
  for (const stage of stages) {
    for (const outcome of outcomes) {
      const answers = { issue, stage, outcome };
      const [best] = [...skills.recommendations]
        .map((recommendation) => ({ ...recommendation, score: score(recommendation, answers) }))
        .sort((a, b) => b.score - a.score);

      if (best.service !== serviceForIssue.get(issue)) {
        contradictions.push(`${issue}/${stage}/${outcome} recommended ${best.service}`);
      }
    }
  }
}

assert.deepEqual(
  contradictions,
  [],
  `finder recommended a service the visitor did not ask for:\n${contradictions.join("\n")}`
);

console.log(
  `support finder tests passed (${issues.length * stages.length * outcomes.length} answer combinations verified)`
);
