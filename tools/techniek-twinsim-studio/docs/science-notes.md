# Science Notes

These notes are developer-facing and should stay grounded in public, non-proprietary sources.

## Discrete Event Simulation Concept

The first engine treats work as tokens that move between event-driven objects. Events include arrivals, process completions, material deliveries, downtime starts, downtime ends, and reporting snapshots.

Modeling assumptions:

- Scenario time is represented internally in simulated minutes.
- Tokens wait in object queues until capacity, calendar, downtime, and material constraints allow processing.
- Processing times are sampled from seeded random distributions so repeatable runs are possible.
- Material shortages delay processing and are counted as stockout pressure.
- Quality failures can branch to rework or scrap based on simple probabilities.

## Initial Distributions

Supported from day one:

- Uniform: useful for bounded uncertainty when all values in a range are treated as equally likely.
- Triangular: useful for rough expert estimates with minimum, most likely, and maximum values.
- Normal: useful for stable processing times with symmetric variation.
- Exponential: useful for time-between-event placeholders such as random failures.

Future distribution backlog:

- Lognormal
- Weibull
- Empirical distributions
- Fitted distributions from imported data
- Goodness-of-fit notes

## Metrics

Initial metrics include throughput, WIP, average cycle time, queue length, utilization, downtime, bottleneck identification, material delays, stockouts, rework, and scrap.

The initial bottleneck rule is intentionally simple: it ranks processing stations by utilization and queue pressure. Later versions should separate machine utilization, labor utilization, blocked/starved states, and confidence ranges.

### 2026-06-20 Metric Validity Guardrail

Decision-support metrics should count realized token behavior, not branch intent. A station quality failure may be recorded as a station failure even when no scrap or rework connector exists, but `reworkCount` should increase only when a token actually enters a rework route. This keeps executive interpretation aligned with the visible scenario topology and avoids reporting loops that the model cannot execute.

## Public Reference Starting Points

- Banks, Carson, Nelson, and Nicol, *Discrete-Event System Simulation*.
- Law, *Simulation Modeling and Analysis*.
- NIST manufacturing systems and smart manufacturing public materials.
- Nielsen Norman Group usability heuristics for interface review.
- W3C WCAG materials for accessibility-aligned checks.

Add source-specific notes here when nightly research directly changes a model or UX decision.
