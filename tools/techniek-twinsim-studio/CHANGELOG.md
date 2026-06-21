# Changelog

## 0.1.0 - 2026-06-14

- Created the initial Techniek TwinSim Studio prototype.
- Added React/Vite app shell with Home, Start Here, Demo Lab, Studio, Executive View, Use Cases, and About pages.
- Added drag-and-drop Studio canvas with smart object tabs, object movement, selection, editable properties, editable connectors, undo/redo, keyboard shortcuts, JSON import/export, and result export.
- Added lightweight seeded DES engine with token flow, distributions, batch behavior, materials, reorders, calendars, downtime, quality failure, rework, scrap, metrics, and timeline output.
- Added five starter scenario presets.
- Added Recharts dashboards, inventory panel, bottleneck suggestions, executive interpretation, and starter timeline/Gantt view.
- Added docs, Figma planning files, tests, validation scripts, smoke script, and automation guidance.

## Unreleased

- Added nested Techniek Project Site support with relative Vite assets, public tool output, and git-scoped nightly automation.
- Added a guarded 2:00 AM Windows/Codex nightly automation runner.
- Added current DES use-case and UX/UI research requirements with source logging.
- Added staged refinement pacing so early runs stabilize the prototype before deeper product polish.
- Added automatic Node bootstrap, clean-tree protection, dependency-change protection, verification, local commit, and optional origin push.
- Added Vite JSX configuration required for the React preview.
- Fixed rework counting so the metric only increments when a failed token actually enters a rework connector.
- Strengthened the smoke check with repeatability, material-delay, metric-range, timeline, and no-route rework regression assertions.
