# Techniek TwinSim Studio (published build)

This folder contains the **built static output** of Techniek TwinSim Studio,
served directly by GitHub Pages and the local preview server. Do not edit these
files by hand.

- Source of truth: https://github.com/Kenja1970/Techniek-TwinSimStudio
- Tech: Vite + React (`base: "./"`, so the build is portable to this subpath)

## Updating

Rebuild from the source repo and copy the build output here:

```bash
git clone https://github.com/Kenja1970/Techniek-TwinSimStudio
cd Techniek-TwinSimStudio
npm ci
npx vite build
# then copy the contents of dist/ over this folder (keep this README.md)
```
