"""Classify Techniek knowledge uploads into owner-only discipline folders.

Usage:
  python tools/classify_knowledge_uploads.py
  python tools/classify_knowledge_uploads.py --apply

The default mode is a dry run. Use --apply to move files from knowledge_uploads/inbox
into the best matching discipline folder or needs_review.
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
DESTINATIONS = {
    "mechanical_engineering": UPLOAD_ROOT / "mechanical_engineering",
    "civil_engineering": UPLOAD_ROOT / "civil_engineering",
    "energy_engineering": UPLOAD_ROOT / "energy_engineering",
    "project_management": UPLOAD_ROOT / "project_management",
    "needs_review": UPLOAD_ROOT / "needs_review",
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
                score += len(re.findall(rf"\\b{re.escape(key)}\\b", normalized))
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

    results = []
    for path in sorted(INBOX.iterdir()):
        if path.name.startswith(".") or path.is_dir():
            continue
        category, scores, reason = score_document(path)
        destination = unique_destination(DESTINATIONS[category] / path.name)
        record = {
            "file": str(path.relative_to(ROOT)),
            "category": category,
            "destination": str(destination.relative_to(ROOT)),
            "reason": reason,
            "scores": scores,
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
    args = parser.parse_args()

    results = classify(apply=args.apply)
    print(json.dumps({"count": len(results), "results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
