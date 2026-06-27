# AI Session Handoff

> Durable catch-up for the next Cursor chat. Companion to root `PROJECT_STATUS.md`.
> Last updated: 2026-06-27.

## 1. Current project goal

Consolidate Techniek's engineering tools under `Techniek_Codex/outputs/tools/`, each backed by its
own GitHub repo, and bring each tool to **production quality**. The active focus is **Techniek TwinSim
Studio** (browser DES + digital-twin tool): make it credible and feature-complete enough to rival
AutoDesk FlexSim / Arena. Most recent asks (all completed):
- Implement engine improvements 1–7 + adjustable time slider + production UI/notes rewrite.
- Reorder the Tools landing page (OpsBoard, TwinSim, then by maturity).
- Add professional canvas **pan + zoom**.

## 2. Current repo status

Two repos, both clean and pushed to `main`:

- **`Kenja1970/Techniek_Codex`** (this workspace; static site → GitHub Pages from `outputs/`).
  - Latest commits: `e183a83` (status doc: pan/zoom), `1569f57` (TwinSim build: pan/zoom),
    `d75dad8` (PROJECT_STATUS.md), `8258fc8` (TwinSim v0.2 build + landing reorder).
  - Untracked local working copies under `tools/` (`Techniek-OpsBoard`, `Techniek-TwinSimStudio`,
    `Techniek-BlueLedger-GA`, `Techniek-BlueLedger-West`, `Techniek-FlangeCapacity`,
    `Techniek-PrecisionFlow`) are intentionally NOT committed and NOT deployed.
- **`Kenja1970/Techniek-TwinSimStudio`** (TwinSim source of truth; Vite + React).
  - Latest commits: `f6def93` (pan + zoom), `2ebd60c` (engine v0.2), `ef8e1f6` (initial import).

TwinSim is published in `Techniek_Codex` as a **committed static build** at
`outputs/tools/techniek-twinsim-studio/` (NOT a git submodule — deliberate, see §4).

Working clone for builds: `%TEMP%\twinsim-dev` (cloned + `npm install` done; may be wiped — re-clone
if absent).

## 3. Files changed so far (TwinSim repo, this session)

New:
- `src/engine/eventQueue.js` — binary-heap future-event set + `EVENT_PRIORITY`.
- `src/engine/resources.js` — seizable resource pools (seize/delay/release).
- `src/engine/experiment.js` — replications + Student-t confidence intervals (`tCritical`).
- `src/engine/simulation.worker.js` + `src/engine/simulationClient.js` — Web Worker + promise client
  (sync Node fallback).
- `src/hooks/useCanvasViewport.js` — pan/zoom math, zoom-to-cursor, fit, non-passive wheel.
- `src/components/studio/TimeSlider.jsx` — scrub/play/speed control.
- `src/components/studio/ExperimentPanel.jsx` — CI panel (worker-backed).
- `scripts/validate-engine.js` — M/M/1 + Little's Law analytical validation.

Rewritten/modified:
- `src/engine/random.js` — sfc32 + splitmix32, named substreams (`createStreams`), +lognormal/weibull/
  gamma. Kept `createRng`, `sampleDistribution`, `chance`, `clampProbability` for back-compat.
- `src/engine/simulationEngine.js` — heap FES, substreams, time-integrated accounting, warm-up,
  stochastic arrivals, resources, Little's Law metrics. Result shape preserved + new fields.
- `src/components/canvas/SimulationCanvas.jsx` — transformed `.canvas-viewport`, pan handlers, zoom
  controls overlay, hint.
- `src/pages/StudioPage.jsx` — viewport hook, `zoomDragModifier`, zoom-aware drag/drop math, time
  slider + experiment panel wiring, `playbackSpeed`.
- `src/pages/ExecutiveViewPage.jsx` — added `ExperimentPanel`.
- `src/pages/HomePage.jsx`, `src/pages/AboutPage.jsx`, `README.md`, `index.html` — production copy.
- `src/styles/global.css` — slider, experiment/CI table, hero badges, canvas viewport/controls.
- `package.json` — v0.2; added `validate:engine`; `verify` now runs it.

Files changed in `Techniek_Codex`:
- `outputs/index.html`, `outputs/tools/index.html` — card reorder (OpsBoard, TwinSim, Flange).
- `outputs/tools/techniek-twinsim-studio/**` — rebuilt static build (twice; current = pan/zoom).
- `PROJECT_STATUS.md` (new), `docs/ai/session-handoff.md` (this file).

## 4. Key architectural decisions

- **TwinSim published as a committed build, not a submodule.** A submodule served unbuilt
  `/src/main.jsx` locally and showed a static fallback screen. Committed `dist/` makes local preview
  and production identical. Update flow: rebuild from source repo, copy `dist/{assets,index.html,
  logo-mark.svg}` over the published folder (keep its `README.md`).
- **Each tool gets its own repo** named after its `outputs/tools/<dir>` subdirectory.
- **Engine determinism via three keys** in the heap: (time, event-class priority, insertion seq).
- **Independent random substreams per source** (arrivals/service/quality/routing/downtime) for
  reproducibility and common-random-numbers (CRN) variance reduction.
- **Time-integrated accounting** (busy/blocked/idle/down sum to the post-warm-up observation window);
  multi-server utilization = ∫(active/capacity) dt.
- **Web Worker only for heavy experiments**; the interactive single run stays synchronous for
  instant feedback. Client falls back to sync execution where Workers are unavailable (Node/tests).
- **Pan/zoom:** content in a `transform-origin: 0 0` viewport (`screen = canvas·zoom + pan`); a
  dnd-kit modifier divides canvas-node drag transforms by zoom; palette/drop coords converted
  screen→canvas; connector SVG `overflow: visible`.

## 5. Commands already run (in `%TEMP%\twinsim-dev` unless noted)

- `git clone https://github.com/Kenja1970/Techniek-TwinSimStudio.git %TEMP%\twinsim-dev`; `npm install`
- `npx vite build` (multiple; all succeeded)
- `node scripts/smoke-check.js` (pass)
- `node scripts/validate-engine.js` (pass)
- `node scripts/validate-scenarios.js` (pass)
- git add/commit/push in both repos (see §2 commit hashes)
- Copy `dist/` → `Techniek_Codex/outputs/tools/techniek-twinsim-studio/`

## 6. Tests / build results

- Vite build: clean (worker bundles as own chunk; main bundle ~739 kB / ~215 kB gzip — size warning
  only, see §8).
- `smoke-check.js`: PASS (throughput 25, bottleneck "CNC cell"; repeatability, probability bounds,
  material delay, no-route rework, event-limit, what-if, seed robustness).
- `validate-scenarios.js`: PASS (5 scenarios).
- `validate-engine.js`: PASS — M/M/1 (ρ=0.5, 0.7): utilization/WIP/cycle errors <1%; Little's Law
  residual ~0.00%.
- ReadLints on changed files: no errors.

## 7. Known bugs / blockers

- None functional/known. Watch items:
  - Main JS bundle >500 kB (warning only) — consider `manualChunks` / dynamic import later.
  - Calendar-closed time is currently attributed to "blocked"; acceptable but could be a separate
    "off-shift" bucket.
  - Middle-mouse pan relies on `preventDefault` at pointerdown; fine in modern browsers.

## 8. Open TODOs (priority order)

1. (Optional) Code-split the TwinSim bundle (`build.rollupOptions.output.manualChunks`) to clear the
   500 kB warning and speed first paint.
2. Build out the spec-only tools, each with its own repo: BlueLedger-GA, BlueLedger-West,
   PrecisionFlow.
3. TwinSim depth: empirical/fitted input distributions; cost modeling; saved-scenario comparison;
   executive report export (PDF/print).
4. Consider a dedicated "off-shift" accounting bucket distinct from "blocked".
5. Optional: keyboard zoom (Ctrl +/-/0), and snap-to-grid for node placement.

## 9. Exact next step for the next Cursor chat

No work is mid-flight. To resume:
1. If `%TEMP%\twinsim-dev` is gone, re-clone `Techniek-TwinSimStudio` and `npm install`.
2. Pick the top open TODO (bundle code-splitting) OR await a new user directive.
3. For any TwinSim change: edit in the clone → `npx vite build` → `node scripts/smoke-check.js` +
   `node scripts/validate-engine.js` → commit/push source repo → copy `dist/*` into
   `Techniek_Codex/outputs/tools/techniek-twinsim-studio/` (keep its README.md) → commit/push
   `Techniek_Codex` (needs approval for protected `main`).

## 10. Things NOT to change

- Do NOT convert the published TwinSim folder back into a submodule.
- Do NOT commit the untracked `tools/*` local working copies; only `outputs/` + site files deploy.
- Do NOT remove the back-compat exports from `src/engine/random.js` (`createRng`,
  `sampleDistribution`, `chance`, `clampProbability`) — `smoke-check.js` and others depend on them.
- Preserve the `runSimulation` result shape (existing fields) — smoke + UI rely on it; only add
  fields.
- Keep engine determinism: heap ordering keys and per-source substream labels.
- Environment: shell is PowerShell (NO heredocs; use `git commit -F <file>`); `git push` prints to
  stderr (red block) but check exit code / `old..new` ref line; pushing to `main` needs approval.
- The vite `base: "./"` setting (keeps the build portable to the Pages subpath) — do not change.
