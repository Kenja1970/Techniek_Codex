# Flange Capacity Explorer Changelog

## 2026-06-21 — Exact configuration integrity

- Replaced index-valued NPS and class sliders with explicit engineering selectors.
- Prohibited nearest-row substitution for compact flanges; calculations now require an exact supplied catalog NPS/class record.
- Constrained ASME B16.5 selections to the implemented NPS/class scope, including the Class 2500 limit at NPS 12.
- Added the implemented ASME B16.47 NPS 26–60 subsets and constrained Series B selections to the available moment-factor map.
- Recorded ASME B16.5-2025, ASME B16.47-2025, ASME PCC-1-2022, ISO 27509:2020, BPVC VIII-2 (2025), and ASME certification-program sources.
- Added machine-readable exact-selection evidence and focused configuration tests.
- Fixed printable readiness evidence so missing item/requirement pairs render as readable fields instead of object placeholders.

Engineering boundary retained: all capacities remain screening estimates. Controlled pressure-temperature tables, project geometry, leakage/seal acceptance, preload, thermal/fatigue, rigidity/rotation, and conformity-assessment evidence remain required.
