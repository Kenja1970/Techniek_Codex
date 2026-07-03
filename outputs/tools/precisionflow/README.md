# Techniek PrecisionFlow (published build)

This folder contains the **built static output** of Techniek PrecisionFlow,
served by GitHub Pages at `tools/precisionflow/` and the local preview server.
Do not edit these files by hand.

- Source of truth: https://github.com/Kenja1970/Techniek-PrecisionFlow
- Monorepo submodule: `tools/Techniek-PrecisionFlow`
- Tech: Vite + React (`base: "./"`, portable to this subpath)

## Updating

From the Techniek_Codex repository root:

```powershell
npm run publish:precisionflow
```

Or manually:

```powershell
cd tools/Techniek-PrecisionFlow
npm run build
# copy dist/* to outputs/tools/precisionflow/ (keep this README)
```
