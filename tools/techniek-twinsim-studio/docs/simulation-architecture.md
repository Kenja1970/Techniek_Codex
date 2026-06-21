# Simulation Architecture

## Engine Shape

The engine lives in `/src/engine` and is intentionally browser-compatible JavaScript.

Core modules:

- `random.js`: seeded pseudo-random generator and distribution sampling.
- `time.js`: simulated time display, duration formatting, and starter calendar helpers.
- `scenarioMigrations.js`: schema-version placeholder and import normalization.
- `simulationEngine.js`: event scheduling, token flow, station queues, processing, material deliveries, downtime, quality branching, and metrics.

## Scenario Model

A scenario contains:

- `schemaVersion`, timestamps, app version, name, type, and assumptions.
- `objects`: smart objects on the canvas.
- `connectors`: routed edges with type, label, priority, probability, and condition placeholders.
- `materials`: inventory, reorder point, reorder quantity, supplier lead time, and receiving delay.
- `resources`: capacity and calendar references.
- `tokenTypes`: source, arrival rate, priority, due date, material requirements, process times, failure assumptions, and value placeholders.
- `simulation`: run duration, reporting period, seed, and time settings.

## Event Flow

1. Schedule arrivals and downtime events.
2. Create tokens at source objects.
3. Route through non-processing objects immediately.
4. Queue at processing objects until capacity/calendar/downtime/material constraints allow processing.
5. Schedule process completion events.
6. Route passed tokens forward, failed tokens to rework or scrap where connectors exist.
7. Record timeline, station metrics, material levels, queue trends, WIP, throughput, and bottleneck output.

## Extension Points

- Conditional routing by token attributes.
- Separate labor/resource allocation from object capacity.
- Calendar holidays, overtime, and planned outages.
- Monte Carlo run manager and confidence ranges.
- Empirical/fitted distributions.
- Scenario comparison and executive report export.
