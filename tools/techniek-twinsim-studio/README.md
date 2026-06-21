# Techniek TwinSim Studio

Techniek TwinSim Studio is a local-first React/Vite concept lab for token-based discrete event simulation, digital-twin thinking, manufacturing flow, logistics constraints, and engineering production queues.

It is an experimental product lab under the Techniek name, not the main Techniek Engineering consulting site.

## What It Does

- Runs lightweight seeded token-flow simulations through configurable objects, queues, connectors, materials, calendars, downtime, and quality loops.
- Provides a drag-and-drop Studio canvas for building or modifying scenarios.
- Shows manager-readable dashboards for throughput, WIP, utilization, bottlenecks, inventory pressure, rework, scrap, and cycle time.
- Exports scenario JSON and simulation results as JSON/CSV.
- Includes documentation and automation prompts for nightly refinement.

## Install And Run

```bash
npm install
npm run dev
```

When this project is nested at `tools/techniek-twinsim-studio` inside the Techniek Project Site, `npm run build` creates local `dist` output and safely mirrors it to `outputs/tools/techniek-twinsim-studio`. Standalone clones keep only the local `dist` build.

Other useful commands:

```bash
npm run build
npm run preview
npm run validate:scenarios
npm run smoke
```

The top-level `index.html` is both the Vite entry point and a static fallback page. If the React bundle does not load, the user still sees a basic Techniek TwinSim Studio landing message.

## Opening Sample Scenarios

Use Demo Lab or Studio to open one of the preset JSON scenarios:

- Simple Production Line
- Batch Production
- Job Shop Routing
- Multi-Line Manufacturing Cell
- Engineering Production Queue

The source files are in `/scenarios`.

## Editing A Scenario

Open Studio, drag smart objects from the Manufacturing, Logistics, or Engineering Work tabs, then move objects on the canvas. Select an object or connector to edit properties. Use the Connect action after selecting a source object to create a routed connector.

Studio keyboard shortcuts:

- Space: run/pause
- R: reset
- S: export scenario JSON
- I: import scenario JSON
- Delete/Backspace: delete selected object or connector
- Ctrl/Cmd + D: duplicate selected object
- Ctrl/Cmd + Z: undo
- Ctrl/Cmd + Shift + Z: redo
- Ctrl/Cmd + E: export results
- Esc: clear selection

## Running And Exporting

Run a scenario from Demo Lab or Studio. Export scenario JSON for future editing, or export simulation results as JSON and CSV. Results include seed, scenario name, token count, throughput, station utilization, WIP, cycle time, queue delay, bottleneck, stockouts, rework, and scrap counts.

## Architecture Summary

- `/src/engine`: seeded random distributions, time formatting, scenario migration, and lightweight DES runtime.
- `/src/components/canvas`: custom SVG/canvas-style process flow, connectors, and animated token markers.
- `/src/components/studio`: palette, toolbar, properties, inventory, bottleneck, and timeline panels.
- `/src/components/charts`: Recharts dashboards.
- `/scenarios`: editable starter scenario JSON.
- `/docs`, `/figma`, `/automation`, `/tests`: refinement notes and operating guidance.

The engine is intentionally compact. It supports tokens/entities, process objects, queueing, routing by connector order/probability placeholders, material consumption/reorder, random/scheduled downtime, batch behavior, seeded distributions, and failure/rework/scrap behavior.

## Automation Loop

The intended daily refinement loop runs at 2:00 AM America/New_York from a local Windows/Cursor/Codex environment. See:

- `/automation/nightly-refinement-prompt.md`
- `/automation/windows-codex-loop.md`
- `/automation/github-actions-schedule.md`
- `/automation/daily-log.md`

The loop should inspect the repo, run checks, improve one or two meaningful capabilities, update docs/logs, and commit only when viable.

## Current Limitations

- The engine is a practical prototype, not a validated commercial simulator.
- Conditional routing, Monte Carlo batches, empirical distributions, fitted distributions, cost modeling, scenario comparison, and executive report export are placeholders for later work.
- Resource calendars are starter-level and should be expanded before operational use.
- Figma is used for design refinement planning only and is not a runtime dependency.
