# Techniek Project History Upload Library

Use this folder as the private source library for future Techniek project-history and skills prompts. Drop new documents into `inbox`; a background classifier can sort them into the right discipline folder, move controlled or confidential files to `restricted_review`, move ambiguous files to `needs_review`, and keep public website content limited to sanitized professional experience themes.

This is an owner-only workspace. Do not publish raw artifacts from this folder to the public website.

## Folders

- `inbox` - start here. Upload or copy new past-performance artifacts here for classification.
- `mechanical_engineering` - equipment reviews, mechanical-system notes, commissioning lessons, maintenance support, issue logs, field photos, trend exports, and approved case-study summaries.
- `civil_engineering` - facility, site, infrastructure, condition, asset-management, drainage, utility, inspection, and planning artifacts.
- `energy_engineering` - utility reviews, BAS trend exports, interval data, energy audits, operating schedules, savings checks, and measurement notes.
- `project_management` - project controls, schedules, decision logs, risk registers, meeting notes, RFI/submittal lessons, and closeout summaries.
- `restricted_review` - likely FCI, CUI, export-controlled, client-confidential, pricing, proposal, credential, or contract material. Review and sanitize before any public use.
- `approved_public` - optional short owner-approved summaries. These can be used to update approved public website content.
- `needs_review` - files the classifier cannot confidently place.
- `processed` - originals or copies after classification and owner review.

## CMMC-Aware Review Rules

- Treat FCI, CUI, covered defense information, export-controlled material, DD254 references, contract numbers, proposal pricing, credentials, and private client records as restricted.
- Do not use public website files for CUI, FCI, export-controlled technical data, passwords, API keys, or confidential client material.
- Remove or redact client names, pricing, account numbers, addresses, credentials, and confidential commercial terms before anything becomes public.
- Prefer short approved summaries over raw files for public prompts.
- Use consistent filenames such as `2026-05-project-type-topic-approved-summary.md`.
- When enough approved artifacts are available, rotate the website link names from broad contemporary topics to specific Techniek project-history themes.

## Agent Workflow

1. Place new documents in `knowledge_uploads/inbox`.
2. Run `python tools/classify_knowledge_uploads.py` to preview classification. In Codex, use the bundled Python runtime if `python` is not on your PATH.
3. Run `python tools/classify_knowledge_uploads.py --apply` to move files and append `classification-log.jsonl`.
4. The classifier reads filenames and document text where possible.
5. It assigns one primary category: mechanical, civil, energy, or project management.
6. It detects likely CMMC-sensitive material and routes it to `restricted_review`.
7. It moves ambiguous files to `needs_review`.
8. Use owner-approved summaries only for public website updates; do not publish raw private documents.

## Hands-Off Publishing Rule

Your only routine input should be artifacts placed in `knowledge_uploads/inbox`.

Any public update must use owner-approved, sanitized material. If a file may contain FCI, CUI, client names, pricing, credentials, contract numbers, or export-controlled technical data, it must remain outside public content.

## Supported Starting Files

- Text-like files: `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`, `.log`
- Word documents: `.docx`
- Other files such as PDFs and images are classified from the filename unless a later OCR/PDF parser is added.

## Classification Categories

- `mechanical_engineering` - HVAC, pumps, motors, mechanical equipment, commissioning, reliability, maintenance, and system review.
- `civil_engineering` - site, drainage, pavement, utilities, structural/facility condition, inspection, and infrastructure planning.
- `energy_engineering` - utility bills, meters, BAS, demand, schedules, setpoints, audits, savings, and load profiles.
- `project_management` - RFIs, submittals, schedule, risk register, decision log, scope, action items, coordination, and closeout.
