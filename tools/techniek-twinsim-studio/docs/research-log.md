# Research Log

## 2026-06-14

Initial build uses general public DES concepts: token/entity flow, queues, event scheduling, resource capacity, stochastic processing times, inventory reorder points, downtime, quality branching, and bottleneck metrics.

No proprietary, client, CUI, export-controlled, or sensitive information was used.

Future research targets:

- Validation practices for simple DES prototypes.
- Inventory reorder and stockout modeling notes.
- Maintenance and downtime assumptions.
- Engineering work queue modeling and schedule-risk interpretation.
- Accessibility and control-room dashboard readability.

## 2026-06-20

Nightly Stage 1 focus: stabilization and verification evidence before adding new workflow breadth.

### Digital Twins for Advanced Manufacturing

- Organization: National Institute of Standards and Technology (NIST).
- URL: https://www.nist.gov/programs-projects/digital-twins-advanced-manufacturing
- Publication/update date: Created April 15, 2024; updated March 26, 2025.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Confirms that current manufacturing digital-twin work emphasizes standards, validation, lifecycle model maintenance, actionable recommendations, machine health, alternative plans and schedules, maintenance, and virtual commissioning. For Stage 1 this supports improving model credibility checks before adding new scenario breadth.

### Use Case Scenarios for Digital Twin Implementation Based on ISO 23247

- Organization: National Institute of Standards and Technology (NIST).
- URL: https://www.nist.gov/publications/use-case-scenarios-digital-twin-implementation-based-iso-23247
- Publication/update date: Published May 4, 2021; page updated November 29, 2022.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Confirms that early digital-twin work should stay fit-for-purpose and use-case driven, with manufacturing scenarios grounded in shared terminology. For Stage 1 this argues against broad architecture expansion and supports validating the existing fictional scenario paths first.

### A Summary of Industrial Verification, Validation, and Uncertainty Quantification Procedures in Computational Fluid Dynamics

- Organization: National Institute of Standards and Technology (NIST).
- URL: https://www.nist.gov/publications/summary-industrial-verification-validation-and-uncertainty-quantification-procedures
- Publication/update date: 2020.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Although the domain is CFD rather than DES, the credibility pattern is relevant: verification, validation, and uncertainty work must precede strong claims from simulation outputs. This supports expanding smoke checks to cover repeatability, valid metric ranges, and sensitivity to material constraints.

### Assessing the Reliability of Complex Models: Mathematical and Statistical Foundations of Verification, Validation, and Uncertainty Quantification

- Organization: National Research Council / National Academies Press.
- URL: https://www.nationalacademies.org/read/13395/chapter/8
- Publication/update date: 2012.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Confirms that model evidence should help decision makers understand quantities of interest, assumptions, and uncertainty. For TwinSim, executive metrics must reflect realized token behavior, not merely attempted branches, so rework should be counted only when a token enters an actual rework route.

### 10 Usability Heuristics for User Interface Design

- Organization: Nielsen Norman Group.
- URL: https://www.nngroup.com/articles/ten-usability-heuristics/
- Publication/update date: Published April 24, 1994; updated January 30, 2024.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Confirms that the control-room UI should keep users informed about system state and use manager-readable language. No UI change was made in this pass, but the stronger smoke output now states which regression checks passed so unattended run status is clearer.

### WCAG 2 Overview and How to Meet WCAG 2 Quick Reference

- Organization: W3C Web Accessibility Initiative (WAI).
- URL: https://www.w3.org/WAI/standards-guidelines/wcag/ and https://www.w3.org/WAI/WCAG22/quickref/
- Publication/update date: WCAG 2.2 published October 5, 2023; WCAG overview updated May 26, 2026.
- Access date: June 20, 2026.
- What this changes or confirms in TwinSim: Confirms that future UI refinements should continue using testable accessibility criteria instead of cosmetic trends. No UI code changed in this pass, so no browser/mobile verification was required.
