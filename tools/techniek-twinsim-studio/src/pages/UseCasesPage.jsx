const useCases = [
  ["Manufacturing production", "Find capacity constraints, WIP growth, downtime impact, and quality loop burden."],
  ["Logistics and supply chain", "Test supplier lead time, reorder points, receiving windows, and stockout consequences."],
  ["Engineering work queues", "Model discipline queues, checker bottlenecks, client reviews, and rework cycles."],
  ["Maintenance backlog", "Represent work-order release, craft availability, downtime windows, and priority rules."],
  ["Proposal and BD pipeline", "Explore intake, review gates, estimating capacity, and decision latency."],
  ["Quality workflows", "Measure NCR routing, inspection hold points, rework burden, and release risk."],
  ["Project delivery", "Use token flow to discuss schedule risk, staffing constraints, and deliverable completion pressure."]
];

export default function UseCasesPage({ onNavigate }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <span className="eyebrow">Business operations as flow systems</span>
        <h1>Use Cases</h1>
        <p>Discrete event simulation is useful anywhere work arrives, waits, competes for resources, branches, and exits with measurable outcomes.</p>
      </section>
      <section className="use-case-grid">
        {useCases.map(([title, body]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="band">
        <h2>Future direction</h2>
        <p>Monte Carlo runs, scenario comparison, fitted distributions, and executive business cases can evolve from the same token-based architecture.</p>
        <button onClick={() => onNavigate("studio")}>Open Studio</button>
      </section>
    </div>
  );
}
