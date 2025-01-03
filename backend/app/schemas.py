from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# Auth Schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    name: str
    email: str

# Profile Schemas
class ProfileBase(BaseModel):
    phone: Optional[str] = None
    country: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    experience: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    user_id: int

    class Config:
        from_attributes = True

# User response schemas
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    profile: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True

# Resume Schemas
class ResumeResponse(BaseModel):
    id: int
    user_id: int
    file_url: str
    uploaded_at: datetime
    file_type: str
    file_size: int
    original_filename: str
    extracted_text: Optional[str] = None

    class Config:
        from_attributes = True

class ResumeUploadResponse(ResumeResponse):
    """Returned after CV upload — includes profile fields filled from the CV."""
    profile: Optional[ProfileResponse] = None
    filled_fields: List[str] = []

# Job Schemas
class JobResponse(BaseModel):
    id: int
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
    source: str = "seed"
    external_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    company: str
    title: str
    location: str
    salary: str = "Competitive"
    remote: str = "Remote"
    description: str
    skills: str = "Python, Git"
    apply_url: str
    experience_level: str = "Mid-Level"
    country: str = "Remote Worldwide"

# Saved & Bookmark Schemas
class SavedJobResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True

class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True

# History Schemas
class JobHistoryResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    action: str
    date: datetime
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True

class JobHistoryCreate(BaseModel):
    job_id: int
    action: str

# Dashboard Stats Response
class DashboardStats(BaseModel):
    new_jobs_today: int
    saved_jobs_count: int
    applied_jobs_count: int
    resume_uploaded: bool
    recent_jobs: List[JobResponse]

# Phase 2 — collectors
class JobSourceCreate(BaseModel):
    name: str
    source_type: str
    board_token: str
    company_name: Optional[str] = None
    enabled: bool = True

class JobSourceResponse(BaseModel):
    id: int
    name: str
    source_type: str
    board_token: str
    company_name: Optional[str] = None
    enabled: bool
    last_synced_at: Optional[datetime] = None
    last_sync_count: int = 0
    last_error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SyncResult(BaseModel):
    source_id: int
    ok: bool = True
    created: int = 0
    updated: int = 0
    total: int = 0
    error: Optional[str] = None

# Phase 3 — AI
class MatchRequest(BaseModel):
    job_id: Optional[int] = None
    skills: Optional[List[str]] = None
    limit: int = 50

class MatchResult(BaseModel):
    job_id: int
    title: str
    company: str
    score: float
    matched_skills: List[str]
    missing_skills: List[str]
    apply_url: str
    remote: str
    salary: str

class CoverLetterRequest(BaseModel):
    job_id: int

class TailorResumeRequest(BaseModel):
    job_id: int

class GeneratedDocResponse(BaseModel):
    id: int
    user_id: int
    job_id: Optional[int] = None
    doc_type: str
    content: str
    match_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SkillExtractResponse(BaseModel):
    skills: List[str]
    source: str
    resume_chars: int
