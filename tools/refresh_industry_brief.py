import email.utils
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
BRIEFS_PATH = OUTPUTS / "briefs.json"
RSS_PATH = OUTPUTS / "briefs.xml"
TZ_NY = ZoneInfo("America/New_York")
SITE_BASE_URL = "https://kenja1970.github.io/Techniek_Codex/"
ARCHIVE_URL = f"{SITE_BASE_URL}archive.html"


SYSTEM_PROMPT = """You produce one practical industry brief for a commercial and industrial engineering website.
Focus on useful, current signals across engineering, project management, energy management, AI, markets, budgets, and industrial operations.
Use credible current sources gathered through web search. Prefer official resources, industry publications, major news organizations, or reputable research outlets.
Return only JSON matching the provided schema.
Write clearly for technical decision-makers.
Avoid hype, sales language, and vague futurism.
Every lesson must be concrete and actionable.
Every source must be a direct URL to the supporting article, report, or page.
Set the date exactly to the requested America/New_York date."""


USER_PROMPT_TEMPLATE = """Create exactly one new latest Industry Brief item for {date_ny}.

Requirements:
- date: exactly "{date_ny}"
- audience: one concise audience label such as "Energy management", "Project management", "Industrial operations", "Mechanical engineering", "Civil engineering", or "All disciplines"
- category: a short practical category
- headline: clear, useful, and specific
- summary: 2-4 sentences, practical, based on current sources
- lessons: 3 or 4 items, each operational and concrete
- sources: 2 to 4 credible links

Topic selection rules:
- Choose something current enough that a visitor on {date_ny} would benefit from it.
- Favor developments with practical implications for planning, cost, schedule, reliability, operations, controls, energy, procurement, or AI governance.
- Do not repeat the framing of the most recent brief if a materially different current angle is available.

Current latest brief for context:
{latest_brief}
"""


def load_briefs():
    return json.loads(BRIEFS_PATH.read_text(encoding="utf-8-sig"))


def today_ny():
    return datetime.now(TZ_NY).date().isoformat()


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:56].rstrip("-")


def parse_existing_guids():
    guid_map = {}
    if not RSS_PATH.exists():
        return guid_map

    tree = ET.parse(RSS_PATH)
    channel = tree.getroot().find("channel")
    if channel is None:
        return guid_map

    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        guid = (item.findtext("guid") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        date_key = ""
        if pub_date:
            try:
                date_key = email.utils.parsedate_to_datetime(pub_date).astimezone(TZ_NY).date().isoformat()
            except Exception:
                date_key = ""
        if title and guid and date_key:
            guid_map[(date_key, title)] = guid
    return guid_map


def rss_pub_date(date_value):
    dt = datetime.fromisoformat(f"{date_value}T12:00:00-04:00")
    return email.utils.format_datetime(dt)


def regenerate_rss(items):
    guid_map = parse_existing_guids()

    rss = ET.Element("rss", {"version": "2.0"})
    channel = ET.SubElement(rss, "channel")

    fields = {
        "title": "Techniek Engineering Industry Brief",
        "link": SITE_BASE_URL,
        "description": "Practical industry signals for engineering, project management, and energy management teams.",
        "language": "en-us",
        "lastBuildDate": email.utils.format_datetime(datetime.now(timezone.utc)),
    }

    for tag, text in fields.items():
        ET.SubElement(channel, tag).text = text

    for item_data in items:
        item = ET.SubElement(channel, "item")
        headline = item_data["headline"]
        guid = guid_map.get((item_data["date"], headline))
        if not guid:
            guid = f"techniek-industry-brief-{item_data['date']}-{slugify(headline)}"

        ET.SubElement(item, "title").text = headline
        ET.SubElement(item, "link").text = ARCHIVE_URL
        ET.SubElement(item, "guid").text = guid
        ET.SubElement(item, "pubDate").text = rss_pub_date(item_data["date"])
        ET.SubElement(item, "description").text = item_data["summary"]

    tree = ET.ElementTree(rss)
    ET.indent(tree, space="  ")
    tree.write(RSS_PATH, encoding="utf-8", xml_declaration=True)


def extract_output_text(payload):
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    for item in payload.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                return text
    raise RuntimeError("Could not extract model output text from OpenAI response.")


def fetch_new_brief(date_ny, latest_item):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    model = os.environ.get("OPENAI_MODEL", "gpt-5.4-mini")
    latest_brief = json.dumps(
        {
            "date": latest_item.get("date"),
            "audience": latest_item.get("audience"),
            "category": latest_item.get("category"),
            "headline": latest_item.get("headline"),
            "summary": latest_item.get("summary"),
        },
        ensure_ascii=False,
    )

    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "date": {"type": "string"},
            "audience": {"type": "string"},
            "category": {"type": "string"},
            "headline": {"type": "string"},
            "summary": {"type": "string"},
            "lessons": {
                "type": "array",
                "minItems": 3,
                "maxItems": 4,
                "items": {"type": "string"},
            },
            "sources": {
                "type": "array",
                "minItems": 2,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "url": {"type": "string"},
                    },
                    "required": ["name", "url"],
                },
            },
        },
        "required": ["date", "audience", "category", "headline", "summary", "lessons", "sources"],
    }

    request_body = {
        "model": model,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(date_ny=date_ny, latest_brief=latest_brief),
            },
        ],
        "tools": [
            {
                "type": "web_search",
                "search_context_size": "medium",
            }
        ],
        "tool_choice": "required",
        "text": {
            "format": {
                "type": "json_schema",
                "name": "industry_brief",
                "strict": True,
                "schema": schema,
            }
        },
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API error {exc.code}: {body}") from exc

    brief = json.loads(extract_output_text(payload))
    return brief


def validate_brief(brief, expected_date):
    required_strings = ["date", "audience", "category", "headline", "summary"]
    for key in required_strings:
        value = brief.get(key)
        if not isinstance(value, str) or not value.strip():
            raise RuntimeError(f"Brief field '{key}' is missing or invalid.")

    if brief["date"] != expected_date:
        raise RuntimeError(f"Brief date mismatch: expected {expected_date}, got {brief['date']}.")

    lessons = brief.get("lessons")
    if not isinstance(lessons, list) or len(lessons) < 3 or len(lessons) > 4:
        raise RuntimeError("Brief lessons must contain 3 or 4 items.")
    if not all(isinstance(item, str) and item.strip() for item in lessons):
        raise RuntimeError("Every lesson must be a non-empty string.")

    sources = brief.get("sources")
    if not isinstance(sources, list) or len(sources) < 2 or len(sources) > 4:
        raise RuntimeError("Brief sources must contain 2 to 4 items.")
    for source in sources:
        if not isinstance(source, dict):
            raise RuntimeError("Each source must be an object.")
        name = source.get("name")
        url = source.get("url")
        if not isinstance(name, str) or not name.strip():
            raise RuntimeError("Each source needs a non-empty name.")
        if not isinstance(url, str) or not re.match(r"^https://", url.strip()):
            raise RuntimeError("Each source URL must start with https://.")


def main():
    data = load_briefs()
    items = data["items"]
    date_ny = today_ny()

    if items and items[0].get("date") == date_ny:
        print(f"No update needed. Latest brief already matches {date_ny}.")
        return 0

    new_brief = fetch_new_brief(date_ny, items[0] if items else {})
    validate_brief(new_brief, date_ny)

    data["updated"] = date_ny
    data["items"] = [new_brief] + items

    BRIEFS_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    regenerate_rss(data["items"])

    json.loads(BRIEFS_PATH.read_text(encoding="utf-8"))
    ET.parse(RSS_PATH)

    print(f"Updated {BRIEFS_PATH}")
    print(f"Updated {RSS_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
