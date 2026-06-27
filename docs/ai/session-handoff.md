# AI Session Handoff

> Durable catch-up for the next Cursor chat. Companion to root `PROJECT_STATUS.md`.
> Last updated: 2026-06-27 (all-TODOs session).

## 0. Latest session — all open TODOs addressed (uncommitted, feature branches only)

**Branch:** `feat/flange-profile-diagram` (Techniek_Codex). **Nothing merged to `main`, nothing deployed.**

### Completed this session

**Flange (Techniek_Codex)**
- Headless `calculate()` tests + DOM-decoupling refactor (`app.js`, `calculation.test.mjs`).
- Published nominal ASME dataset: `asme-nominal-data.js` (B16.5/B16.47 subset, provenance-marked).
- `flangeDimensions()` prefers published rows; generated fallback retained with `matchType`.
- VIII-2 §4.16 + ISO 27509 workflow objects on `calculate()` result (`viii2Workflow`, `iso27509Workflow`).
- `tools/Techniek-FlangeCapacity/README.md` — repo-extract scaffold (local; not committed per `tools/*` rule).

**TwinSim (Techniek-TwinSimStudio source in `%TEMP%\twinsim-dev`, branch `feat/connectors-and-domain-properties` + local edits)
- ✅ TODO #1 code-split: `vite.config.js` `manualChunks` (verify: largest chunk `charts` 321 kB, no >500 kB warning).
- ✅ TODO #4 off-shift bucket: `offShiftTime` / `offShiftFraction` in engine accounting (calendar-closed time no longer counted as blocked).
- ✅ TODO #5 keyboard zoom: Ctrl/Cmd +/-/0 in `useCanvasViewport.js`; snap-to-grid 16 px in `StudioPage.jsx`.
- ✅ TODO #3 depth (initial): `fitEmpiricalDistribution()` in `random.js`; `costSummary` in engine; `ScenarioComparePanel` (localStorage); executive report download/print in `ExecutiveViewPage`.
- Published build copied to `outputs/tools/techniek-twinsim-studio/` (code-split chunks + new features). **TwinSim source-repo commit still pending** (changes only in temp clone).

**Spec tools (Techniek_Codex) — TODO #2 scaffolds**
- Preview landing pages: `outputs/tools/blueledger-georgia/`, `blueledger-west/`, `precisionflow/`.
- Cards added to `outputs/tools/index.html`.

**Lead magnet**
- Still blocked: needs real Formspree/Getform endpoint URL from user (`REPLACE_WITH_YOUR_FORM_ID` on `feat/lead-magnet`).

### Checks (all pass)

Techniek_Codex: `npm run lint` ✓ · `npm test` ✓ (configuration / qualification / publishing / calculation) · `npm run build` ✓

TwinSim (`%TEMP%\twinsim-dev`): `npm run verify` ✓ (build + scenarios + smoke + M/M/1 + Little's Law)

### Commit proposal (awaiting user approval — do NOT push to `main`)

**Techniek_Codex** — stage on `feat/flange-profile-diagram` (or split into topic branches if preferred):
- Flange: `outputs/tools/flange-capacity/{app.js,index.html,asme-nominal-data.js,tests/calculation.test.mjs}`
- TwinSim published build: `outputs/tools/techniek-twinsim-studio/**` (keep README.md)
- Spec scaffolds: `outputs/tools/{blueledger-georgia,blueledger-west,precisionflow}/`
- Tools index: `outputs/tools/index.html`
- `package.json`, `docs/ai/session-handoff.md`
- Do **not** stage `tools/*` working copies (except optional README is already under `tools/Techniek-FlangeCapacity/` — still excluded by policy).

**Techniek-TwinSimStudio** — separate commit in `%TEMP%\twinsim-dev` (feature branch push for review):
- Engine/UI files listed above + `vite.config.js` + new components/utils.

## 1. Current project goal

Consolidate Techniek's engineering tools under `Techniek_Codex/outputs/tools/`, each backed by its
own GitHub repo, and bring each tool to **production quality**.

## 8. Open TODOs — status after this session

1. ✅ Code-split TwinSim bundle — implemented + published build copied; **merge TwinSim source branch + deploy to `main` needs approval**.
2. ✅ Spec tools scaffolds — preview pages live; **full BlueLedger/PrecisionFlow builds remain large follow-ups**.
3. ✅ TwinSim depth (initial) — cost summary, empirical fit helper, scenario compare, executive export; **deeper distribution fitting UI / formal cost models still open**.
4. ✅ Off-shift accounting bucket — `offShiftTime` in engine.
5. ✅ Keyboard zoom + snap-to-grid — shipped in Studio.

**Flange deep work:** published nominal subset + VIII-2/ISO workflow checks done; **full B16.5/B16.47 P-T tables + remote repo push** still need controlled-data expansion and GitHub repo creation.

**Lead magnet:** swap Formspree endpoint when user provides URL.

## 10. Things NOT to change

(Unchanged — see prior sections: no submodule revert, no `tools/*` commit, preserve engine determinism, PowerShell commit via `-F` file, no push to protected `main` without approval.)
