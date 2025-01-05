import os
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Force offline collectors so tests never hang on external HTTP
os.environ["COLLECTORS_OFFLINE"] = "1"

from app.database import Base, get_db
from app.main import app
from app.models import Job

# Set up test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed mock jobs for tests
    if db.query(Job).count() == 0:
        jobs = [
            Job(
                company="Invisible Technologies",
                title="AI Coding Expert",
                location="Remote",
                salary="$35/hour",
                remote="Remote",
                description="We need coder trainers.",
                skills="Python, Git, React",
                apply_url="https://invisible.co",
                experience_level="Mid-Level",
                country="Remote Worldwide"
            ),
            Job(
                company="Scale AI",
                title="AI Trainer",
                location="USA",
                salary="$45/hour",
                remote="Remote",
                description="Train model logic.",
                skills="Python, Algorithm",
                apply_url="https://scale.ai",
                experience_level="Senior",
                country="USA"
            )
        ]
        for job in jobs:
            db.add(job)
        db.commit()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
            except Exception:
                pass

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_auth_flow(client):
    # Registration
    response = client.post("/api/auth/register", json={
        "name": "Amir Mesfin",
        "email": "amir.mesfin@example.com",
        "password": "strongpassword123"
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Amir Mesfin"
    assert response.json()["email"] == "amir.mesfin@example.com"
    
    # Duplicate email registration error
    response = client.post("/api/auth/register", json={
        "name": "Amir Mesfin",
        "email": "amir.mesfin@example.com",
        "password": "strongpassword123"
    })
    assert response.status_code == 400
    
    # Login
    response = client.post("/api/auth/login", json={
        "email": "amir.mesfin@example.com",
        "password": "strongpassword123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Profile
    response = client.get("/api/profile", headers=headers)
    assert response.status_code == 200
    assert response.json()["phone"] is None
    
    # Update Profile
    response = client.put("/api/profile", json={
        "phone": "+251911223344",
        "country": "Ethiopia",
        "linkedin": "linkedin.com/in/amir",
        "experience": "2 Years"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["country"] == "Ethiopia"
    assert response.json()["experience"] == "2 Years"
    
    # Upload Resume
    pdf_content = b"%PDF-1.4 mock content"
    file = io.BytesIO(pdf_content)
    response = client.post("/api/profile/resume", files={
        "file": ("master_cv.pdf", file, "application/pdf")
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["file_type"] == "PDF"
    assert response.json()["original_filename"] == "master_cv.pdf"

    # Forgot + reset password
    forgot = client.post("/api/auth/forgot-password", json={
        "email": "amir.mesfin@example.com"
    })
    assert forgot.status_code == 200
    reset_link = forgot.json().get("debug_reset_link")
    assert reset_link
    reset_token = reset_link.split("token=")[-1]
    reset = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "new_password": "newstrongpassword"
    })
    assert reset.status_code == 200
    login_new = client.post("/api/auth/login", json={
        "email": "amir.mesfin@example.com",
        "password": "newstrongpassword"
    })
    assert login_new.status_code == 200

def test_jobs_flow(client):
    # Register & login
    client.post("/api/auth/register", json={
        "name": "Tester",
        "email": "test@example.com",
        "password": "pw"
    })
    login_res = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "pw"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    
    # Get Jobs (all)
    response = client.get("/api/jobs", headers=headers)
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) >= 2
    
    job_id = jobs[0]["id"]
    
    # Get Job detail (triggers Viewed action)
    detail_res = client.get(f"/api/jobs/{job_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == jobs[0]["title"]
    
    # Save Job
    save_res = client.post(f"/api/jobs/{job_id}/save", headers=headers)
    assert save_res.status_code == 200
    
    # Verify Saved List
    saved_list_res = client.get("/api/jobs/saved", headers=headers)
    assert len(saved_list_res.json()) == 1
    assert saved_list_res.json()[0]["job_id"] == job_id
    
    # Bookmark Job
    b_res = client.post(f"/api/jobs/{job_id}/bookmark", headers=headers)
    assert b_res.status_code == 200
    
    # Track History + Apply
    hist_res = client.get("/api/history", headers=headers)
    assert len(hist_res.json()) >= 1
    assert hist_res.json()[0]["job_id"] == job_id

    # Phase 2: collectors list + sync
    sources = client.get("/api/collectors/sources", headers=headers)
    assert sources.status_code == 200
    assert len(sources.json()) >= 1
    sync = client.post("/api/collectors/sync", headers=headers)
    assert sync.status_code == 200
    assert isinstance(sync.json(), list)

    # Phase 3: AI match + cover letter
    client.put("/api/profile", json={"skills": "Python, Git, React"}, headers=headers)
    match = client.post("/api/ai/match", json={"limit": 10}, headers=headers)
    assert match.status_code == 200
    assert len(match.json()) >= 1
    assert "score" in match.json()[0]
    cover = client.post("/api/ai/cover-letter", json={"job_id": job_id}, headers=headers)
    assert cover.status_code == 200
    assert cover.json()["doc_type"] == "cover_letter"
    assert len(cover.json()["content"]) > 40
    tailor = client.post("/api/ai/tailor-resume", json={"job_id": job_id}, headers=headers)
    assert tailor.status_code == 200
    assert tailor.json()["doc_type"] == "tailored_resume"
