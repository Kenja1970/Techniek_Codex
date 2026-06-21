# Simulation Accuracy Checks

Initial lightweight checks:

- Same seed should produce repeatable throughput and bottleneck results for the same scenario.
- Reducing process time at the bottleneck should not reduce throughput in simple cases.
- Lower starting inventory should increase stockout count or material delay where material is required.
- Higher failure probability should increase rework or scrap count when relevant connectors exist.
- Larger batch size should increase queue time or WIP when arrivals are slower than batch fill rate.

Future checks:

- Compare deterministic scenarios to hand-calculated cycle times.
- Add Monte Carlo confidence ranges.
- Validate fitted distributions against imported historical data.
- Separate blocked, starved, busy, idle, and down state accounting.
