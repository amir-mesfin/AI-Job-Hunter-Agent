from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import User, Job, JobSource
from ..schemas import (
    JobSourceCreate,
    JobSourceResponse,
    JobCreate,
    JobResponse,
    SyncResult,
)
from ..auth.security import get_current_user
from ..collectors.runner import ensure_default_sources, sync_all_enabled, sync_source

router = APIRouter(prefix="/api/collectors", tags=["Phase 2 — Job Collectors"])


def _bg_sync_all():
    db = SessionLocal()
    try:
        sync_all_enabled(db)
    finally:
        db.close()


@router.get("/sources", response_model=List[JobSourceResponse])
def list_sources(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_default_sources(db)
    return db.query(JobSource).order_by(JobSource.id.asc()).all()


@router.post("/sources", response_model=JobSourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: JobSourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.source_type not in ("greenhouse", "lever", "ashby", "rss"):
        raise HTTPException(400, detail="source_type must be greenhouse, lever, ashby, or rss")
    source = JobSource(
        name=payload.name,
        source_type=payload.source_type,
        board_token=payload.board_token,
        company_name=payload.company_name,
        enabled=payload.enabled,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.patch("/sources/{source_id}", response_model=JobSourceResponse)
def update_source(
    source_id: int,
    payload: JobSourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not source:
        raise HTTPException(404, detail="Source not found")
    source.name = payload.name
    source.source_type = payload.source_type
    source.board_token = payload.board_token
    source.company_name = payload.company_name
    source.enabled = payload.enabled
    db.commit()
    db.refresh(source)
    return source


@router.delete("/sources/{source_id}")
def delete_source(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not source:
        raise HTTPException(404, detail="Source not found")
    db.delete(source)
    db.commit()
    return {"message": "Source deleted"}


@router.post("/sync", response_model=List[SyncResult])
def sync_now(
    background_tasks: BackgroundTasks,
    background: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pull jobs from all enabled sources (Greenhouse / Lever / RSS)."""
    ensure_default_sources(db)
    if background:
        background_tasks.add_task(_bg_sync_all)
        return [{"source_id": 0, "ok": True, "created": 0, "updated": 0, "total": 0, "error": "started in background"}]
    results = sync_all_enabled(db)
    return results


@router.post("/sync/{source_id}", response_model=SyncResult)
def sync_one(
    source_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not source:
        raise HTTPException(404, detail="Source not found")
    return sync_source(db, source)


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job_manual(
    payload: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin-style manual job create for Phase 2."""
    job = Job(**payload.model_dump(), source="manual")
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
