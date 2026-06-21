import { MetricsCharts } from "../components/charts/MetricsCharts.jsx";
import BottleneckPanel from "../components/studio/BottleneckPanel.jsx";
import InventoryPanel from "../components/studio/InventoryPanel.jsx";
import { SCENARIOS } from "../data/scenarioLibrary.js";
import { downloadJson, downloadResultsCsv, slugify } from "../utils/export.js";

export default function DemoLabPage({
  activeScenario,
  setActiveScenario,
  lastResults,
  setLastResults,
  openStudioWithScenario,
  runScenario
}) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <span className="eyebrow">Preset library</span>
        <h1>Demo Lab</h1>
        <p>Run fictionalized scenarios for manufacturing, batch production, job shop routing, multi-line cells, and engineering work queues.</p>
      </section>

      <section className="scenario-grid">
        {SCENARIOS.map((scenario) => (
          <article className={activeScenario.id === scenario.id ? "scenario-card active" : "scenario-card"} key={scenario.id}>
            <span>{scenario.scenarioType}</span>
            <h2>{scenario.scenarioName}</h2>
            <p>{scenario.assumptions?.summary}</p>
            <div className="button-row">
              <button
                onClick={() => {
                  setActiveScenario(scenario);
                  setLastResults(runScenario(scenario));
                }}
              >
                Quick run
              </button>
              <button className="secondary" onClick={() => openStudioWithScenario(scenario)}>Open in Studio</button>
            </div>
          </article>
        ))}
      </section>

      {lastResults && (
        <>
          <section className="kpi-grid wide">
            <div><span>Scenario</span><strong>{lastResults.scenarioName}</strong></div>
            <div><span>Throughput</span><strong>{lastResults.metrics.throughput}</strong></div>
            <div><span>Avg cycle time</span><strong>{lastResults.metrics.averageCycleTime.toFixed(1)} min</strong></div>
            <div><span>Bottleneck</span><strong>{lastResults.metrics.bottleneck?.label || "None"}</strong></div>
          </section>
          <div className="button-row">
            <button onClick={() => downloadJson(`${slugify(lastResults.scenarioName)}-results.json`, lastResults)}>Export JSON</button>
            <button className="secondary" onClick={() => downloadResultsCsv(lastResults)}>Export CSV</button>
          </div>
          <div className="two-column">
            <InventoryPanel result={lastResults} />
            <BottleneckPanel result={lastResults} />
          </div>
          <MetricsCharts result={lastResults} />
        </>
      )}
    </div>
  );
}
