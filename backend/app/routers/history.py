from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, JobHistory, Job
from ..schemas import JobHistoryResponse, JobHistoryCreate
from ..auth.security import get_current_user

router = APIRouter(prefix="/api/history", tags=["Activity History"])

@router.get("", response_model=List[JobHistoryResponse])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> List[JobHistoryResponse]:
    return db.query(JobHistory).filter(JobHistory.user_id == current_user.id).order_by(JobHistory.date.desc()).all()

@router.post("", response_model=JobHistoryResponse)
def add_history_entry(
    entry: JobHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == entry.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    db_history = JobHistory(
        user_id=current_user.id,
        job_id=entry.job_id,
        action=entry.action
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history
