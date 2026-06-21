import { MetricsCharts } from "../components/charts/MetricsCharts.jsx";
import BottleneckPanel from "../components/studio/BottleneckPanel.jsx";
import InventoryPanel from "../components/studio/InventoryPanel.jsx";
import { executiveInterpretation } from "../utils/analysis.js";

export default function ExecutiveViewPage({ activeScenario, lastResults, runScenario }) {
  const result = lastResults;
  if (!result) {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <span className="eyebrow">Business-readable baseline</span>
          <h1>Executive View</h1>
          <p>Run a baseline scenario to populate the executive dashboard.</p>
          <button onClick={() => runScenario(activeScenario)}>Run current scenario</button>
        </section>
      </div>
    );
  }
  return (
    <div className="page-stack">
      <section className="page-heading">
        <span className="eyebrow">Business-readable baseline</span>
        <h1>Executive View</h1>
        <p>Starter dashboard for throughput, bottlenecks, WIP, inventory pressure, and quality impact.</p>
      </section>

      <section className="kpi-grid wide">
        <div><span>Throughput</span><strong>{result.metrics.throughput}</strong></div>
        <div><span>Bottleneck station</span><strong>{result.metrics.bottleneck?.label || "None"}</strong></div>
        <div><span>Average cycle time</span><strong>{result.metrics.averageCycleTime.toFixed(1)} min</strong></div>
        <div><span>WIP</span><strong>{result.metrics.wip}</strong></div>
        <div><span>Stockout events</span><strong>{result.metrics.stockoutCount}</strong></div>
        <div><span>Rework / scrap</span><strong>{result.metrics.reworkCount} / {result.metrics.scrapCount}</strong></div>
      </section>

      <section className="executive-interpretation">
        <span className="eyebrow">What this means</span>
        <p>{executiveInterpretation(result)}</p>
        <small>Scenario comparison, ROI estimates, and executive report export are reserved for later refinement.</small>
      </section>

      <div className="two-column">
        <InventoryPanel result={result} />
        <BottleneckPanel result={result} />
      </div>
      <MetricsCharts result={result} />
    </div>
  );
}
