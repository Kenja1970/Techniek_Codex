# Techniek Project History Upload Library

Use this folder as the private source library for future Techniek project-history and skills prompts. Drop new documents into `inbox`; a background classifier can sort them into the right discipline folder, move ambiguous files to `needs_review`, and keep completed originals in `processed`.

## Folders

- `inbox` - start here. Upload or copy new past-performance artifacts here for classification.
- `mechanical_engineering` - equipment reviews, mechanical-system notes, commissioning lessons, maintenance support, issue logs, field photos, trend exports, and approved case-study summaries.
- `civil_engineering` - facility, site, infrastructure, condition, asset-management, drainage, utility, inspection, and planning artifacts.
- `energy_engineering` - utility reviews, BAS trend exports, interval data, energy audits, operating schedules, savings checks, and measurement notes.
- `project_management` - project controls, schedules, decision logs, risk registers, meeting notes, RFI/submittal lessons, and closeout summaries.
- `needs_review` - files the classifier cannot confidently place.
- `processed` - originals or copies after classification and owner review.

## Review Rules

- Remove or redact client names, pricing, account numbers, addresses, credentials, and confidential commercial terms before anything becomes public.
- Prefer short approved summaries over raw files for public prompts.
- Use consistent filenames such as `2026-05-project-type-topic-approved-summary.md`.
- When enough approved artifacts are available, rotate the website link names from broad contemporary topics to specific Techniek project-history themes.

## Agent Workflow

1. Place new documents in `knowledge_uploads/inbox`.
2. The classifier reads filenames and document text where possible.
3. It assigns one primary category: mechanical, civil, energy, or project management.
4. It moves the file into the matching folder or `needs_review`.
5. It creates or updates an approved summary only after owner review.
6. Public website prompts use approved summaries, not raw private documents.
