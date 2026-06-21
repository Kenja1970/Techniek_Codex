export default function AboutPage() {
  return (
    <div className="page-stack narrow">
      <section className="page-heading">
        <span className="eyebrow">Project notes</span>
        <h1>Experimental Techniek concept lab</h1>
        <p>
          Techniek TwinSim Studio is a separate prototype under the Techniek name. It is not the main Techniek Engineering consulting site.
        </p>
      </section>
      <section className="note-panel">
        <h2>Guardrails</h2>
        <p>
          The project is local-first, uses fictionalized examples, and avoids proprietary client data, CUI, export-controlled material, authentication, and backend dependencies.
        </p>
      </section>
      <section className="note-panel">
        <h2>Current limitations</h2>
        <p>
          The first engine is deliberately lightweight. It includes real token flow, seeded randomness, materials, downtime, quality, batch behavior, and calendars, but deeper validation, empirical distributions, and Monte Carlo analysis belong in later refinement passes.
        </p>
      </section>
    </div>
  );
}
