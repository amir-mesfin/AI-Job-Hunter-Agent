"""Phase 2 — job collectors for Greenhouse, Lever, and RSS feeds."""
from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List, Optional
from html import unescape

import httpx

AI_KEYWORDS = (
    "ai", "ml", "llm", "gpt", "annotat", "evaluat", "label", "rlhf",
    "prompt", "trainer", "data", "machine learning", "coding expert",
    "red team", "safety", "researcher",
)

HTTP_TIMEOUT = float(os.getenv("COLLECTORS_TIMEOUT", "8"))
FORCE_OFFLINE = os.getenv("COLLECTORS_OFFLINE", "").lower() in ("1", "true", "yes")


@dataclass
class CollectedJob:
    company: str
    title: str
    location: str
    salary: str
    remote: str
    description: str
    skills: str
    apply_url: str
    experience_level: str
    country: str
    source: str
    external_id: str


def _looks_ai_related(title: str, description: str = "") -> bool:
    text = f"{title} {description}".lower()
    return any(k in text for k in AI_KEYWORDS)


def _infer_remote(location: str) -> str:
    loc = (location or "").lower()
    if "remote" in loc:
        return "Remote"
    if "hybrid" in loc:
        return "Hybrid"
    return "On-site"


def _infer_country(location: str) -> str:
    loc = (location or "").lower()
    if "remote" in loc and ("world" in loc or "anywhere" in loc or not loc.strip("remote -,")):
        return "Remote Worldwide"
    if any(x in loc for x in ("united states", "usa", "u.s.", "san francisco", "new york", "seattle")):
        return "USA"
    if "canada" in loc or "toronto" in loc or "vancouver" in loc:
        return "Canada"
    if any(x in loc for x in ("united kingdom", "uk", "london", "england")):
        return "United Kingdom"
    if "germany" in loc or "berlin" in loc or "munich" in loc:
        return "Germany"
    if "remote" in loc:
        return "Remote Worldwide"
    return "Remote Worldwide"


def _infer_experience(title: str, description: str = "") -> str:
    text = f"{title} {description}".lower()
    if any(x in text for x in ("senior", "staff", "principal", "lead")):
        return "Senior"
    if any(x in text for x in ("junior", "associate")):
        return "Junior"
    if any(x in text for x in ("intern", "entry", "graduate")):
        return "Entry Level"
    return "Mid-Level"


def _extract_skills(text: str) -> str:
    catalog = [
        "Python", "JavaScript", "TypeScript", "React", "SQL", "Git", "Docker",
        "Linux", "Java", "C++", "Go", "Rust", "NLP", "Prompting", "PyTorch",
        "TensorFlow", "Kubernetes", "AWS", "Algorithms", "LaTeX", "HTML",
    ]
    found = [s for s in catalog if re.search(rf"\b{re.escape(s)}\b", text, re.I)]
    return ", ".join(found[:8]) if found else "Python, Git, Communication"


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def fetch_greenhouse(board_token: str, company_name: Optional[str] = None) -> List[CollectedJob]:
    """Public Greenhouse board API — no auth required."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
    jobs: List[CollectedJob] = []
    with httpx.Client(timeout=HTTP_TIMEOUT) as client:
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()

    company = company_name or board_token.replace("-", " ").title()
    for item in data.get("jobs", []):
        title = item.get("title") or "Untitled"
        location = (item.get("location") or {}).get("name") or "Remote"
        description = _strip_html(item.get("content") or "")
        if not _looks_ai_related(title, description):
            continue
        apply_url = item.get("absolute_url") or f"https://boards.greenhouse.io/{board_token}/jobs/{item.get('id')}"
        external_id = f"gh:{board_token}:{item.get('id')}"
        jobs.append(
            CollectedJob(
                company=company,
                title=title,
                location=location,
                salary="Competitive",
                remote=_infer_remote(location),
                description=description[:4000] or f"{title} at {company}",
                skills=_extract_skills(f"{title} {description}"),
                apply_url=apply_url,
                experience_level=_infer_experience(title, description),
                country=_infer_country(location),
                source="greenhouse",
                external_id=external_id,
            )
        )
    return jobs


def fetch_lever(company_slug: str, company_name: Optional[str] = None) -> List[CollectedJob]:
    """Public Lever postings API."""
    url = f"https://api.lever.co/v0/postings/{company_slug}?mode=json"
    jobs: List[CollectedJob] = []
    with httpx.Client(timeout=HTTP_TIMEOUT) as client:
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()

    company = company_name or company_slug.replace("-", " ").title()
    for item in data:
        title = item.get("text") or "Untitled"
        cats = item.get("categories") or {}
        location = cats.get("location") or item.get("country") or "Remote"
        description = _strip_html(item.get("descriptionPlain") or item.get("description") or "")
        if not _looks_ai_related(title, description):
            continue
        apply_url = item.get("hostedUrl") or item.get("applyUrl") or ""
        external_id = f"lever:{company_slug}:{item.get('id')}"
        jobs.append(
            CollectedJob(
                company=company,
                title=title,
                location=location,
                salary="Competitive",
                remote=_infer_remote(location),
                description=description[:4000] or f"{title} at {company}",
                skills=_extract_skills(f"{title} {description}"),
                apply_url=apply_url,
                experience_level=_infer_experience(title, description),
                country=_infer_country(location),
                source="lever",
                external_id=external_id,
            )
        )
    return jobs


def fetch_rss(feed_url: str, company_name: Optional[str] = None) -> List[CollectedJob]:
    """Generic RSS/Atom job feed parser."""
    with httpx.Client(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        resp = client.get(feed_url)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)

    # RSS 2.0 items or Atom entries
    items = root.findall(".//item")
    if not items:
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items = root.findall(".//atom:entry", ns) or root.findall(".//{http://www.w3.org/2005/Atom}entry")

    company = company_name or "RSS Feed"
    jobs: List[CollectedJob] = []
    for item in items:
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description") or item.find("summary")
        # Atom link may be an attribute
        if link_el is not None and link_el.text:
            apply_url = link_el.text.strip()
        elif link_el is not None and link_el.get("href"):
            apply_url = link_el.get("href")
        else:
            apply_url = feed_url

        title = (title_el.text if title_el is not None else "Untitled") or "Untitled"
        description = _strip_html(desc_el.text if desc_el is not None and desc_el.text else "")
        if not _looks_ai_related(title, description):
            continue
        external_id = f"rss:{hash(apply_url + title) & 0xFFFFFFFF}"
        jobs.append(
            CollectedJob(
                company=company,
                title=title.strip(),
                location="Remote",
                salary="Not listed",
                remote="Remote",
                description=description[:4000] or title,
                skills=_extract_skills(f"{title} {description}"),
                apply_url=apply_url,
                experience_level=_infer_experience(title, description),
                country="Remote Worldwide",
                source="rss",
                external_id=external_id,
            )
        )
    return jobs


def fetch_ashby(board_token: str, company_name: Optional[str] = None) -> List[CollectedJob]:
    """Public Ashby job board API."""
    url = f"https://api.ashbyhq.com/posting-api/job-board/{board_token}?includeCompensation=true"
    jobs: List[CollectedJob] = []
    with httpx.Client(timeout=HTTP_TIMEOUT) as client:
        resp = client.get(url)
        resp.raise_for_status()
        data = resp.json()

    company = company_name or board_token.replace("-", " ").title()
    for item in data.get("jobs", []):
        title = item.get("title") or "Untitled"
        location = item.get("location") or "Remote"
        if isinstance(location, dict):
            location = location.get("name") or "Remote"
        description = _strip_html(item.get("descriptionPlain") or item.get("descriptionHtml") or "")
        if not _looks_ai_related(title, description):
            continue
        apply_url = item.get("jobUrl") or item.get("applyUrl") or f"https://jobs.ashbyhq.com/{board_token}"
        external_id = f"ashby:{board_token}:{item.get('id')}"
        comp = item.get("compensation") or {}
        salary = "Competitive"
        if isinstance(comp, dict) and comp.get("compensationTier"):
            salary = "See posting"
        jobs.append(
            CollectedJob(
                company=company,
                title=title,
                location=str(location),
                salary=salary,
                remote=_infer_remote(str(location)),
                description=description[:4000] or f"{title} at {company}",
                skills=_extract_skills(f"{title} {description}"),
                apply_url=apply_url,
                experience_level=_infer_experience(title, description),
                country=_infer_country(str(location)),
                source="ashby",
                external_id=external_id,
            )
        )
    return jobs


# Demo catalogs used when live APIs are unreachable (offline / rate-limited)
DEMO_COLLECTIONS: dict[str, List[CollectedJob]] = {
    "openai": [
        CollectedJob(
            company="OpenAI",
            title="Research Data Analyst — Model Evaluation",
            location="San Francisco / Remote",
            salary="$60/hour",
            remote="Hybrid",
            description="Evaluate model outputs for factuality and usefulness across coding and reasoning tasks. Design rubrics and score completions.",
            skills="Python, Prompting, NLP, Research, Writing",
            apply_url="https://openai.com/careers",
            experience_level="Mid-Level",
            country="USA",
            source="greenhouse",
            external_id="gh:openai:demo-1",
        ),
    ],
    "anthropic": [
        CollectedJob(
            company="Anthropic",
            title="AI Safety Evaluator",
            location="Remote (Worldwide)",
            salary="$55/hour",
            remote="Remote",
            description="Review Claude responses for harmlessness and honesty. Flag policy issues and propose safer alternatives.",
            skills="Writing, Research, Prompting, Ethics, Python",
            apply_url="https://www.anthropic.com/careers",
            experience_level="Junior",
            country="Remote Worldwide",
            source="greenhouse",
            external_id="gh:anthropic:demo-1",
        ),
    ],
    "scaleai": [
        CollectedJob(
            company="Scale AI",
            title="Generative AI Coding Specialist",
            location="Remote (USA)",
            salary="$48/hour",
            remote="Remote",
            description="Write and review code used to train frontier coding models. Identify bugs and produce gold-standard solutions.",
            skills="Python, Algorithms, Git, JavaScript, SQL",
            apply_url="https://scale.com/careers",
            experience_level="Senior",
            country="USA",
            source="greenhouse",
            external_id="gh:scaleai:demo-1",
        ),
    ],
    "mercor": [
        CollectedJob(
            company="Mercor",
            title="AI Interviewer — Software Engineering",
            location="Remote",
            salary="$65/hour",
            remote="Remote",
            description="Conduct AI-assisted technical interviews and score coding evaluations for Mercor clients.",
            skills="Python, System Design, Algorithms, Communication",
            apply_url="https://mercor.com",
            experience_level="Senior",
            country="Remote Worldwide",
            source="ashby",
            external_id="ashby:mercor:demo-1",
        ),
    ],
}


def fetch_with_fallback(source_type: str, board_token: str, company_name: Optional[str] = None) -> List[CollectedJob]:
    """Try live fetch; fall back to demo catalog for known boards."""
    def demo() -> List[CollectedJob]:
        key = board_token.lower().replace("-", "").replace("_", "")
        for demo_key, jobs in DEMO_COLLECTIONS.items():
            if demo_key in key or key in demo_key:
                return list(jobs)
        return [
            CollectedJob(
                company=company_name or board_token.title(),
                title=f"AI Evaluation Specialist ({board_token})",
                location="Remote",
                salary="Competitive",
                remote="Remote",
                description=(
                    f"Offline demo listing for {board_token}. "
                    "Live sync will replace this when the board API is reachable."
                ),
                skills="Python, Git, Prompting, NLP",
                apply_url=f"https://boards.greenhouse.io/{board_token}" if source_type == "greenhouse" else board_token,
                experience_level="Mid-Level",
                country="Remote Worldwide",
                source=source_type,
                external_id=f"{source_type}:{board_token}:offline-demo",
            )
        ]

    if FORCE_OFFLINE:
        return demo()

    try:
        if source_type == "greenhouse":
            return fetch_greenhouse(board_token, company_name)
        if source_type == "lever":
            return fetch_lever(board_token, company_name)
        if source_type == "ashby":
            return fetch_ashby(board_token, company_name)
        if source_type == "rss":
            return fetch_rss(board_token, company_name)
        raise ValueError(f"Unknown source_type: {source_type}")
    except Exception:
        return demo()
