import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Profile, Resume
from ..schemas import ProfileResponse, ProfileUpdate, ResumeResponse, ResumeUploadResponse
from ..auth.security import get_current_user
from ..ai import read_resume_file, extract_profile_from_resume, apply_resume_fields_to_profile

router = APIRouter(prefix="/api/profile", tags=["Profile & CV"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
        
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/resume", response_model=ResumeUploadResponse)
def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate extension
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing."
        )
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Only PDF and DOCX are allowed."
        )
    
    # Store file locally
    filename = f"user_{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
        
    file_size = os.path.getsize(file_path)
    file_url = f"/api/uploads/{filename}"
    
    # Clear older resumes (MVP supports one master CV)
    existing_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    for er in existing_resumes:
        db.delete(er)
        try:
            old_filename = er.file_url.split("/")[-1]
            old_path = os.path.join(UPLOAD_DIR, old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            pass
            
    file_type = "PDF" if ext == ".pdf" else "DOCX"
    extracted = read_resume_file(file_path, file_type)

    db_resume = Resume(
        user_id=current_user.id,
        file_url=file_url,
        file_type=file_type,
        file_size=file_size,
        original_filename=file.filename,
        extracted_text=extracted or None,
    )
    db.add(db_resume)

    # Fill Professional details from CV text (LinkedIn, GitHub, phone, skills, …)
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    fields = extract_profile_from_resume(extracted or "")
    # Prefer CV values on upload so form reflects the new document
    filled = apply_resume_fields_to_profile(profile, fields, overwrite=True)

    db.commit()
    db.refresh(db_resume)
    db.refresh(profile)

    return {
        "id": db_resume.id,
        "user_id": db_resume.user_id,
        "file_url": db_resume.file_url,
        "uploaded_at": db_resume.uploaded_at,
        "file_type": db_resume.file_type,
        "file_size": db_resume.file_size,
        "original_filename": db_resume.original_filename,
        "extracted_text": db_resume.extracted_text,
        "profile": profile,
        "filled_fields": filled,
    }


@router.post("/resume/apply-to-profile", response_model=ProfileResponse)
def apply_resume_to_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-parse the saved master CV and fill empty Professional details fields."""
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet.")

    text = resume.extracted_text or ""
    if not text:
        filename = resume.file_url.split("/")[-1]
        path = os.path.join(UPLOAD_DIR, filename)
        text = read_resume_file(path, resume.file_type)
        resume.extracted_text = text or None

    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    fields = extract_profile_from_resume(text or "")
    apply_resume_fields_to_profile(profile, fields, overwrite=False)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/resume", response_model=ResumeResponse)
def get_resume(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).first()
    if not resume:
        raise HTTPException(
            status_code=404,
            detail="No resume uploaded yet."
        )
    return resume
