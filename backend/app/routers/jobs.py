import re
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Job, SavedJob, Bookmark, JobHistory, Resume
from ..schemas import JobResponse, SavedJobResponse, BookmarkResponse, DashboardStats
from ..auth.security import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["Jobs Management"])

def extract_salary_num(val_str: str) -> float:
    # Extracts the numeric value from strings like "$35/hour", "$70,000/yr"
    nums = re.findall(r"\d+", val_str.replace(",", ""))
    return float(nums[0]) if nums else 0.0

@router.get("", response_model=List[JobResponse])
def get_jobs(
    search: Optional[str] = None,
    remote: Optional[List[str]] = Query(None), # checkbox list
    country: Optional[List[str]] = Query(None), # list
    experience_level: Optional[List[str]] = Query(None), # list
    min_salary: Optional[float] = None,
    max_salary: Optional[float] = None,
    skills: Optional[List[str]] = Query(None), # list of tags
    db: Session = Depends(get_db)
):
    query = db.query(Job)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Job.title.ilike(search_filter)) | 
            (Job.company.ilike(search_filter)) | 
            (Job.description.ilike(search_filter))
        )
        
    if remote:
        query = query.filter(Job.remote.in_(remote))
        
    if country:
        query = query.filter(Job.country.in_(country))
        
    if experience_level:
        query = query.filter(Job.experience_level.in_(experience_level))
        
    jobs = query.all()
    
    # Process memory-level filtering for complex fields (skills, salary range)
    filtered_jobs = []
    for job in jobs:
        # Skills filter (OR logic: if job matches any of the filter skills, keep it)
        if skills:
            job_skills = [s.strip().lower() for s in job.skills.split(",") if s.strip()]
            filter_skills = [s.strip().lower() for s in skills if s.strip()]
            if not any(fs in job_skills for fs in filter_skills):
                continue
                
        # Salary range filter
        if min_salary is not None or max_salary is not None:
            numeric_salary = extract_salary_num(job.salary)
            if min_salary is not None and numeric_salary < min_salary:
                continue
            if max_salary is not None and numeric_salary > max_salary:
                continue
                
        filtered_jobs.append(job)
        
    return filtered_jobs

@router.get("/saved", response_model=List[SavedJobResponse])
def get_saved_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SavedJob).filter(SavedJob.user_id == current_user.id).all()

@router.get("/bookmarked", response_model=List[BookmarkResponse])
def get_bookmarked_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. New jobs today: created in the last 24h
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    new_jobs_today = db.query(Job).filter(Job.created_at >= one_day_ago).count()
    
    # 2. Saved jobs count
    saved_jobs_count = db.query(SavedJob).filter(SavedJob.user_id == current_user.id).count()
    
    # 3. Applied jobs count (distinct jobIds in history with action = 'Applied')
    applied_jobs_count = db.query(JobHistory).filter(
        JobHistory.user_id == current_user.id,
        JobHistory.action == "Applied"
    ).distinct(JobHistory.job_id).count()
    
    # 4. Resume uploaded flag
    resume_uploaded = db.query(Resume).filter(Resume.user_id == current_user.id).count() > 0
    
    # 5. Recent 3 jobs
    recent_jobs = db.query(Job).order_by(Job.created_at.desc()).limit(3).all()
    
    return {
        "new_jobs_today": new_jobs_today,
        "saved_jobs_count": saved_jobs_count,
        "applied_jobs_count": applied_jobs_count,
        "resume_uploaded": resume_uploaded,
        "recent_jobs": recent_jobs
    }

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    # Log "Viewed" action in job history on detail access
    # Avoid duplicate view spam by checking if viewed within past hour
    recent_view = db.query(JobHistory).filter(
        JobHistory.user_id == current_user.id,
        JobHistory.job_id == job_id,
        JobHistory.action == "Viewed",
        JobHistory.date >= datetime.utcnow() - timedelta(hours=1)
    ).first()
    
    if not recent_view:
        view_log = JobHistory(user_id=current_user.id, job_id=job_id, action="Viewed")
        db.add(view_log)
        db.commit()
        
    return job

@router.post("/{job_id}/save", response_model=SavedJobResponse)
def save_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    existing = db.query(SavedJob).filter(
        SavedJob.user_id == current_user.id,
        SavedJob.job_id == job_id
    ).first()
    
    if not existing:
        saved = SavedJob(user_id=current_user.id, job_id=job_id)
        db.add(saved)
        
        # Log to job history
        history = JobHistory(user_id=current_user.id, job_id=job_id, action="Saved")
        db.add(history)
        
        db.commit()
        db.refresh(saved)
        return saved
    return existing

@router.delete("/{job_id}/save")
def unsave_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.query(SavedJob).filter(
        SavedJob.user_id == current_user.id,
        SavedJob.job_id == job_id
    ).first()
    
    if saved:
        db.delete(saved)
        db.commit()
    return {"message": "Job unsaved successfully"}

@router.post("/{job_id}/bookmark", response_model=BookmarkResponse)
def bookmark_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.job_id == job_id
    ).first()
    
    if not existing:
        bookmarked = Bookmark(user_id=current_user.id, job_id=job_id)
        db.add(bookmarked)
        db.commit()
        db.refresh(bookmarked)
        return bookmarked
    return existing

@router.delete("/{job_id}/bookmark")
def unbookmark_job(job_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookmarked = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.job_id == job_id
    ).first()
    
    if bookmarked:
        db.delete(bookmarked)
        db.commit()
    return {"message": "Job unbookmarked successfully"}
