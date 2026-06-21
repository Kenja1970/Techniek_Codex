# GitHub Actions Schedule Guidance

GitHub Actions cron uses UTC, while the local target is 2:00 AM America/New_York.

- During Eastern Standard Time, 2:00 AM New York is 07:00 UTC.
- During Eastern Daylight Time, 2:00 AM New York is 06:00 UTC.

The included `.github/workflows/nightly.yml` is conservative. It installs dependencies and runs build, scenario validation, and smoke checks. It does not run Codex or Figma automation by itself because those require approved integrations and secrets.

Future auto-refinement workflow should:

- Pull latest `main`.
- Run checks.
- Run an approved automation agent or script.
- Update docs/logs.
- Re-run checks.
- Commit to `main` only if checks pass.
- Avoid adding dependencies unless explicitly approved.

Use `workflow_dispatch` for manual verification.
