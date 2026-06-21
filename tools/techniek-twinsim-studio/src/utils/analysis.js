import { formatDuration } from "../engine/time.js";

export function getBottleneckNarrative(result) {
  const bottleneck = result?.metrics?.bottleneck;
  if (!bottleneck) return "Run a scenario to identify the current constraint.";

  const causes = [];
  if (bottleneck.utilization > 0.75) causes.push("high utilization");
  if (bottleneck.maxQueue > 3) causes.push("queue growth");
  if (bottleneck.downtimeTime > 0) causes.push("downtime exposure");
  if (result.metrics.stockoutCount > 0) causes.push("material shortages");
  if (result.metrics.reworkCount > 0) causes.push("rework loops");

  const reason = causes.length ? causes.join(", ") : "relative workload compared with nearby steps";
  return `${bottleneck.label} is the current likely constraint because of ${reason}. Average cycle time is ${formatDuration(result.metrics.averageCycleTime)}.`;
}

export function getSuggestions(result) {
  if (!result?.metrics) return [];
  const bottleneck = result.metrics.bottleneck;
  const suggestions = [];
  if (bottleneck?.utilization > 0.8) suggestions.push(`Add capacity or offload work around ${bottleneck.label}.`);
  if (bottleneck?.maxQueue > 5) suggestions.push(`Review release pacing before ${bottleneck.label}; the queue reached ${bottleneck.maxQueue} tokens.`);
  if (bottleneck?.downtimeTime > 0) suggestions.push(`Evaluate preventive maintenance timing for ${bottleneck.label}.`);
  if (result.metrics.stockoutCount > 0) suggestions.push("Raise reorder quantity or reduce supplier lead time for constrained materials.");
  if (result.metrics.reworkCount > 0) suggestions.push("Inspect the quality loop; rework is consuming effective capacity.");
  if (result.metrics.scrapCount > 0) suggestions.push("Quantify scrap cost before using output count as true effective throughput.");
  if (!suggestions.length) suggestions.push("The baseline is stable; use scenario copies to test capacity or material sensitivity.");
  return suggestions;
}

export function executiveInterpretation(result) {
  if (!result?.metrics) return "Run a baseline scenario to generate an executive interpretation.";
  const bottleneck = result.metrics.bottleneck?.label || "the highest loaded station";
  return `The model produced ${result.metrics.throughput} completed tokens with ${result.metrics.wip} active WIP at the end of the run. ${bottleneck} deserves management attention before changing release rates because it is the most likely constraint.`;
}
