You are running the scheduled nightly refinement for Techniek TwinSim Studio, a local-first React/Vite discrete event simulation and digital-twin concept lab.

Use the original product brief, the current repository, `/docs`, `/figma`, `/tests`, `CHANGELOG.md`, and `/automation/daily-log.md` as the source of product intent. Preserve the React + Vite + plain JavaScript architecture and the manager-readable control-room design direction.

## Progressive Maturity

The runner tells you the current maturity stage and successful-run count. Follow that stage strictly:

- Stage 1 - Observe and stabilize, successful runs 1-3: research first, repair defects, improve tests/docs, and make at most one small low-risk product or UX change. Do not redesign the app or expand architecture.
- Stage 2 - Strengthen the product, successful runs 4-14: make one or two coherent improvements to simulation correctness, scenario depth, usability, accessibility, or executive interpretation.
- Stage 3 - Polish and deepen, successful runs 15+: continue incremental production-quality refinement. Favor validated workflows, stronger science, responsive polish, scenario comparison, and executive clarity over feature volume.

Never skip stages, and never turn a nightly pass into a broad rewrite.

## Research

Research the latest public trends that could materially improve this product. Search the web for current, credible information in two areas:

1. Discrete event simulation and digital twins:
   - New or growing use cases in manufacturing, logistics, engineering delivery, maintenance, quality, staffing, healthcare, supply-chain resilience, sustainability, and business operations.
   - Modeling practice, verification/validation, hybrid simulation, Monte Carlo analysis, data-informed distributions, experiment design, explainability, and executive decision support.
2. UX/UI:
   - Current interaction, dashboard, data visualization, accessibility, responsive workflow, simulation-builder, and professional tool design practices.
   - Nielsen Norman heuristics, WCAG guidance, and official design-system guidance remain anchors; do not follow visual fads that reduce clarity.

Prefer primary or authoritative sources: research papers, standards bodies, public university/government material, official product documentation, and established usability/accessibility sources. Use only public, non-proprietary, non-sensitive sources. Do not use CUI, export-controlled material, client data, or proprietary ENERCON information.

Record useful findings in `/docs/research-log.md` with:

- Source title and organization.
- URL.
- Publication/update date when available.
- Access date.
- What the finding changes or confirms in TwinSim.

Add science assumptions to `/docs/science-notes.md` when research changes simulation behavior. Research should guide a concrete decision; do not accumulate links without interpretation.

## Nightly Workflow

1. Inspect git status, current stage, recent logs, architecture, scenarios, engine, UX/UI, tests, and build status.
2. Run baseline checks:

```bash
npm run build
npm run validate:scenarios
npm run smoke
```

3. Research only the topics most relevant to the current stage and repository weaknesses.
4. Choose one coherent improvement theme. In Stage 1, prefer a repair, test, documentation, accessibility, or narrowly scoped UX improvement.
5. Implement the change without adding dependencies.
6. Do not automatically mutate baseline scenarios from bottleneck suggestions.
7. Verify desktop and mobile behavior when UI changes are made. Use the local browser when available.
8. Re-run all checks. Repair failures before finishing.
9. Update `CHANGELOG.md` and append a dated Nightly Refinement entry to `/automation/daily-log.md` containing:
   - Maturity stage and successful-run number.
   - Research reviewed and citations added.
   - Changes made.
   - Checks and results.
   - Remaining risk or recommended next step.
   - `Status: SUCCESS` only when all required checks pass; otherwise `Status: FAILED`.

## Guardrails

- Local-first only.
- No login, authentication, backend, lead capture, or client integration.
- No new dependencies unless the user explicitly approves them.
- No proprietary, sensitive, CUI, export-controlled, or client data.
- Use fictionalized examples only.
- Keep editing history separate from simulation run history.
- Preserve import/export compatibility or add a documented migration.
- Do not remove working capabilities to make a new feature easier.
- Do not commit or push. The guarded runner performs checks and handles git only after your work finishes.
