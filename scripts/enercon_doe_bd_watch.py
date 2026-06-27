#!/usr/bin/env python3
"""ENERCON DOE BD Nightly Watch.

Nightly business-development watcher that surfaces DOE-centric procurement and
market leads relevant to ENERCON Federal Services (full-discipline A/E, master
planning, project/construction management, facility assessment, remediation,
and technical support for DOE, NNSA, DOE-EM, national laboratories, and
first-tier M&O operators).

The script:
  * Queries the SAM.gov Opportunities API (v2) using date-bounded nightly
    windows for active opportunities, by NAICS code and by site/program title.
  * Optionally ingests CSV exports from EdgeWins, GovWin, or HigherGov.
  * Scores every lead from 0-100 against ENERCON's target sites, mission
    context, NAICS, capabilities, design-build signals, and notice stage.
  * Deduplicates against a local SQLite state database and marks each lead as
    NEW, UPDATED, SEEN, or LOW FIT.
  * Writes Markdown / CSV / JSON reports (latest.* plus dated archives) and can
    email the report when SMTP environment variables are configured.

Design goals: dependency-light (standard library only), non-interactive, no
browser, no scraping of sites that prohibit automation, and easy-to-modify
scoring and source lists (see the CONFIG section below).

Exit codes:
  0  successful run
  1  unexpected runtime failure
  2  configuration error
"""

from __future__ import annotations

import argparse
import csv
import glob
import hashlib
import json
import os
import smtplib
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

# ---------------------------------------------------------------------------
# Stable exit codes
# ---------------------------------------------------------------------------
EXIT_OK = 0
EXIT_RUNTIME = 1
EXIT_CONFIG = 2

# ===========================================================================
# CONFIG  --  Everything below this banner is meant to be easy to tweak.
# ===========================================================================

SAM_SEARCH_URL = "https://api.sam.gov/opportunities/v2/search"

# Report is delivered to this analyst by default. Override with EMAIL_TO or
# the --email-to flag. (Not a secret, so it is safe to keep in source.)
DEFAULT_RECIPIENT = "gregory.leon.brown@gmail.com"

# Primary NAICS that should score highest.
PRIMARY_NAICS = {"541330"}  # Engineering Services

# Associated NAICS (still strong professional-services / construction fit).
ASSOCIATED_NAICS = {
    "541310": "Architectural Services",
    "541320": "Landscape Architectural Services",
    "541340": "Drafting Services",
    "541350": "Building Inspection Services",
    "541360": "Geophysical Surveying and Mapping Services",
    "541370": "Surveying and Mapping Services",
    "541380": "Testing Laboratories and Services",
    "541420": "Industrial Design Services",
    "541512": "Computer Systems Design Services",
    "541513": "Computer Facilities Management Services",
    "541519": "Other Computer Related Services",
    "541611": "Administrative Management and General Management Consulting Services",
    "541618": "Other Management Consulting Services",
    "541620": "Environmental Consulting Services",
    "541690": "Other Scientific and Technical Consulting Services",
    "541715": "R&D in Physical, Engineering, and Life Sciences",
    "541990": "All Other Professional, Scientific, and Technical Services",
    "561210": "Facilities Support Services",
    "236220": "Commercial and Institutional Building Construction",
    "237110": "Water and Sewer Line and Related Structures Construction",
    "237120": "Oil and Gas Pipeline and Related Structures Construction",
    "237130": "Power and Communication Line and Related Structures Construction",
    "237990": "Other Heavy and Civil Engineering Construction",
    "238210": "Electrical Contractors and Other Wiring Installation Contractors",
    "238220": "Plumbing, Heating, and Air-Conditioning Contractors",
    "238910": "Site Preparation Contractors",
    "562910": "Remediation Services",
}

# All NAICS we ask SAM.gov about (primary first, then associated).
NAICS_DESCRIPTIONS = {"541330": "Engineering Services", **ASSOCIATED_NAICS}
ALL_NAICS = list(NAICS_DESCRIPTIONS.keys())

# Site / region terms. Each canonical site maps to the substrings that imply it.
# Add new sites or aliases here to expand region coverage.
REGION_SITE_TERMS = {
    "NNSS": [
        "nevada national security site",
        "nnss",
        "nevada test site",
        "mercury, nv",
        "mercury nv",
    ],
    "MSTS": [
        "mission support and test services",
        "msts",
    ],
    "Pantex": ["pantex"],
    "ORNL": ["oak ridge national laboratory", "ornl"],
    "Y-12": ["y-12", "y12", "y 12 national security"],
    "Oak Ridge": ["oak ridge reservation", "oak ridge", "ettp", "east tennessee technology park"],
    "Paducah": ["paducah", "pgdp"],
    "Portsmouth": ["portsmouth", "piketon", "pordp"],
}

# DOE / NNSA / nuclear / M&O / national-lab context terms.
DOE_CONTEXT_TERMS = [
    "department of energy",
    "doe-em",
    "doe em",
    "office of environmental management",
    "environmental management",
    "nnsa",
    "national nuclear security administration",
    "national laboratory",
    "national lab",
    "management and operating",
    "management & operating",
    "m&o contractor",
    "m&o operator",
    " m&o ",
    "nuclear",
    "radiological",
    "los alamos",
    "savannah river",
    "hanford",
    "idaho national laboratory",
    "sandia",
    "lawrence livermore",
    "argonne",
    "brookhaven",
    "fermilab",
    "waste isolation pilot plant",
    "wipp",
]

# Standalone "DOE" handling needs word boundaries to avoid false positives like
# "does". Checked separately in score_lead().
DOE_ACRONYMS = ["doe", "nnsa", "em"]

# Capability fit terms grouped by discipline. Distinct group hits drive the
# capability sub-score, so adding a new discipline is just another entry.
CAPABILITY_TERMS = {
    "architecture/engineering": [
        "architect",
        "architectural",
        "engineering services",
        "engineering support",
        " a-e ",
        " a/e ",
        " a&e ",
        "architect-engineer",
        "architect engineer",
    ],
    "design": ["design", "drawings", "specifications", "renovation", "modernization"],
    "master planning": ["master plan", "master planning", "site plan", "land use plan"],
    "project management": ["project management", "program management", "project controls"],
    "construction management": [
        "construction management",
        "construction manager",
        "cm services",
        "owner's representative",
    ],
    "facility assessment": [
        "facility assessment",
        "facility condition",
        "condition assessment",
        "facility evaluation",
    ],
    "facility support/infrastructure": [
        "facilities support",
        "facility support",
        "infrastructure",
        "utilities",
        "facility modification",
        "facility modifications",
        "maintenance and operations",
        "operations and maintenance",
    ],
    "remediation/D&D": [
        "remediation",
        "decontamination",
        "decommissioning",
        "d&d",
        "deactivation",
        "demolition",
        "environmental cleanup",
        "soil remediation",
        "groundwater",
    ],
}

# Design-build / progressive design-build signals.
DESIGN_BUILD_TERMS = [
    "progressive design-build",
    "progressive design build",
    "design-build",
    "design build",
    "design/build",
    "design-bid-build",  # still a delivery signal worth noting
    "pdb",
]

# Early-stage / shaping opportunity signals (higher BD value).
EARLY_STAGE_TERMS = [
    "sources sought",
    "request for information",
    "rfi",
    "presolicitation",
    "pre-solicitation",
    "special notice",
    "draft rfp",
    "draft solicitation",
    "industry day",
    "combined synopsis",
]

# Title queries sent to SAM.gov to catch relevant work that lives OUTSIDE our
# NAICS list (e.g., a Pantex notice filed under an unexpected NAICS). Keep this
# list focused on distinctive site/program names to conserve API calls.
SAM_TITLE_QUERIES = [
    "Pantex",
    "Oak Ridge",
    "ORNL",
    "Y-12",
    "Nevada National Security Site",
    "Mission Support and Test Services",
    "Paducah",
    "Portsmouth",
    "Environmental Management",
    "decontamination and decommissioning",
    "progressive design-build",
    "national laboratory",
    "facility modification",
    "master planning",
]

# Scoring weights. Adjust these to retune prioritization; the maximum possible
# raw total is 100 (region 28 + DOE 22 + NAICS 16 + capability 16 + DB 10 +
# early-stage 8). score_lead() caps the final value at 100.
SCORE_WEIGHTS = {
    "region_site": 28,
    "doe_context": 22,
    "naics_primary": 16,
    "naics_associated": 9,
    "capability_per_hit": 5,
    "capability_max": 16,
    "design_build": 10,
    "early_stage": 8,
}

# Networking defaults.
HTTP_TIMEOUT = 60
USER_AGENT = "ENERCON-DOE-BD-Watch/1.0 (+https://github.com/Kenja1970/Techniek_Codex)"

# ===========================================================================
# End CONFIG
# ===========================================================================


class ConfigError(Exception):
    """Raised for configuration problems that should map to exit code 2."""


# ---------------------------------------------------------------------------
# Small utilities
# ---------------------------------------------------------------------------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def env_str(name: str) -> str:
    """Return a stripped environment variable value, or '' if unset/blank."""
    value = os.environ.get(name)
    return value.strip() if isinstance(value, str) else ""


def safe_lower(value) -> str:
    return value.lower() if isinstance(value, str) else ""


# ---------------------------------------------------------------------------
# Argument parsing / configuration
# ---------------------------------------------------------------------------
def parse_args(argv) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="enercon_doe_bd_watch.py",
        description="Nightly DOE-centric BD lead watcher for ENERCON Federal Services.",
    )
    parser.add_argument("--days-back", type=int, default=7,
                        help="Posted-date lookback window in days (default: 7).")
    parser.add_argument("--min-score", type=int, default=45,
                        help="Minimum score (0-100) to consider a lead reportable (default: 45).")
    parser.add_argument("--output-dir", default="bd_outputs",
                        help="Directory for report outputs (default: bd_outputs).")
    parser.add_argument("--state-db", default=None,
                        help="Path to the SQLite state DB (default: <output-dir>/enercon_doe_bd_state.sqlite).")
    parser.add_argument("--report-all-active", action="store_true",
                        help="Report all active leads above the threshold, including SEEN ones.")
    parser.add_argument("--limit", type=int, default=200,
                        help="SAM.gov page size, 1-1000 (default: 200).")
    parser.add_argument("--max-pages", type=int, default=3,
                        help="Maximum pages fetched per SAM.gov query (default: 3).")
    parser.add_argument("--max-requests", type=int, default=800,
                        help="Hard cap on SAM.gov API requests per run (default: 800).")
    parser.add_argument("--retries", type=int, default=4,
                        help="Retry attempts for throttled/transient SAM.gov errors (default: 4).")
    parser.add_argument("--posted-from", default=None,
                        help="Override posted-from date (MM/dd/yyyy). Defaults to today minus --days-back.")
    parser.add_argument("--posted-to", default=None,
                        help="Override posted-to date (MM/dd/yyyy). Defaults to today (UTC).")
    parser.add_argument("--email-to", default=None,
                        help=f"Recipient email (default: {DEFAULT_RECIPIENT} or EMAIL_TO env var).")
    parser.add_argument("--no-email", action="store_true",
                        help="Never attempt to send email even if SMTP is configured.")
    parser.add_argument("--skip-sam", action="store_true",
                        help="Skip SAM.gov queries (useful for CSV-only runs).")
    parser.add_argument("--dry-run", "--check-config", dest="dry_run", action="store_true",
                        help="Validate configuration and print the search plan without any network calls or file writes.")
    return parser.parse_args(argv)


class Config:
    """Resolved, validated run configuration."""

    def __init__(self, args: argparse.Namespace):
        self.days_back = args.days_back
        self.min_score = args.min_score
        self.report_all_active = args.report_all_active
        self.limit = args.limit
        self.max_pages = args.max_pages
        self.max_requests = args.max_requests
        self.retries = args.retries
        self.dry_run = args.dry_run
        self.skip_sam = args.skip_sam
        self.no_email = args.no_email

        # Validate numeric inputs early -> configuration error.
        if self.days_back < 1 or self.days_back > 365:
            raise ConfigError("--days-back must be between 1 and 365.")
        if self.min_score < 0 or self.min_score > 100:
            raise ConfigError("--min-score must be between 0 and 100.")
        if self.limit < 1 or self.limit > 1000:
            raise ConfigError("--limit must be between 1 and 1000.")
        if self.max_pages < 1:
            raise ConfigError("--max-pages must be at least 1.")

        self.output_dir = Path(args.output_dir)
        if args.state_db:
            self.state_db = Path(args.state_db)
        else:
            self.state_db = self.output_dir / "enercon_doe_bd_state.sqlite"

        # Posted date window (SAM expects MM/dd/yyyy).
        now = utcnow()
        if args.posted_to:
            self.posted_to = args.posted_to
        else:
            self.posted_to = now.strftime("%m/%d/%Y")
        if args.posted_from:
            self.posted_from = args.posted_from
        else:
            self.posted_from = (now - timedelta(days=self.days_back)).strftime("%m/%d/%Y")

        self.run_date = now.strftime("%Y-%m-%d")
        self.run_stamp = now.strftime("%Y-%m-%dT%H-%M-%SZ")

        # Secrets / credentials from the environment.
        self.sam_api_key = env_str("SAM_API_KEY")

        # CSV import globs.
        self.csv_globs = {
            "EdgeWins": env_str("EDGEWINS_CSV_GLOB"),
            "GovWin": env_str("GOVWIN_CSV_GLOB"),
            "HigherGov": env_str("HIGHERGOV_CSV_GLOB"),
        }

        # Email recipient + SMTP settings.
        self.email_to = args.email_to or env_str("EMAIL_TO") or DEFAULT_RECIPIENT
        self.smtp = {
            "host": env_str("SMTP_HOST"),
            "port": env_str("SMTP_PORT"),
            "user": env_str("SMTP_USER"),
            "password": env_str("SMTP_PASSWORD"),
            "from": env_str("EMAIL_FROM"),
        }

    @property
    def smtp_configured(self) -> bool:
        return all(self.smtp[k] for k in ("host", "port", "user", "password", "from"))


# ---------------------------------------------------------------------------
# SAM.gov client
# ---------------------------------------------------------------------------
class SamClient:
    """Thin SAM.gov Opportunities API client with throttle-aware retries."""

    def __init__(self, config: Config):
        self.config = config
        self.request_count = 0
        self.rate_limited = False  # set True once we give up due to throttling

    def _request(self, params: dict) -> dict:
        """Perform a single GET with retry/backoff. Returns parsed JSON.

        Raises ConfigError on auth problems (invalid/missing key) and returns an
        empty result on repeated throttling so the run degrades gracefully.
        """
        query = dict(params)
        query["api_key"] = self.config.sam_api_key
        url = f"{SAM_SEARCH_URL}?{urllib.parse.urlencode(query)}"

        backoff = 4
        for attempt in range(self.config.retries + 1):
            if self.request_count >= self.config.max_requests:
                self.rate_limited = True
                return {}
            self.request_count += 1
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                body = ""
                try:
                    body = exc.read().decode("utf-8", errors="replace")
                except Exception:
                    pass
                if exc.code in (401, 403):
                    raise ConfigError(
                        f"SAM.gov rejected the API key (HTTP {exc.code}). "
                        f"Check SAM_API_KEY. Detail: {body[:300]}"
                    ) from exc
                if exc.code == 429 or exc.code >= 500:
                    # Throttled or transient server error: back off and retry.
                    if attempt < self.config.retries:
                        time.sleep(backoff)
                        backoff *= 2
                        continue
                    self.rate_limited = exc.code == 429 or self.rate_limited
                    print(f"  ! SAM.gov request gave up after retries (HTTP {exc.code}).")
                    return {}
                # Other 4xx (e.g., 404 No Data) -> treat as empty result.
                print(f"  ! SAM.gov request returned HTTP {exc.code}; skipping. Detail: {body[:200]}")
                return {}
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt < self.config.retries:
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                print(f"  ! SAM.gov request failed after retries: {exc}")
                return {}
        return {}

    def search(self, base_params: dict, label: str) -> list:
        """Paginate a single query; returns a list of raw opportunity dicts."""
        collected = []
        offset = 0
        for _ in range(self.config.max_pages):
            if self.rate_limited:
                break
            params = dict(base_params)
            params.update({
                "postedFrom": self.config.posted_from,
                "postedTo": self.config.posted_to,
                "limit": self.config.limit,
                "offset": offset,
            })
            payload = self._request(params)
            if not payload:
                break
            data = payload.get("opportunitiesData") or []
            collected.extend(data)
            total = payload.get("totalRecords", 0) or 0
            offset += self.config.limit
            if offset >= total or not data:
                break
        if collected:
            print(f"  - {label}: {len(collected)} record(s)")
        return collected

    def gather(self) -> list:
        """Run all NAICS and title queries; returns deduped raw opportunities."""
        seen_ids = set()
        results = []

        def absorb(records):
            for rec in records:
                notice_id = rec.get("noticeId") or rec.get("noticeid")
                key = notice_id or hashlib.sha256(
                    json.dumps(rec, sort_keys=True, default=str).encode("utf-8")
                ).hexdigest()
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                results.append(rec)

        print("Querying SAM.gov by NAICS code ...")
        for code in ALL_NAICS:
            if self.rate_limited:
                break
            absorb(self.search({"ncode": code}, f"NAICS {code}"))

        print("Querying SAM.gov by site/program title ...")
        for term in SAM_TITLE_QUERIES:
            if self.rate_limited:
                break
            absorb(self.search({"title": term}, f"title '{term}'"))

        if self.rate_limited:
            print("  ! SAM.gov throttling/limit reached; proceeding with partial results.")
        print(f"SAM.gov returned {len(results)} unique opportunity record(s) "
              f"in {self.request_count} request(s).")
        return results


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------
def _pop_location(pop) -> str:
    """Render a SAM placeOfPerformance object as 'City, ST'."""
    if not isinstance(pop, dict):
        return ""
    city = ""
    state = ""
    city_obj = pop.get("city")
    if isinstance(city_obj, dict):
        city = city_obj.get("name") or ""
    state_obj = pop.get("state")
    if isinstance(state_obj, dict):
        state = state_obj.get("code") or state_obj.get("name") or ""
    elif isinstance(state_obj, str):
        state = state_obj
    parts = [p for p in (city, state) if p]
    return ", ".join(parts)


def normalize_sam(raw: dict) -> dict:
    """Convert a raw SAM.gov record into a normalized lead dict."""
    notice_id = raw.get("noticeId") or raw.get("noticeid") or ""
    naics = raw.get("naicsCode") or ""
    naics_list = raw.get("naicsCodes") if isinstance(raw.get("naicsCodes"), list) else []
    deadline = raw.get("responseDeadLine") or raw.get("reponseDeadLine") or ""
    office = raw.get("officeAddress") or {}
    office_loc = ""
    if isinstance(office, dict):
        office_loc = ", ".join(
            p for p in (office.get("city", ""), office.get("state", "")) if p
        )
    return {
        "source": "SAM.gov",
        "notice_id": notice_id or f"SAM:{hashlib.sha256(json.dumps(raw, sort_keys=True, default=str).encode()).hexdigest()[:16]}",
        "title": (raw.get("title") or "").strip(),
        "organization": (raw.get("fullParentPathName") or "").strip(),
        "naics": naics,
        "naics_list": [str(n) for n in naics_list] + ([naics] if naics else []),
        "notice_type": (raw.get("type") or raw.get("baseType") or "").strip(),
        "posted_date": (raw.get("postedDate") or "").strip(),
        "response_deadline": (deadline or "").strip(),
        "place_of_performance": _pop_location(raw.get("placeOfPerformance")) or office_loc,
        "set_aside": (raw.get("typeOfSetAsideDescription") or raw.get("setAside") or "").strip(),
        "active": (raw.get("active") or "").strip(),
        "url": (raw.get("uiLink") or "").strip(),
        "description": "",  # description is a separate URL; not fetched by default
    }


# Candidate CSV column names (case-insensitive) for each normalized field.
CSV_FIELD_ALIASES = {
    "title": ["title", "opportunity title", "opportunity", "name", "project name", "project title"],
    "organization": ["agency", "department", "organization", "customer", "buyer", "agency name", "client"],
    "naics": ["naics", "naics code", "primary naics"],
    "notice_type": ["type", "notice type", "stage", "status", "opportunity type", "procurement type"],
    "posted_date": ["posted", "posted date", "published", "publish date", "date posted"],
    "response_deadline": ["response date", "due date", "response deadline", "close date", "due", "rfp due date"],
    "url": ["link", "url", "source url", "opportunity url", "web link"],
    "notice_id": ["solicitation", "solicitation number", "id", "opportunity id", "notice id", "solnum"],
    "place_of_performance": ["place of performance", "location", "state", "pop", "place of performance state"],
    "description": ["description", "summary", "abstract", "synopsis", "details"],
}


def _csv_value(row: dict, lowered: dict, aliases: list) -> str:
    for alias in aliases:
        if alias in lowered:
            value = lowered[alias]
            if value:
                return value.strip()
    return ""


def normalize_csv_row(row: dict, source: str) -> dict | None:
    """Map a CSV row to a normalized lead, or None if it has no title."""
    lowered = {
        (k or "").strip().lower(): (v if isinstance(v, str) else ("" if v is None else str(v)))
        for k, v in row.items()
    }
    fields = {
        key: _csv_value(row, lowered, aliases)
        for key, aliases in CSV_FIELD_ALIASES.items()
    }
    if not fields["title"]:
        return None

    notice_id = fields["notice_id"]
    if not notice_id:
        digest = hashlib.sha256(
            f"{fields['title']}|{fields['organization']}".encode("utf-8")
        ).hexdigest()[:16]
        notice_id = digest
    naics = "".join(ch for ch in fields["naics"] if ch.isdigit())[:6]
    return {
        "source": source,
        "notice_id": f"{source}:{notice_id}",
        "title": fields["title"],
        "organization": fields["organization"],
        "naics": naics,
        "naics_list": [naics] if naics else [],
        "notice_type": fields["notice_type"],
        "posted_date": fields["posted_date"],
        "response_deadline": fields["response_deadline"],
        "place_of_performance": fields["place_of_performance"],
        "set_aside": "",
        "active": "",
        "url": fields["url"],
        "description": fields["description"],
    }


def ingest_csv_globs(csv_globs: dict) -> list:
    """Read all configured CSV globs into normalized leads (defensively)."""
    leads = []
    for source, pattern in csv_globs.items():
        if not pattern:
            continue
        matches = sorted(glob.glob(pattern))
        if not matches:
            print(f"  - {source}: glob '{pattern}' matched no files.")
            continue
        for path in matches:
            count = 0
            try:
                with open(path, "r", encoding="utf-8-sig", newline="") as handle:
                    reader = csv.DictReader(handle)
                    for row in reader:
                        try:
                            lead = normalize_csv_row(row, source)
                        except Exception:
                            continue  # skip malformed row, keep going
                        if lead:
                            leads.append(lead)
                            count += 1
            except (OSError, csv.Error, UnicodeDecodeError) as exc:
                print(f"  ! {source}: failed to read '{path}': {exc}")
                continue
            print(f"  - {source}: {count} row(s) from {path}")
    return leads


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def text_blob(lead: dict) -> str:
    """Combine the searchable text fields of a lead into one lowercased blob."""
    parts = [
        lead.get("title", ""),
        lead.get("organization", ""),
        lead.get("notice_type", ""),
        lead.get("place_of_performance", ""),
        lead.get("set_aside", ""),
        lead.get("description", ""),
        " ".join(lead.get("naics_list", [])),
    ]
    # Pad with spaces so " m&o "/" a/e " style boundary checks work at edges.
    return " " + " ".join(p for p in parts if p).lower() + " "


def score_lead(lead: dict, min_score: int) -> dict:
    """Score a lead 0-100 and return {score, breakdown, reasons}."""
    blob = text_blob(lead)
    breakdown = {}
    reasons = []

    # 1) Region / site match.
    matched_sites = [
        site for site, terms in REGION_SITE_TERMS.items()
        if any(term in blob for term in terms)
    ]
    if matched_sites:
        breakdown["region_site"] = SCORE_WEIGHTS["region_site"]
        reasons.append("Region match: " + ", ".join(matched_sites))
    else:
        breakdown["region_site"] = 0

    # 2) DOE / NNSA / nuclear / M&O context.
    doe_hits = [term.strip() for term in DOE_CONTEXT_TERMS if term in blob]
    # Acronyms with word boundaries (spaces) to avoid partial-word matches.
    for acronym in DOE_ACRONYMS:
        if f" {acronym} " in blob and acronym not in doe_hits:
            doe_hits.append(acronym)
    if doe_hits:
        breakdown["doe_context"] = SCORE_WEIGHTS["doe_context"]
        reasons.append("DOE/NNSA/nuclear context (" + ", ".join(sorted(set(doe_hits))[:4]) + ")")
    else:
        breakdown["doe_context"] = 0

    # 3) NAICS fit (best of primary vs associated across all listed codes).
    codes = {str(c).strip() for c in lead.get("naics_list", []) if str(c).strip()}
    if codes & PRIMARY_NAICS:
        breakdown["naics"] = SCORE_WEIGHTS["naics_primary"]
        reasons.append("Primary NAICS 541330 (Engineering Services)")
    elif codes & set(ASSOCIATED_NAICS):
        breakdown["naics"] = SCORE_WEIGHTS["naics_associated"]
        hit = sorted(codes & set(ASSOCIATED_NAICS))[0]
        reasons.append(f"Associated NAICS {hit} ({ASSOCIATED_NAICS[hit]})")
    else:
        breakdown["naics"] = 0

    # 4) Capability fit (distinct discipline groups matched).
    matched_caps = [
        group for group, terms in CAPABILITY_TERMS.items()
        if any(term in blob for term in terms)
    ]
    cap_score = min(SCORE_WEIGHTS["capability_max"],
                    len(matched_caps) * SCORE_WEIGHTS["capability_per_hit"])
    breakdown["capability"] = cap_score
    if matched_caps:
        reasons.append("Capability fit: " + ", ".join(matched_caps))

    # 5) Design-build / progressive design-build.
    db_hits = [term for term in DESIGN_BUILD_TERMS if term in blob]
    if db_hits:
        breakdown["design_build"] = SCORE_WEIGHTS["design_build"]
        reasons.append("Design-build signal")
    else:
        breakdown["design_build"] = 0

    # 6) Early-stage / shaping notice.
    early_hits = [term for term in EARLY_STAGE_TERMS if term in blob]
    if early_hits:
        breakdown["early_stage"] = SCORE_WEIGHTS["early_stage"]
        reasons.append("Early-stage notice (" + ", ".join(sorted(set(early_hits))[:3]) + ")")
    else:
        breakdown["early_stage"] = 0

    score = min(100, sum(breakdown.values()))
    return {"score": score, "breakdown": breakdown, "reasons": reasons}


# ---------------------------------------------------------------------------
# State database (dedup + change detection)
# ---------------------------------------------------------------------------
def fingerprint(lead: dict) -> str:
    """Hash the fields whose change means the opportunity was meaningfully updated."""
    material = "|".join([
        safe_lower(lead.get("title")),
        safe_lower(lead.get("notice_type")),
        safe_lower(lead.get("response_deadline")),
        safe_lower(lead.get("active")),
        safe_lower(lead.get("naics")),
        safe_lower(lead.get("set_aside")),
    ])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


class StateDB:
    """SQLite-backed dedup / change tracking."""

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path))
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS opportunities (
                notice_id   TEXT PRIMARY KEY,
                source      TEXT,
                title       TEXT,
                fingerprint TEXT,
                score       INTEGER,
                first_seen  TEXT,
                last_seen   TEXT
            )
            """
        )
        self.conn.commit()

    def classify(self, lead: dict) -> str:
        """Return NEW / UPDATED / SEEN and persist the lead's current state."""
        fp = fingerprint(lead)
        now = iso_utc(utcnow())
        cur = self.conn.execute(
            "SELECT fingerprint FROM opportunities WHERE notice_id = ?",
            (lead["notice_id"],),
        )
        row = cur.fetchone()
        if row is None:
            status = "NEW"
            self.conn.execute(
                "INSERT INTO opportunities "
                "(notice_id, source, title, fingerprint, score, first_seen, last_seen) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (lead["notice_id"], lead["source"], lead["title"], fp,
                 lead.get("score", 0), now, now),
            )
        elif row[0] != fp:
            status = "UPDATED"
            self.conn.execute(
                "UPDATE opportunities SET fingerprint = ?, score = ?, last_seen = ?, "
                "title = ? WHERE notice_id = ?",
                (fp, lead.get("score", 0), now, lead["title"], lead["notice_id"]),
            )
        else:
            status = "SEEN"
            self.conn.execute(
                "UPDATE opportunities SET last_seen = ?, score = ? WHERE notice_id = ?",
                (now, lead.get("score", 0), lead["notice_id"]),
            )
        return status

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.commit()
        self.conn.close()


# ---------------------------------------------------------------------------
# Reporting / output
# ---------------------------------------------------------------------------
REPORT_COLUMNS = [
    "score", "report_label", "source", "notice_id", "title", "organization",
    "naics", "notice_type", "posted_date", "response_deadline",
    "place_of_performance", "set_aside", "url", "fit_reasons",
]


def lead_to_row(lead: dict) -> dict:
    return {
        "score": lead.get("score", 0),
        "report_label": lead.get("report_label", ""),
        "source": lead.get("source", ""),
        "notice_id": lead.get("notice_id", ""),
        "title": lead.get("title", ""),
        "organization": lead.get("organization", ""),
        "naics": lead.get("naics", ""),
        "notice_type": lead.get("notice_type", ""),
        "posted_date": lead.get("posted_date", ""),
        "response_deadline": lead.get("response_deadline", ""),
        "place_of_performance": lead.get("place_of_performance", ""),
        "set_aside": lead.get("set_aside", ""),
        "url": lead.get("url", ""),
        "fit_reasons": "; ".join(lead.get("reasons", [])),
    }


def render_markdown(reported: list, counts: dict, config: Config) -> str:
    lines = []
    lines.append(f"# ENERCON DOE BD Nightly Watch — {config.run_date}")
    lines.append("")
    lines.append(f"- **Run (UTC):** {iso_utc(utcnow())}")
    lines.append(f"- **Posted window:** {config.posted_from} – {config.posted_to} "
                 f"(last {config.days_back} day(s))")
    lines.append(f"- **Minimum score:** {config.min_score}")
    lines.append(f"- **Mode:** {'all active above threshold' if config.report_all_active else 'NEW + UPDATED only'}")
    lines.append(
        f"- **Counts:** fetched {counts['fetched']}, scored {counts['scored']}, "
        f"above threshold {counts['above_threshold']}, "
        f"reported {counts['reported']} "
        f"(NEW {counts['new']}, UPDATED {counts['updated']}, SEEN {counts['seen']})"
    )
    lines.append("")

    if not reported:
        lines.append("_No opportunities matched the reporting criteria for this run._")
        lines.append("")
        return "\n".join(lines)

    # Group by report label, sorted by score descending.
    groups = {"NEW": [], "UPDATED": [], "SEEN": []}
    for lead in reported:
        groups.setdefault(lead["report_label"], []).append(lead)

    for label in ("NEW", "UPDATED", "SEEN"):
        bucket = sorted(groups.get(label, []), key=lambda x: x["score"], reverse=True)
        if not bucket:
            continue
        lines.append(f"## {label} ({len(bucket)})")
        lines.append("")
        for lead in bucket:
            lines.append(f"### [{lead['score']}] {lead['title'] or '(untitled)'}")
            lines.append(f"- **Source:** {lead['source']}  |  **Status:** {lead['report_label']}")
            if lead.get("organization"):
                lines.append(f"- **Organization:** {lead['organization']}")
            naics_line = lead.get("naics") or "n/a"
            lines.append(f"- **NAICS:** {naics_line}  |  **Type:** {lead.get('notice_type') or 'n/a'}")
            lines.append(
                f"- **Posted:** {lead.get('posted_date') or 'n/a'}  |  "
                f"**Response due:** {lead.get('response_deadline') or 'n/a'}"
            )
            if lead.get("place_of_performance"):
                lines.append(f"- **Place of performance:** {lead['place_of_performance']}")
            if lead.get("set_aside"):
                lines.append(f"- **Set-aside:** {lead['set_aside']}")
            if lead.get("reasons"):
                lines.append(f"- **Why it scored:** {'; '.join(lead['reasons'])}")
            if lead.get("url"):
                lines.append(f"- **Link:** {lead['url']}")
            lines.append("")
    return "\n".join(lines)


def write_outputs(reported: list, counts: dict, config: Config) -> dict:
    """Write latest.* plus a timestamped dated-archive copy. Returns paths."""
    out = config.output_dir
    out.mkdir(parents=True, exist_ok=True)
    dated_dir = out / config.run_date
    dated_dir.mkdir(parents=True, exist_ok=True)

    markdown = render_markdown(reported, counts, config)
    rows = [lead_to_row(lead) for lead in reported]
    json_doc = {
        "generated_at_utc": iso_utc(utcnow()),
        "run_date": config.run_date,
        "posted_from": config.posted_from,
        "posted_to": config.posted_to,
        "min_score": config.min_score,
        "report_all_active": config.report_all_active,
        "counts": counts,
        "leads": [
            {**lead_to_row(lead), "score_breakdown": lead.get("breakdown", {})}
            for lead in reported
        ],
    }

    # latest.* (overwritten every run).
    md_path = out / "latest.md"
    csv_path = out / "latest.csv"
    json_path = out / "latest.json"
    md_path.write_text(markdown, encoding="utf-8")
    _write_csv(csv_path, rows)
    json_path.write_text(json.dumps(json_doc, indent=2) + "\n", encoding="utf-8")

    # Dated archive copies (timestamped so repeated runs never overwrite history).
    stamp = config.run_stamp
    (dated_dir / f"enercon_doe_bd_{stamp}.md").write_text(markdown, encoding="utf-8")
    _write_csv(dated_dir / f"enercon_doe_bd_{stamp}.csv", rows)
    (dated_dir / f"enercon_doe_bd_{stamp}.json").write_text(
        json.dumps(json_doc, indent=2) + "\n", encoding="utf-8"
    )

    return {"md": md_path, "csv": csv_path, "json": json_path, "markdown": markdown}


def _write_csv(path: Path, rows: list):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=REPORT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
def send_email(config: Config, markdown: str, csv_path: Path, json_path: Path) -> bool:
    """Email the report if SMTP is configured. Returns True if sent."""
    if config.no_email:
        print("Email skipped because --no-email was passed.")
        return False
    if not config.smtp_configured:
        print("Email skipped because SMTP environment variables are not fully configured.")
        return False

    message = EmailMessage()
    message["Subject"] = f"ENERCON DOE BD Nightly Watch – {config.run_date}"
    message["From"] = config.smtp["from"]
    message["To"] = config.email_to
    message.set_content(markdown)

    for path, subtype in ((csv_path, "csv"), (json_path, "json")):
        try:
            data = path.read_bytes()
        except OSError as exc:
            print(f"  ! Could not attach {path.name}: {exc}")
            continue
        message.add_attachment(
            data, maintype="application", subtype=subtype, filename=path.name
        )

    try:
        port = int(config.smtp["port"])
    except ValueError:
        print("Email skipped because SMTP_PORT is not a valid integer.")
        return False

    try:
        if port == 465:
            with smtplib.SMTP_SSL(config.smtp["host"], port, timeout=HTTP_TIMEOUT) as server:
                server.login(config.smtp["user"], config.smtp["password"])
                server.send_message(message)
        else:
            with smtplib.SMTP(config.smtp["host"], port, timeout=HTTP_TIMEOUT) as server:
                server.ehlo()
                try:
                    server.starttls()
                    server.ehlo()
                except smtplib.SMTPException:
                    pass  # server may not support STARTTLS
                server.login(config.smtp["user"], config.smtp["password"])
                server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        # Email failure must not fail the whole run.
        print(f"  ! Email send failed (run continues): {exc}")
        return False

    print(f"Email sent to {config.email_to}.")
    return True


# ---------------------------------------------------------------------------
# Dry-run helper
# ---------------------------------------------------------------------------
def print_dry_run(config: Config) -> int:
    print("=== ENERCON DOE BD Nightly Watch — configuration check (dry run) ===")
    print(f"Posted window      : {config.posted_from} -> {config.posted_to} "
          f"(last {config.days_back} day(s))")
    print(f"Minimum score      : {config.min_score}")
    print(f"Report mode        : {'all active above threshold' if config.report_all_active else 'NEW + UPDATED only'}")
    print(f"Output directory   : {config.output_dir}")
    print(f"State database     : {config.state_db}")
    print(f"SAM.gov queries    : {len(ALL_NAICS)} NAICS code(s) + {len(SAM_TITLE_QUERIES)} title term(s)")
    print(f"SAM page/limit     : limit={config.limit}, max_pages={config.max_pages}, max_requests={config.max_requests}")
    print(f"SAM_API_KEY set    : {'yes' if config.sam_api_key else 'NO (required for a live run)'}")
    print(f"Skip SAM.gov       : {config.skip_sam}")
    configured_csv = {k: v for k, v in config.csv_globs.items() if v}
    if configured_csv:
        for source, pattern in configured_csv.items():
            print(f"CSV import         : {source} -> {pattern}")
    else:
        print("CSV import         : none configured (EDGEWINS_CSV_GLOB / GOVWIN_CSV_GLOB / HIGHERGOV_CSV_GLOB)")
    print(f"Email recipient    : {config.email_to}")
    print(f"SMTP configured    : {'yes' if config.smtp_configured else 'no (email would be skipped)'}")
    print("No network calls or file writes were performed (dry run).")
    if not config.sam_api_key and not configured_csv and not config.skip_sam:
        print("Note: neither SAM_API_KEY nor a CSV glob is configured; a live run "
              "would have no data source.")
    return EXIT_OK


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------
def run(config: Config) -> int:
    # Gather raw leads.
    leads = []

    if not config.skip_sam:
        if not config.sam_api_key:
            raise ConfigError(
                "SAM_API_KEY environment variable is required. Set it (e.g., "
                "export SAM_API_KEY=...) or pass --skip-sam for a CSV-only run."
            )
        client = SamClient(config)
        raw_records = client.gather()
        leads.extend(normalize_sam(rec) for rec in raw_records)
    else:
        print("Skipping SAM.gov queries (--skip-sam).")

    print("Ingesting optional CSV imports ...")
    leads.extend(ingest_csv_globs(config.csv_globs))

    if not leads:
        print("No leads gathered from any source.")

    # Deduplicate by notice_id (keep the first occurrence, prefer SAM richness).
    unique = {}
    for lead in leads:
        unique.setdefault(lead["notice_id"], lead)
    leads = list(unique.values())

    # Score + classify.
    state = StateDB(config.state_db)
    counts = {
        "fetched": len(leads), "scored": 0, "above_threshold": 0,
        "reported": 0, "new": 0, "updated": 0, "seen": 0, "low_fit": 0,
    }
    reported = []
    try:
        for lead in leads:
            result = score_lead(lead, config.min_score)
            lead.update(result)  # adds score, breakdown, reasons
            counts["scored"] += 1

            change_status = state.classify(lead)  # NEW / UPDATED / SEEN
            if lead["score"] < config.min_score:
                lead["report_label"] = "LOW FIT"
                counts["low_fit"] += 1
                continue

            counts["above_threshold"] += 1
            lead["report_label"] = change_status
            if change_status == "NEW":
                counts["new"] += 1
            elif change_status == "UPDATED":
                counts["updated"] += 1
            else:
                counts["seen"] += 1

            if change_status in ("NEW", "UPDATED") or config.report_all_active:
                reported.append(lead)
        state.commit()
    finally:
        state.close()

    reported.sort(key=lambda x: x["score"], reverse=True)
    counts["reported"] = len(reported)

    outputs = write_outputs(reported, counts, config)

    # Email (best effort).
    emailed = send_email(config, outputs["markdown"], outputs["csv"], outputs["json"])

    # Command-line summary.
    print("")
    print("=== Run summary ===")
    print(f"Posted window : {config.posted_from} -> {config.posted_to}")
    print(f"Fetched       : {counts['fetched']}")
    print(f"Above score   : {counts['above_threshold']} (>= {config.min_score})")
    print(f"Reported      : {counts['reported']} "
          f"(NEW {counts['new']}, UPDATED {counts['updated']}, SEEN {counts['seen']})")
    print(f"Low fit       : {counts['low_fit']}")
    print(f"Outputs       : {outputs['md']}, {outputs['csv']}, {outputs['json']}")
    print(f"Email         : {'sent to ' + config.email_to if emailed else 'skipped'}")
    return EXIT_OK


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    try:
        args = parse_args(argv)
        config = Config(args)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return EXIT_CONFIG

    if config.dry_run:
        try:
            return print_dry_run(config)
        except ConfigError as exc:
            print(f"Configuration error: {exc}", file=sys.stderr)
            return EXIT_CONFIG

    try:
        return run(config)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return EXIT_CONFIG
    except Exception as exc:  # unexpected runtime failure
        print(f"Unexpected runtime failure: {exc}", file=sys.stderr)
        return EXIT_RUNTIME


if __name__ == "__main__":
    sys.exit(main())
