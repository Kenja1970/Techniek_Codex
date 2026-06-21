const steps = [
  ["Open a sample scenario", "Use Demo Lab or Studio to load one of the preset JSON models."],
  ["Run the simulation", "Press Run and watch tokens move across the canvas."],
  ["Read the executive dashboard", "Check throughput, WIP, cycle time, and the current constraint."],
  ["Inspect bottlenecks", "Review utilization, queue growth, downtime, material delay, and rework."],
  ["Modify the model", "Drag objects, connect routes, edit properties, and test a copy."],
  ["Export results", "Save scenario JSON and simulation metrics as CSV/JSON."]
];

export default function StartHerePage({ onNavigate }) {
  return (
    <div className="page-stack narrow">
      <section className="page-heading">
        <span className="eyebrow">3-minute guided path</span>
        <h1>Start with a baseline, then ask what constraint management should do next.</h1>
      </section>
      <div className="step-list">
        {steps.map(([title, body], index) => (
          <article key={title} className="step-row">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="button-row">
        <button onClick={() => onNavigate("demo")}>Open Demo Lab</button>
        <button className="secondary" onClick={() => onNavigate("studio")}>Open Studio</button>
      </div>
    </div>
  );
}
