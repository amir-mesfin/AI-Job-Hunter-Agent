from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    history = relationship("JobHistory", back_populates="user", cascade="all, delete-orphan")
    generated_docs = relationship("GeneratedDoc", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    phone = Column(String, nullable=True)
    country = Column(String, nullable=True)
    github = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(String, nullable=True)  # comma-separated extracted/manual skills

    user = relationship("User", back_populates="profile")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    original_filename = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="resumes")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, nullable=False)
    title = Column(String, nullable=False)
    location = Column(String, nullable=False)
    salary = Column(String, nullable=False)
    remote = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    skills = Column(String, nullable=False)
    apply_url = Column(String, nullable=False)
    experience_level = Column(String, nullable=False)
    country = Column(String, nullable=False)
    source = Column(String, nullable=False, default="seed")  # seed | greenhouse | lever | rss | manual
    external_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")
    bookmarked_by = relationship("Bookmark", back_populates="job", cascade="all, delete-orphan")
    history_records = relationship("JobHistory", back_populates="job", cascade="all, delete-orphan")
    generated_docs = relationship("GeneratedDoc", back_populates="job", cascade="all, delete-orphan")

class JobSource(Base):
    """Phase 2: configured boards / feeds to pull jobs from."""
    __tablename__ = "job_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # greenhouse | lever | rss
    board_token = Column(String, nullable=False)  # board slug, company slug, or feed URL
    company_name = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    last_synced_at = Column(DateTime, nullable=True)
    last_sync_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by")

class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="bookmarks")
    job = relationship("Job", back_populates="bookmarked_by")

class JobHistory(Base):
    __tablename__ = "job_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="history")
    job = relationship("Job", back_populates="history_records")

class GeneratedDoc(Base):
    """Phase 3: AI-generated cover letters / tailored resume snippets."""
    __tablename__ = "generated_docs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    doc_type = Column(String, nullable=False)  # cover_letter | tailored_resume | skill_extract
    content = Column(Text, nullable=False)
    match_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="generated_docs")
    job = relationship("Job", back_populates="generated_docs")
