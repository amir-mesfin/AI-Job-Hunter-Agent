import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Job, Profile, Resume, GeneratedDoc
from ..schemas import (
    MatchRequest,
    MatchResult,
    CoverLetterRequest,
    TailorResumeRequest,
    GeneratedDocResponse,
    SkillExtractResponse,
)
from ..auth.security import get_current_user
from ..ai import (
    extract_skills,
    match_score,
    build_cover_letter,
    tailor_resume_bullets,
    read_resume_file,
    profile_skill_list,
)

router = APIRouter(prefix="/api/ai", tags=["Phase 3 — AI Assistant"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))


def _user_context(db: Session, user: User):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    resume_text = ""
    if resume:
        resume_text = resume.extracted_text or ""
        if not resume_text:
            filename = resume.file_url.split("/")[-1]
            path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(path):
                resume_text = read_resume_file(path, resume.file_type)
                resume.extracted_text = resume_text
                db.commit()
    skills = profile_skill_list(
        profile.skills if profile else None,
        resume_text,
        (profile.bio if profile else "") or "",
    )
    return profile, resume, resume_text, skills


@router.get("/skills", response_model=SkillExtractResponse)
def get_skills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile, resume, resume_text, skills = _user_context(db, current_user)
    # Persist extracted skills onto profile for reuse
    if profile is not None and skills:
        profile.skills = ", ".join(skills)
        db.commit()
    return {
        "skills": skills,
        "source": "resume+profile" if resume_text else "profile",
        "resume_chars": len(resume_text or ""),
    }


@router.post("/skills/extract", response_model=SkillExtractResponse)
def extract_skills_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_skills(current_user, db)


@router.post("/match", response_model=List[MatchResult])
def match_jobs(
    payload: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile, _, resume_text, skills = _user_context(db, current_user)
    if payload.skills:
        skills = list({*skills, *[s.strip() for s in payload.skills if s.strip()]})

    query = db.query(Job)
    if payload.job_id:
        query = query.filter(Job.id == payload.job_id)
    jobs = query.order_by(Job.created_at.desc()).limit(payload.limit or 50).all()

    results: List[MatchResult] = []
    for job in jobs:
        score, overlap, missing = match_score(
            skills,
            job.skills,
            job.title,
            job.description,
            user_bio=(profile.bio if profile else "") or "",
            resume_text=resume_text or "",
        )
        results.append(
            MatchResult(
                job_id=job.id,
                title=job.title,
                company=job.company,
                score=score,
                matched_skills=overlap,
                missing_skills=missing[:8],
                apply_url=job.apply_url,
                remote=job.remote,
                salary=job.salary,
            )
        )
    results.sort(key=lambda r: r.score, reverse=True)
    return results


@router.post("/cover-letter", response_model=GeneratedDocResponse)
def generate_cover_letter(
    payload: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(404, detail="Job not found")
    profile, _, resume_text, skills = _user_context(db, current_user)
    content = build_cover_letter(
        name=current_user.name,
        job_title=job.title,
        company=job.company,
        user_skills=skills,
        experience=(profile.experience if profile else "") or "",
        bio=(profile.bio if profile else "") or "",
        job_description=job.description,
    )
    score, _, _ = match_score(skills, job.skills, job.title, job.description)
    doc = GeneratedDoc(
        user_id=current_user.id,
        job_id=job.id,
        doc_type="cover_letter",
        content=content,
        match_score=score,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/tailor-resume", response_model=GeneratedDocResponse)
def generate_tailored_resume(
    payload: TailorResumeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(404, detail="Job not found")
    profile, _, resume_text, skills = _user_context(db, current_user)
    content = tailor_resume_bullets(
        name=current_user.name,
        job_title=job.title,
        company=job.company,
        user_skills=skills,
        experience=(profile.experience if profile else "") or "",
        resume_excerpt=resume_text[:2000],
    )
    score, _, _ = match_score(skills, job.skills, job.title, job.description)
    doc = GeneratedDoc(
        user_id=current_user.id,
        job_id=job.id,
        doc_type="tailored_resume",
        content=content,
        match_score=score,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/docs", response_model=List[GeneratedDocResponse])
def list_generated_docs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(GeneratedDoc)
        .filter(GeneratedDoc.user_id == current_user.id)
        .order_by(GeneratedDoc.created_at.desc())
        .limit(50)
        .all()
    )
