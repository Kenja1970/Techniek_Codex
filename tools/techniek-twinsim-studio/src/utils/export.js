export function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename, value) {
  downloadText(filename, JSON.stringify(value, null, 2), "application/json");
}

export function resultToCsv(result) {
  const stationRows = result.metrics.stationMetrics.map((station) => ({
    scenario: result.scenarioName,
    timestamp: result.completedAt,
    seed: result.settings.seed,
    station: station.label,
    utilization: station.utilization.toFixed(4),
    completed: station.completed,
    maxQueue: station.maxQueue,
    busyTime: station.busyTime.toFixed(2),
    downtimeTime: station.downtimeTime.toFixed(2),
    failures: station.failures,
    throughput: result.metrics.throughput,
    wip: result.metrics.wip,
    averageCycleTime: result.metrics.averageCycleTime.toFixed(2),
    stockouts: result.metrics.stockoutCount,
    rework: result.metrics.reworkCount,
    scrap: result.metrics.scrapCount
  }));
  const headers = Object.keys(stationRows[0] || { scenario: "", throughput: "" });
  return [
    headers.join(","),
    ...stationRows.map((row) =>
      headers.map((header) => JSON.stringify(String(row[header] ?? ""))).join(",")
    )
  ].join("\n");
}

export function downloadResultsCsv(result) {
  downloadText(
    `${slugify(result.scenarioName)}-results.csv`,
    resultToCsv(result),
    "text/csv"
  );
}

export function slugify(value) {
  return String(value || "twinsim")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
