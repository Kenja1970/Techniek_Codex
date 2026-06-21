# Daily Log

## 2026-06-14

Initial prototype scaffolded:

- React/Vite app structure.
- Lightweight DES engine.
- Scenario preset library.
- Studio canvas and editor controls.
- Dashboard, inventory, bottleneck, and timeline panels.
- Documentation, Figma planning files, tests, scripts, and automation guidance.

Checks intended:

- `npm run build`
- `npm run validate:scenarios`
- `npm run smoke`

Verification performed:

- PowerShell JSON parse checks passed for `package.json` and all scenario presets.
- PowerShell scenario reference checks passed for all object, connector, and token source references.
- `git diff --check` passed.

Blocked verification:

- `npm install`, `npm run build`, `npm run validate:scenarios`, and `npm run smoke` could not run because `npm` is not installed or not available on PATH.
- The only `node.exe` discovered on PATH is bundled inside the Codex Windows app package and returns `Access is denied`, even when retried outside the sandbox.

## Automation Setup - 2026-06-20

- Added a guarded Windows nightly runner for 2:00 AM America/New_York.
- Added current DES/use-case and UX/UI web research to every refinement pass.
- Added a progressive maturity model so the first three successful runs stay small and stabilization-focused.
- Added local Node 22 LTS bootstrap for machines without npm on PATH.
- Added clean-tree, main-branch, dependency-change, build, validation, smoke, and diff safeguards before automatic commit/push.
- The first scheduled refinement is expected to run at 2:00 AM on 2026-06-21.
- Registered the Windows Task Scheduler task `Techniek TwinSim Nightly Refinement`; it is ready, network-aware, start-when-available, and wake-enabled where supported.
- Test-run repair: enabled execution on battery and corrected optional Git-origin detection for repositories that have no remote yet.
- Test-run repair: prevented runner log output from contaminating the resolved npm executable path during local Node bootstrap.
- Test-run repair: changed dependency preparation from destructive `npm ci` to preview-safe `npm install` and preserved full native-command stderr for diagnostics.
- Test-run repair: corrected Codex CLI option ordering so live web search is enabled before the non-interactive `exec` subcommand.
- Test-run repair: moved unattended sandbox and approval policy options to the global Codex CLI position required by the installed version.
- Test-run repair: made Codex stderr informational unless the process itself returns a failing exit code.
- Test-run repair: switched scheduled Codex execution to the Windows-compatible `danger-full-access` mode and added rejection of an explicit final `Status: FAILED`.

## Nightly Refinement - 2026-06-20

- Maturity stage and run: Stage 1 - Observe and stabilize; successful-run number 1.
- Research reviewed and citations added: NIST Digital Twins for Advanced Manufacturing; NIST digital twin use-case scenarios based on ISO 23247; NIST industrial V&V/UQ summary; National Academies VVUQ decision-support guidance; Nielsen Norman Group usability heuristics; W3C WCAG 2 overview and quick reference. Added interpreted entries to `/docs/research-log.md`.
- Changes made: fixed `reworkCount` so it increments only when a failed token actually enters a rework connector; expanded `npm run smoke` with repeatability, metric-range, timeline, material-delay, and no-route rework regression assertions; documented the realized-route metric assumption in `/docs/science-notes.md`; updated `CHANGELOG.md`.
- Checks and results: `npm run build` passed with the existing Vite large-chunk warning; `npm run validate:scenarios` passed for 5 scenarios; `npm run smoke` passed with the strengthened regression checks.
- Remaining risk or recommended next step: the app bundle still exceeds Vite's default 500 kB chunk warning; defer code-splitting until a later maturity stage unless the warning becomes a functional problem.
- Status: SUCCESS
