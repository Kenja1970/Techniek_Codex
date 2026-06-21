# Windows/Codex Nightly Automation

The local automation runs daily at 2:00 AM America/New_York through Windows Task Scheduler. Windows stores the trigger in local time, so daylight saving time is handled by the operating system.

The task runs in the current user's interactive Windows context because Codex authentication is user-scoped. It is configured to wake the computer when Windows and the hardware allow it, require network availability, run on AC or battery, and start as soon as practical after a missed trigger.

When TwinSim is nested in the Techniek Project Site, source lives at `tools/techniek-twinsim-studio` and Vite publishes the static build to `outputs/tools/techniek-twinsim-studio`. Git status, staging, and commits are restricted to those two paths so unrelated site work is not included.

## Files

- `/automation/run-nightly.ps1`: guarded unattended runner.
- `/automation/nightly-refinement-prompt.md`: research and product-refinement instructions.
- `/automation/daily-log.md`: product-facing run history.
- `%LOCALAPPDATA%\TechniekTwinSimStudio\logs`: detailed unattended execution logs.
- `%LOCALAPPDATA%\TechniekTwinSimStudio\tools`: local Node runtime bootstrap when npm is not installed system-wide.

## Safety Behavior

The runner:

1. Acquires a single-run lock.
2. Stops without editing if TwinSim source/output is dirty or the active branch is not `main`.
3. Pulls `origin/main` with `--ff-only` when safe; skips pulling a nested parent site that has unrelated uncommitted work.
4. Bootstraps Node 22 LTS from `nodejs.org` only when npm is unavailable.
5. Runs baseline build, scenario validation, and smoke checks.
6. Runs Codex non-interactively with live web search using the Windows-compatible execution mode documented below.
7. Prevents automatic commit if dependency declarations change.
8. Re-runs all checks and `git diff --check`.
9. Commits only TwinSim source and published output after checks pass.
10. Pushes only when an `origin` remote is configured.

The computer must be powered on or able to wake, and the user session must be signed in for the task to launch Codex.

### Windows Codex Execution Mode

The installed Codex Windows sandbox currently fails to create child PowerShell and Node processes when launched by Task Scheduler. The runner therefore invokes Codex with `danger-full-access` and `approval=never`. This is intentionally paired with outer runner safeguards: clean `main` requirement, repository-scoped prompt, dependency fingerprint enforcement, required post-change checks, and commit only after verification. Review local logs and commits regularly.

## Progressive Refinement

- Runs 1-3: research, stabilization, tests/docs, and at most one small low-risk product or UX change.
- Runs 4-14: one or two coherent simulation, usability, accessibility, or executive-dashboard improvements.
- Runs 15+: incremental production-quality polish and deeper validated capabilities.

Successful runs are counted from `Status: SUCCESS` entries in `/automation/daily-log.md`.

## Manual Run

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\automation\run-nightly.ps1
```

## Inspect The Scheduled Task

```powershell
schtasks /Query /TN "Techniek TwinSim Nightly Refinement" /FO LIST /V
```

## Disable Or Enable

```powershell
schtasks /Change /TN "Techniek TwinSim Nightly Refinement" /DISABLE
schtasks /Change /TN "Techniek TwinSim Nightly Refinement" /ENABLE
```

## Remove

```powershell
schtasks /Delete /TN "Techniek TwinSim Nightly Refinement" /F
```

## Failure Behavior

Failures are written to the local log directory. Failed or dependency-changing runs are not committed. If a failed run leaves edits for review, the next nightly run will stop because the working tree is dirty.
