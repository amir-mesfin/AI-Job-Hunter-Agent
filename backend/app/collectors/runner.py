"""Phase 2 sync runner — upsert collected jobs into SQLite."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from sqlalchemy.orm import Session

from ..models import Job, JobSource
from . import CollectedJob, fetch_with_fallback


DEFAULT_SOURCES = [
    {"name": "OpenAI (Greenhouse)", "source_type": "greenhouse", "board_token": "openai", "company_name": "OpenAI"},
    {"name": "Anthropic (Greenhouse)", "source_type": "greenhouse", "board_token": "anthropic", "company_name": "Anthropic"},
    {"name": "Scale AI (Greenhouse)", "source_type": "greenhouse", "board_token": "scaleai", "company_name": "Scale AI"},
    {"name": "Mercor (Ashby)", "source_type": "ashby", "board_token": "mercor", "company_name": "Mercor"},
]


def ensure_default_sources(db: Session) -> None:
    if db.query(JobSource).count() > 0:
        return
    for s in DEFAULT_SOURCES:
        db.add(JobSource(**s, enabled=True))
    db.commit()


def upsert_jobs(db: Session, collected: List[CollectedJob]) -> Dict[str, int]:
    created = 0
    updated = 0
    for item in collected:
        existing = None
        if item.external_id:
            existing = db.query(Job).filter(Job.external_id == item.external_id).first()
        if not existing:
            existing = db.query(Job).filter(
                Job.apply_url == item.apply_url,
                Job.title == item.title,
            ).first()

        if existing:
            existing.company = item.company
            existing.location = item.location
            existing.salary = item.salary
            existing.remote = item.remote
            existing.description = item.description
            existing.skills = item.skills
            existing.experience_level = item.experience_level
            existing.country = item.country
            existing.source = item.source
            existing.external_id = item.external_id
            updated += 1
        else:
            db.add(
                Job(
                    company=item.company,
                    title=item.title,
                    location=item.location,
                    salary=item.salary,
                    remote=item.remote,
                    description=item.description,
                    skills=item.skills,
                    apply_url=item.apply_url,
                    experience_level=item.experience_level,
                    country=item.country,
                    source=item.source,
                    external_id=item.external_id,
                )
            )
            created += 1
    db.commit()
    return {"created": created, "updated": updated, "total": created + updated}


def sync_source(db: Session, source: JobSource) -> Dict:
    try:
        collected = fetch_with_fallback(source.source_type, source.board_token, source.company_name)
        stats = upsert_jobs(db, collected)
        source.last_synced_at = datetime.utcnow()
        source.last_sync_count = stats["total"]
        source.last_error = None
        db.commit()
        return {"source_id": source.id, "ok": True, **stats}
    except Exception as exc:
        source.last_error = str(exc)[:500]
        db.commit()
        return {"source_id": source.id, "ok": False, "error": str(exc), "created": 0, "updated": 0, "total": 0}


def sync_all_enabled(db: Session) -> List[Dict]:
    ensure_default_sources(db)
    results = []
    sources = db.query(JobSource).filter(JobSource.enabled == True).all()  # noqa: E712
    for source in sources:
        results.append(sync_source(db, source))
    return results
