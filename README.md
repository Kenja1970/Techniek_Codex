# Techniek Engineering Static Site

Static landing page and client support tools for Techniek Engineering.

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

## Deployment

The working static site lives in `outputs/`. The included GitHub Actions workflow publishes only deployable website files from that folder:

- HTML pages
- Public JSON/XML feeds used by the pages
- `robots.txt` and `sitemap.xml`
- `outputs/assets`
- `outputs/tools`, including the Flange Capacity Explorer

## Engineering Tools

Public engineering tools are grouped under:

```text
outputs/tools/
```

The flange screening and qualification-preparation tool is available at:

```text
outputs/tools/flange-capacity/index.html
```

It supports standard-rated and compact flange screening, material and bolting
selection, coupled pressure/axial/moment interaction, qualification-readiness
tracking, and downloadable objective evidence. Results remain screening
evidence until reviewed against controlled publications and project records.

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
