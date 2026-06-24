# Flange Capacity Explorer Changelog

## 2026-06-24 - Reference-backed qualification evidence

- Replaced checkbox-only qualification completion with documented evidence assertions.
- Each readiness item now requires a drawing, MTR, procedure, calculation, test, or review reference before it counts as complete.
- Added migration-safe evidence storage, visible missing-reference states, structured evidence records in snapshot schema 1.2.0, and report traceability.
- Added focused qualification-evidence tests and current ASME/DNV documentation sources.

Engineering calculations and numerical acceptance thresholds are unchanged. Readiness still means prepared for engineer-of-record review, not certification or Code compliance.

## 2026-06-21 - Publishing integrity

- Added pre-deployment JavaScript syntax, exact-configuration, and publishing-contract checks.
- Added canonical GitHub Pages discovery URLs and included the sitemap in the deployed artifact.
- Documented the repeatable local-check, scoped-commit, deploy, and public smoke-test cycle used by nightly refinement runs.

Engineering calculations and acceptance boundaries are unchanged by this release.

## 2026-06-21 — Exact configuration integrity

- Replaced index-valued NPS and class sliders with explicit engineering selectors.
- Prohibited nearest-row substitution for compact flanges; calculations now require an exact supplied catalog NPS/class record.
- Constrained ASME B16.5 selections to the implemented NPS/class scope, including the Class 2500 limit at NPS 12.
- Added the implemented ASME B16.47 NPS 26–60 subsets and constrained Series B selections to the available moment-factor map.
- Recorded ASME B16.5-2025, ASME B16.47-2025, ASME PCC-1-2022, ISO 27509:2020, BPVC VIII-2 (2025), and ASME certification-program sources.
- Added machine-readable exact-selection evidence and focused configuration tests.
- Fixed printable readiness evidence so missing item/requirement pairs render as readable fields instead of object placeholders.

Engineering boundary retained: all capacities remain screening estimates. Controlled pressure-temperature tables, project geometry, leakage/seal acceptance, preload, thermal/fatigue, rigidity/rotation, and conformity-assessment evidence remain required.
