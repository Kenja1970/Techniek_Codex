import { MetricsCharts } from "../components/charts/MetricsCharts.jsx";
import { SCENARIOS } from "../data/scenarioLibrary.js";
import { runSimulation } from "../engine/simulationEngine.js";
import { executiveInterpretation } from "../utils/analysis.js";

const baseline = runSimulation(SCENARIOS[0]);

export default function HomePage({ onNavigate }) {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Local-first digital-twin lab</span>
          <h1>Techniek TwinSim Studio</h1>
          <p>
            A control-room-style discrete event simulation prototype for manufacturing systems,
            logistics constraints, and engineering production queues.
          </p>
          <div className="hero-actions">
            <button onClick={() => onNavigate("studio")}>Open Studio</button>
            <button className="secondary" onClick={() => onNavigate("start")}>Start Here</button>
          </div>
        </div>
        <div className="hero-console" aria-label="Baseline simulation preview">
          <div className="console-header">
            <span />
            <strong>Baseline run</strong>
            <small>seed {baseline.settings.seed}</small>
          </div>
          <div className="kpi-grid">
            <div><span>Throughput</span><strong>{baseline.metrics.throughput}</strong></div>
            <div><span>WIP</span><strong>{baseline.metrics.wip}</strong></div>
            <div><span>Bottleneck</span><strong>{baseline.metrics.bottleneck?.label}</strong></div>
            <div><span>Stockouts</span><strong>{baseline.metrics.stockoutCount}</strong></div>
          </div>
          <p>{executiveInterpretation(baseline)}</p>
        </div>
      </section>

      <section className="band">
        <div>
          <span className="eyebrow">What it demonstrates</span>
          <h2>Tokens, queues, routes, resources, calendars, downtime, materials, and quality loops.</h2>
        </div>
        <p>
          The first version is intentionally lightweight, but it is not just a mock animation.
          It runs seeded token flow through configurable objects and reports manager-readable constraints.
        </p>
      </section>

      <MetricsCharts result={baseline} />
    </div>
  );
}
