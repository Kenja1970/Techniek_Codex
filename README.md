# Techniek Engineering Static Site

Static landing page and client support tools for Techniek Engineering.

## Prerequisites

- Python 3.7+ (3.12 matches CI). On Windows, a bare `python` may resolve to the
  Microsoft Store alias shim instead of a real interpreter; if so, use `uv run python`
  or invoke a full interpreter path.
- Node.js (any current LTS) for the flange calculator syntax checks and tests.
- Git submodules initialized with `git submodule update --init --recursive`.

## Convenience Scripts

A dependency-free `package.json` wraps the native commands:

```powershell
npm run dev     # serve outputs/ at http://127.0.0.1:8127 (uses uv run python)
npm run lint    # node --check on the flange calculator scripts
npm test        # run all engineering-tool test suites
npm run build   # create the shared deployable artifact in dist/
npm run validate # build and validate metadata, links, fragments, and sitemap routes
npm run check   # run lint, tests, build, and site validation
```

## Preview Locally

From the `outputs` folder, serve the site with a local static server:

```powershell
cd outputs
python -m http.server 8127 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8127/index.html
```

## Tests

Initialize submodules once, then run the complete local check used by Pages:

```powershell
git submodule update --init --recursive
npm ci --prefix tools/Techniek-PrecisionFlow
npm run check
```

## Deployment

The working static site lives in `outputs/`. `npm run build` creates the curated
`dist/` artifact used by both GitHub Pages and Cloudflare Pages:

- HTML pages
- Public JSON/XML feeds used by the pages
- `robots.txt` and `sitemap.xml`
- `outputs/assets`
- `outputs/tools`, excluding the tools listed as unpublished in `scripts/build-site.mjs`

Public site:

```text
https://kenja1970.github.io/Techniek_Codex/
```

Every push to `main` runs syntax, exact-configuration, publishing-contract, and
artifact checks before GitHub Pages deployment. The standard update cycle is:

1. Preserve unrelated worktree changes and edit only the intended site files.
2. Run the flange calculator checks locally.
3. Update the tool changelog or source register when engineering behavior changes.
4. Commit and push the scoped files.
5. Confirm the Pages workflow succeeds and smoke-test the public URL.

### Cloudflare Pages

The same `dist/` artifact is also served by Cloudflare Pages at
`https://techniek-codex.pages.dev/`, so both hosts expose identical paths.

`wrangler.toml` is the source of truth for that project. It sets
`pages_build_output_dir = "./dist"`; the matching dashboard fields become
read-only once a deployment includes the file. The project's deploy command must
be:

```text
npx wrangler pages deploy
```

The Cloudflare build command must initialize submodules and build the artifact:

```text
git submodule update --init --recursive && npm run build
```

Do not use `npx wrangler deploy`. That is the Workers command: it ignores the
`functions/` directory, defaults the asset directory to the repository root, and
fails the build by trying to upload `node_modules/` as static assets.

`functions/` stays at the repository root, not inside `outputs/`. Cloudflare
compiles it into a Worker rather than serving it as a file. It currently holds
one route, `tools/greg-brown-site/api/chat`, backing the Digital Twin on the Greg
Brown career page. That route needs an encrypted `OPENROUTER_API_KEY` variable on
the Pages project (Settings → Variables and Secrets → Add → Encrypt). Secrets
only reach deployments created after they are set, so add the key before
deploying. GitHub Pages has no Functions runtime, so the chat is offline there by
design and the page falls back to a contact prompt.

Preview the Cloudflare layout locally, including the Function:

```bash
npx wrangler pages dev --binding OPENROUTER_API_KEY=<key>
```

## Engineering Tools

Public engineering tools are grouped under:

```text
outputs/tools/
```

Published tools are OpsBoard Pro V2, TwinSim Studio, PrecisionFlow, and the career page.

The Flange Capacity Explorer and both BlueLedger prototypes are **retained but unpublished**:
their source stays under `outputs/tools/` and their tests still run in `npm test`, but
`scripts/build-site.mjs` excludes them from `dist/` so they are not deployed or indexed. Remove the
directory from `unpublishedTools` to bring one back.

Owner notes, screenshots, generated documents, Figma handoff files, and private knowledge uploads are not part of the Pages artifact.

## Design Reference

Figma companion file for the publish-ready upgrade patterns:

```text
https://www.figma.com/design/ht1NgrK3Nq8g7mnSkFEyg6
```

## Private Knowledge Uploads

Start by placing new past-performance artifacts in:

```text
knowledge_uploads/inbox
```

The intended owner-only agent workflow is:

1. Classify incoming files as mechanical engineering, civil engineering, energy engineering, or project management.
2. Move each file to the matching private folder.
3. Place uncertain files in `knowledge_uploads/needs_review`.
4. Publish only approved summaries or public-safe lessons back into website JSON files.

Do not commit private client files, pricing, credentials, or confidential project records.

Preview classification without moving files. In Codex, use the bundled Python runtime if `python` is not on your PATH:

```powershell
python tools/classify_knowledge_uploads.py
```

Apply classification:

```powershell
python tools/classify_knowledge_uploads.py --apply
```

## ENERCON DOE BD Nightly Watch

### Purpose

`scripts/enercon_doe_bd_watch.py` is a dependency-light (standard library only)
nightly business-development watcher for **ENERCON Federal Services**. It surfaces
DOE-centric procurement and market leads relevant to ENERCON's full-discipline
architectural, engineering, master planning, project/construction management,
facility assessment, remediation, and technical-support services for DOE, NNSA,
DOE-EM, the national laboratories, and first-tier M&O operators.

It:

- Queries the **SAM.gov Opportunities API (v2)** with date-bounded nightly windows
  for active opportunities, by NAICS code and by site/program title (NNSS/MSTS,
  Pantex, ORNL, Y-12/Oak Ridge, Paducah, Portsmouth, and more).
- Optionally ingests CSV exports from **EdgeWins, GovWin, or HigherGov**.
- **Scores each lead 0–100** based on target-site match, DOE/NNSA/nuclear context,
  NAICS fit (541330 primary plus associated codes), A/E + planning + PM/CM +
  facility + infrastructure + remediation/D&D capability fit, design-build /
  progressive design-build signals, and early-stage notice type (sources sought,
  RFI, presolicitation, draft RFP, special notice, industry day).
- Deduplicates against a local **SQLite** state database and marks each lead as
  **NEW, UPDATED, SEEN, or LOW FIT**.
- Writes `latest.md`, `latest.csv`, `latest.json`, and dated archive copies, and
  can email the report when SMTP is configured.

The scoring weights, keyword/site lists, NAICS lists, and SAM title queries all
live in a single clearly marked `CONFIG` block near the top of the script and are
intended to be edited directly.

### Setup

Python 3.12 (stdlib only — no third-party packages required). Using `uv` is
recommended so the interpreter is managed consistently:

```bash
export SAM_API_KEY="your-sam-gov-api-key"     # required for live SAM.gov runs
uv run python scripts/enercon_doe_bd_watch.py --dry-run   # config check, no network
uv run python scripts/enercon_doe_bd_watch.py             # full run
```

Plain Python also works if `uv` is unavailable:

```bash
python scripts/enercon_doe_bd_watch.py --dry-run
```

Useful flags: `--days-back N`, `--min-score N`, `--report-all-active`,
`--skip-sam` (CSV-only run), `--no-email`, `--output-dir`, `--state-db`,
`--limit`, `--max-pages`, `--max-requests`. Exit codes: `0` success,
`1` unexpected runtime failure, `2` configuration error.

### Required environment variables

| Variable      | Required | Purpose                                                       |
| ------------- | -------- | ------------------------------------------------------------- |
| `SAM_API_KEY` | Yes      | SAM.gov Opportunities API key (omit only with `--skip-sam`).  |

### Optional CSV import variables

Point these at glob patterns for exported CSVs; the script maps common column
names automatically and skips malformed rows.

| Variable             | Purpose                              |
| -------------------- | ------------------------------------ |
| `EDGEWINS_CSV_GLOB`  | Glob for The EdgeWins CSV export(s). |
| `GOVWIN_CSV_GLOB`    | Glob for GovWin CSV export(s).       |
| `HIGHERGOV_CSV_GLOB` | Glob for HigherGov CSV export(s).    |

Example:

```bash
export GOVWIN_CSV_GLOB="$HOME/Downloads/govwin-*.csv"
```

### Cursor task command

A Cursor/VS Code task named **ENERCON DOE BD Nightly Watch** is defined in
`.vscode/tasks.json` (run it from the command palette → *Run Task*). It executes:

```bash
uv run python scripts/enercon_doe_bd_watch.py --days-back 7 --min-score 45 --output-dir bd_outputs --state-db bd_outputs/enercon_doe_bd_state.sqlite
```

### GitHub Actions setup

`.github/workflows/enercon-doe-bd-watch.yml` runs the watcher nightly at
**~7:00 AM Eastern** (`cron: "0 11 * * *"` UTC) and on manual
`workflow_dispatch`. It installs Python + `uv`, persists the SQLite dedup state
across runs via `actions/cache`, runs the automation, and uploads `bd_outputs`
as a build artifact. Email is delivered from within the script when the SMTP
secrets below are present. The optional CSV globs can be supplied as repository
**variables** (`EDGEWINS_CSV_GLOB`, `GOVWIN_CSV_GLOB`, `HIGHERGOV_CSV_GLOB`).

### How to add the SAM.gov API key as a repository secret

1. Get a key from your SAM.gov **Account Details** page (Workspace → profile →
   *API Key*). A roled/registered key has a 1,000 requests/day limit.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**.
3. Name it `SAM_API_KEY` and paste the key value. Save.

The workflow fails fast with a clear error if `SAM_API_KEY` is missing.

### How to configure SMTP secrets (email delivery)

Add these as repository **secrets** (same Actions secrets page). Email is sent to
`gregory.leon.brown@gmail.com` with subject `ENERCON DOE BD Nightly Watch – YYYY-MM-DD`,
the Markdown report as the body, and `latest.csv` + `latest.json` attached.

| Secret          | Example / notes                                   |
| --------------- | ------------------------------------------------- |
| `SMTP_HOST`     | e.g. `smtp.gmail.com`                              |
| `SMTP_PORT`     | `587` (STARTTLS) or `465` (SSL)                   |
| `SMTP_USER`     | SMTP login user                                   |
| `SMTP_PASSWORD` | SMTP password / app password                      |
| `EMAIL_FROM`    | From address (e.g. a sending mailbox)             |

If **any** of these is missing the run still succeeds and prints:
`Email skipped because SMTP environment variables are not fully configured.`
Override the recipient with `EMAIL_TO` or `--email-to`; disable email with
`--no-email`.

### Where outputs are written

Into the `--output-dir` (default `bd_outputs/`, git-ignored):

- `bd_outputs/latest.md` — Markdown report (overwritten each run).
- `bd_outputs/latest.csv` — CSV of reported leads (overwritten each run).
- `bd_outputs/latest.json` — JSON of reported leads + run metadata (overwritten each run).
- `bd_outputs/YYYY-MM-DD/enercon_doe_bd_<timestamp>.{md,csv,json}` — timestamped
  dated archives (never overwritten).
- `bd_outputs/enercon_doe_bd_state.sqlite` — SQLite dedup/state database.
