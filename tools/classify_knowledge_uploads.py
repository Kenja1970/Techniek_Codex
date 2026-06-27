"""Classify Techniek knowledge uploads into owner-only discipline folders.

Usage:
  python tools/classify_knowledge_uploads.py
  python tools/classify_knowledge_uploads.py --apply

The default mode is a dry run. Use --apply to move files from knowledge_uploads/inbox
into the best matching discipline folder, restricted_review, or needs_review.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = ROOT / "knowledge_uploads"
INBOX = UPLOAD_ROOT / "inbox"
APPROVED_PUBLIC = UPLOAD_ROOT / "approved_public"
RESTRICTED_REVIEW = UPLOAD_ROOT / "restricted_review"
LOG_FILE = UPLOAD_ROOT / "classification-log.jsonl"
DESTINATIONS = {
    "mechanical_engineering": UPLOAD_ROOT / "mechanical_engineering",
    "civil_engineering": UPLOAD_ROOT / "civil_engineering",
    "energy_engineering": UPLOAD_ROOT / "energy_engineering",
    "project_management": UPLOAD_ROOT / "project_management",
    "needs_review": UPLOAD_ROOT / "needs_review",
}

SENSITIVITY_KEYWORDS = {
    "cui_or_fci": [
        "controlled unclassified information", "cui", "federal contract information",
        "fci", "covered defense information", "cdi", "dfars 252.204-7012",
        "dfars 252.204-7021", "dd254", "distribution statement",
    ],
    "export_or_defense": [
        "itar", "ear", "export controlled", "export-controlled", "technical data",
        "defense article", "arms export control", "munition", "u.s. person only",
    ],
    "client_confidential": [
        "confidential", "proprietary", "nda", "non-disclosure", "do not distribute",
        "internal use only", "client name", "customer name", "proposal", "pricing",
        "invoice", "account number", "contract number", "solicitation number",
    ],
    "credentials_or_secrets": [
        "password", "api key", "token", "secret", "private key", "access key",
        "connection string", "credential",
    ],
}

KEYWORDS = {
    "mechanical_engineering": [
        "mechanical", "hvac", "pump", "fan", "motor", "chiller", "boiler",
        "bearing", "vibration", "commissioning", "equipment", "maintenance",
        "piping", "valve", "air handler", "cooling tower", "reliability",
    ],
    "civil_engineering": [
        "civil", "site", "drainage", "stormwater", "pavement", "foundation",
        "structural", "facility condition", "infrastructure", "utility map",
        "inspection", "asset condition", "roof", "road", "grading",
    ],
    "energy_engineering": [
        "energy", "utility", "meter", "interval data", "bas", "building automation",
        "demand", "kilowatt", "kwh", "therm", "setpoint", "schedule drift",
        "savings", "audit", "benchmark", "load profile", "occupancy",
    ],
    "project_management": [
        "project", "schedule", "rfi", "submittal", "risk register", "decision log",
        "change order", "meeting minutes", "stakeholder", "action item",
        "coordination", "status report", "milestone", "closeout", "scope",
    ],
}


def safe_read_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".log"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".docx":
        return read_docx_text(path)
    return ""


def read_docx_text(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read("word/document.xml")
    except Exception:
        return ""

    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return ""

    text_nodes = []
    for node in root.iter():
        if node.tag.endswith("}t") and node.text:
            text_nodes.append(node.text)
    return " ".join(text_nodes)


def detect_sensitivity(path: Path) -> tuple[str, dict[str, int], list[str]]:
    text = f"{path.name} {safe_read_text(path)}".lower()
    normalized = re.sub(r"[^a-z0-9.\-\s]", " ", text)
    scores: dict[str, int] = {}
    signals: list[str] = []

    for label, keywords in SENSITIVITY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            hits = normalized.count(keyword.lower())
            if hits:
                score += hits
                signals.append(f"{label}:{keyword}")
        scores[label] = score

    if scores["credentials_or_secrets"] > 0:
        return "restricted", scores, signals
    if scores["cui_or_fci"] > 0 or scores["export_or_defense"] > 0:
        return "restricted", scores, signals
    if scores["client_confidential"] >= 2:
        return "owner_review", scores, signals
    if scores["client_confidential"] == 1:
        return "public_review_required", scores, signals
    return "public_candidate", scores, signals


def score_document(path: Path) -> tuple[str, dict[str, int], str]:
    text = f"{path.stem} {safe_read_text(path)}".lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", text)
    scores: dict[str, int] = {}

    for category, keywords in KEYWORDS.items():
        # Count phrase hits first, then individual normalized word hits.
        score = 0
        for keyword in keywords:
            key = keyword.lower()
            if " " in key:
                score += normalized.count(key) * 3
            else:
                score += len(re.findall(rf"\b{re.escape(key)}\b", normalized))
        scores[category] = score

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best_category, best_score = ranked[0]
    runner_up_score = ranked[1][1] if len(ranked) > 1 else 0

    if best_score < 2:
        return "needs_review", scores, "not enough readable evidence for a confident classification"
    if runner_up_score and best_score - runner_up_score < 2:
        return "needs_review", scores, "mixed signals across disciplines"
    return best_category, scores, "confident keyword and text match"


def unique_destination(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    counter = 2
    while True:
        candidate = path.with_name(f"{stem}-{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def classify(apply: bool) -> list[dict[str, object]]:
    for folder in DESTINATIONS.values():
        folder.mkdir(parents=True, exist_ok=True)
    APPROVED_PUBLIC.mkdir(parents=True, exist_ok=True)
    for folder in DESTINATIONS:
        (RESTRICTED_REVIEW / folder).mkdir(parents=True, exist_ok=True)
    INBOX.mkdir(parents=True, exist_ok=True)

    results = []
    for path in sorted(INBOX.iterdir()):
        if path.name.startswith(".") or path.is_dir():
            continue
        category, scores, reason = score_document(path)
        sensitivity, sensitivity_scores, sensitivity_signals = detect_sensitivity(path)
        destination_root = DESTINATIONS[category]
        public_use = "eligible_for_owner_review"

        if sensitivity in {"restricted", "owner_review"}:
            destination_root = RESTRICTED_REVIEW / category
            public_use = "blocked_until_sanitized_summary_is_approved"
        elif sensitivity == "public_review_required":
            public_use = "review_before_public_summary"

        destination = unique_destination(destination_root / path.name)
        record = {
            "file": str(path.relative_to(ROOT)),
            "category": category,
            "destination": str(destination.relative_to(ROOT)),
            "reason": reason,
            "scores": scores,
            "sensitivity": sensitivity,
            "sensitivityScores": sensitivity_scores,
            "sensitivitySignals": sensitivity_signals[:12],
            "publicUse": public_use,
            "applied": apply,
            "classifiedAt": datetime.now().isoformat(timespec="seconds"),
        }
        if apply:
            shutil.move(str(path), str(destination))
        results.append(record)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify Techniek owner-only knowledge uploads.")
    parser.add_argument("--apply", action="store_true", help="Move files instead of running a dry run.")
    parser.add_argument("--no-log", action="store_true", help="Do not append results to the classification log.")
    args = parser.parse_args()

    results = classify(apply=args.apply)
    if not args.no_log:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as log:
            for record in results:
                log.write(json.dumps(record, sort_keys=True) + "\n")
    print(json.dumps({"count": len(results), "results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
