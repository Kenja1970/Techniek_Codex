# Techniek_Codex — Project Status & Handoff

> Single-source catch-up doc. Update this when meaningful work lands so any session can resume fast.
> Last updated: 2026-06-27.

## 1. What this repo is

`Techniek_Codex` is a **static site** (no app server) deployed to **GitHub Pages** and
**Cloudflare Pages** from the shared `dist/` artifact built from `outputs/`. Repo:
`Kenja1970/Techniek_Codex`.

- Stack: HTML/CSS/vanilla JS for the marketing site; per-tool apps live under `outputs/tools/`.
- Python 3.12 (stdlib) utility scripts in `tools/` (e.g. `refresh_industry_brief.py`).
- Convenience `package.json` (zero runtime deps) wraps native commands:
  `npm run dev | build | lint | test` (dev uses `uv run python -m http.server ... --directory outputs`).
- Live base URL: `https://kenja1970.github.io/Techniek_Codex/`.

### Key paths
- `outputs/index.html` — homepage; services lead, and tools are one link to the tools page.
- `outputs/tools/index.html` — Tools landing page, grouped by category with maturity labels.
- `outputs/tools/<tool>/` — published source for each tool.
- `dist/` — generated deploy artifact; never committed.
- `outputs/tools/techniek-opsboard` — published OpsBoard submodule.
- `tools/Techniek-PrecisionFlow` — source submodule used by the PrecisionFlow publish script.

## 2. Tools strategy

There are ~six tools under `outputs/tools/`. Each tool has (or will have) **its own GitHub repo**
named after its subdirectory, for independent maintenance/upgrade. The `Techniek_Codex` repo holds
the **published build** of each tool plus the site shell. We review/upgrade tools one at a time.

### Tools page grouping — DONE
`outputs/tools/index.html` groups tools by category (engineering screening; project controls and
simulation; data prototypes and profile) and labels each with a maturity badge. The homepage no
longer lists individual tools; it links to this page once so services stay the primary story.

### Tool status
| Tool | Published dir | Source repo | State |
|------|---------------|-------------|-------|
| OpsBoard Pro **V2** | `techniek-opsboard/` | `Kenja1970/Techniek-OpsBoard-Pro-V2` (submodule) | Integrated, live — **v5.2.0** |
| TwinSim Studio | `techniek-twinsim-studio/` | `Kenja1970/Techniek-TwinSimStudio` (committed build, not submodule) | **v0.2 engine live** |
| PrecisionFlow | `precisionflow/` | `Kenja1970/Techniek-PrecisionFlow` (submodule) | Published demonstrator |
| Flange Capacity | `flange-capacity/` | (in-repo) | **Unpublished** — mature, has tests |
| BlueLedger-GA / -West | `blueledger-georgia/`, `blueledger-west/` | (in-repo) | **Unpublished** — generated-data prototypes |

> **Unpublished tools** stay in `outputs/tools/` and keep running under `npm run lint` and
> `npm test`, but `scripts/build-site.mjs` excludes them from `dist/` (see `unpublishedTools`) and
> they are absent from `outputs/sitemap.xml` and the tools page. To republish one, drop it from that
> list and restore its card and sitemap entry.

> Note: TwinSim is intentionally a **committed static build** (not a submodule) so the local
> preview and production serve identical files. Submodule source serving the unbuilt `/src/main.jsx`
> previously caused a static-fallback screen.

## 3. TwinSim Studio v0.2 — the big engine upgrade (DONE, deployed)

Source repo `Kenja1970/Techniek-TwinSimStudio@main` (commit `2ebd60c`). Published build copied into
`outputs/tools/techniek-twinsim-studio/` and pushed in `Techniek_Codex@main` (`8258fc8`).

Implemented items 1–7 + slider + UI/notes:
1. **Binary-heap future-event set** (`src/engine/eventQueue.js`) — `(time, event-class, sequence)`
   deterministic ordering; `EVENT_PRIORITY` resolves simultaneous events.
2. **PRNG + substreams** (`src/engine/random.js`) — `sfc32` seeded via `splitmix32`; independent
   named streams (arrivals/service/quality/routing/downtime) → reproducibility + common random
   numbers (CRN). Distributions: constant, uniform, triangular, normal, exponential, lognormal,
   weibull, gamma/erlang.
3. **Replications + confidence intervals** (`src/engine/experiment.js`) — `runExperiment()` with
   Student-t critical values (`tCritical`), per-metric mean/CI/half-width.
4. **Analytical validation** (`scripts/validate-engine.js`) — M/M/1 vs queueing theory + Little's Law.
   Run: `npm run validate:engine`. Result: utilization/WIP/cycle within <1%, Little's Law ~0%.
5. **Time-integrated accounting** (`simulationEngine.js#advanceAccounting`) — busy/blocked/idle/down
   integrated over time, sum to the observation window; multi-server utilization = ∫(active/cap).
6. **Warm-up truncation** (`warmupPeriod`), **stochastic arrivals** (on-the-fly interarrival
   sampling; `arrivalDistribution`), lognormal/Weibull/gamma.
7. **Web Worker** (`src/engine/simulation.worker.js` + `simulationClient.js`) for off-thread
   experiments (sync Node fallback). **Seizable resources** (`src/engine/resources.js`):
   `resourceRequirements: [{resourceId, quantity}]`, seize/delay/release with waiting.

UI / notes:
- **Canvas pan + zoom** (`src/hooks/useCanvasViewport.js`, `SimulationCanvas.jsx`): empty-space or
  middle-mouse drag to pan, wheel to zoom (anchored at cursor), overlay controls (+/-, live %, Fit,
  Reset). Content rendered in a transform-origin `0 0` `.canvas-viewport`; a dnd-kit modifier divides
  canvas-node drag transforms by zoom; palette drops/node moves convert screen→canvas coords. Shipped
  in TwinSim `f6def93`, deployed in Techniek_Codex `1569f57`.
- **Adjustable time slider** (`src/components/studio/TimeSlider.jsx`) under the Studio canvas:
  scrub, play/pause, 0.5×–8× speed, warm-up band marked. Wired in `StudioPage.jsx` (state
  `playbackSpeed`, `scrubTo`, `togglePlayback`).
- **Replications & CI panel** (`src/components/studio/ExperimentPanel.jsx`) in Studio + Executive View.
- Production rewrite: `HomePage.jsx` hero/badges, `AboutPage.jsx` (methodology/project notes),
  `README.md`, entry `index.html` fallback. Removed all "prototype / concept lab" language.

### TwinSim repo layout & commands
- Engine: `src/engine/{random,eventQueue,resources,simulationEngine,experiment,simulation.worker,simulationClient,time,scenarioMigrations}.js`
- Build: Vite (`base: "./"`), `npx vite build` → `dist/`. Worker bundles as its own chunk.
- Checks: `npm run smoke` · `npm run validate:scenarios` · `npm run validate:engine` · `npm run verify`.

### Updating the published TwinSim build
```
git clone https://github.com/Kenja1970/Techniek-TwinSimStudio
cd Techniek-TwinSimStudio && npm install && npx vite build
# copy dist/{assets,index.html,logo-mark.svg} over
#   Techniek_Codex/outputs/tools/techniek-twinsim-studio/  (keep that folder's README.md)
```

## 4. Earlier work in this repo (already shipped)
- Added zero-dep `package.json`; fixed Windows `python` Store-alias issue by using `uv run python`.
- Repo audit fixes: RSS `example.com` → real base URL in `tools/refresh_industry_brief.py` +
  `outputs/briefs.xml`; classifier word-boundary regex in `tools/classify_knowledge_uploads.py`;
  pinned GH Action versions; deploy excludes tool tests/changelogs.
- OpsBoard is published from the single `outputs/tools/techniek-opsboard` submodule.
- **2026-07-27:** the OpsBoard published submodule was repointed from
  `Techniek-OpsBoard-Pro` (v1, v2.5.0) to `Techniek-OpsBoard-Pro-V2` (v5.2.0).
  The published path stays `techniek-opsboard/` on purpose —
  renaming it would break every existing `/tools/techniek-opsboard/` link. V1 is slated for
  retirement; the site no longer depends on it.

## 5. Pending / next candidates
- Decide whether the unpublished tools (Flange Capacity, BlueLedger-GA, BlueLedger-West) get
  further development and republishing, or retirement.
- Optional TwinSim follow-ups: code-split the 735 kB bundle (manualChunks); empirical/fitted
  distributions; cost modeling; saved-scenario comparison; executive report export.
- Figma → consider Penpot (open-source) for GUI design; tokens via Style Dictionary if needed.

## 6. Gotchas
- Shell is **PowerShell**: no heredocs. Use `git commit -F <file>` for multi-line messages.
- Pushing to `main` (protected) requires explicit approval.
- Initialize required sources with `git submodule update --init --recursive`; only `dist/` deploys.
- `git push` prints to stderr; PowerShell renders it as a red "error" block — check exit code / the
  `old..new ref` line for actual success.
