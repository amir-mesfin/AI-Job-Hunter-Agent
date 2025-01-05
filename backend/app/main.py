import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, SessionLocal, migrate_schema
from .models import Job
from .routers import auth, profile, jobs, history, collectors, ai
from .collectors.runner import ensure_default_sources

# Make sure migrations/tables are created
Base.metadata.create_all(bind=engine)
migrate_schema()

app = FastAPI(
    title="AI Job Hunter Agent API",
    description="Backend for AI Evaluation Job Assistant — Phases 1–3",
    version="3.0.0"
)

# Setup CORS to allow Next.js frontend (default port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists and mount static server
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(history.router)
app.include_router(collectors.router)
app.include_router(ai.router)

# Seed default Phase 2 job sources
_db_boot = SessionLocal()
try:
    ensure_default_sources(_db_boot)
finally:
    _db_boot.close()

# Seed database on startup if empty
def seed_jobs():
    db: Session = SessionLocal()
    try:
        if db.query(Job).count() == 0:
            print("[INFO] Seeding initial AI evaluation jobs database...")
            jobs_to_seed = [
                Job(
                    company="Invisible Technologies",
                    title="AI Coding Expert",
                    location="Remote (Worldwide)",
                    salary="$40/hour",
                    remote="Remote",
                    description="Invisible Technologies is seeking AI Coding Experts to train advanced large language models on coding tasks. You will write code, solve problems, explain code, and execute evaluations.\n\nRequirements:\n- Strong Python and Git\n- Comfortable reviewing LLM-generated code\n- Clear written communication\n\nBenefits:\n- Flexible hours\n- Competitive hourly pay",
                    skills="Python, Git, JavaScript, React, SQL, Linux",
                    apply_url="https://www.invisible.co/careers",
                    experience_level="Mid-Level",
                    country="Remote Worldwide"
                ),
                Job(
                    company="Scale AI",
                    title="AI Trainer (Software Engineering)",
                    location="Remote (USA Only)",
                    salary="$45/hour",
                    remote="Remote",
                    description="Train next-generation AI models by evaluating their code outputs, identifying bugs, and writing high-quality ground-truth source code.",
                    skills="Python, Java, C++, Git, Algorithms",
                    apply_url="https://scale.com/careers",
                    experience_level="Senior",
                    country="USA"
                ),
                Job(
                    company="Outlier AI",
                    title="AI Math Evaluator",
                    location="Remote",
                    salary="$35/hour",
                    remote="Remote",
                    description="Evaluate LLM mathematical reasoning, write step-by-step math proofs, and translate technical specifications into prompt responses.",
                    skills="Python, Math, LaTeX, Prompting",
                    apply_url="https://outlier.ai/careers",
                    experience_level="Junior",
                    country="USA"
                ),
                Job(
                    company="DataAnnotation",
                    title="Software Developer for AI Training",
                    location="Remote (Canada Only)",
                    salary="$40/hour",
                    remote="Remote",
                    description="Work on flexible hourly projects evaluating and training AI models. Set your own hours, take coding assessments, and verify accuracy of responses.",
                    skills="Python, JavaScript, SQL, HTML, Git",
                    apply_url="https://www.dataannotation.tech",
                    experience_level="Entry Level",
                    country="Canada"
                ),
                Job(
                    company="Mindrift",
                    title="AI Prompt Engineer & Writer",
                    location="London (Hybrid)",
                    salary="$30/hour",
                    remote="Hybrid",
                    description="Join Mindrift to write prompt scenarios, evaluate LLM outputs for safety, creativity, and tone, and optimize prompts for domain-specific models.",
                    skills="Prompting, NLP, Writing, Python, Git",
                    apply_url="https://mindrift.ai",
                    experience_level="Junior",
                    country="United Kingdom"
                ),
                Job(
                    company="OpenAI",
                    title="LLM Evaluation Specialist",
                    location="San Francisco / Remote",
                    salary="$55/hour",
                    remote="Hybrid",
                    description="Evaluate model responses for factuality, safety, and usefulness. Design rubrics and score outputs across coding and reasoning tasks.",
                    skills="Python, Prompting, NLP, Research, Writing",
                    apply_url="https://openai.com/careers",
                    experience_level="Mid-Level",
                    country="USA"
                ),
                Job(
                    company="Anthropic",
                    title="AI Safety Data Annotator",
                    location="Remote (Worldwide)",
                    salary="$50/hour",
                    remote="Remote",
                    description="Help train Claude by reviewing responses for harmlessness and honesty. Flag policy violations and propose safer alternative completions.",
                    skills="Writing, Research, Prompting, Ethics, Python",
                    apply_url="https://www.anthropic.com/careers",
                    experience_level="Junior",
                    country="Remote Worldwide"
                ),
                Job(
                    company="Mercor",
                    title="Python Expert — AI Interviews",
                    location="Remote",
                    salary="$70/hour",
                    remote="Remote",
                    description="Conduct structured technical interviews and evaluate AI-assisted coding solutions. Strong Python and system design background preferred.",
                    skills="Python, System Design, Algorithms, Docker, Linux",
                    apply_url="https://mercor.com",
                    experience_level="Senior",
                    country="Remote Worldwide"
                ),
                Job(
                    company="Turing",
                    title="AI Coding Evaluator",
                    location="Berlin (On-site)",
                    salary="$38/hour",
                    remote="On-site",
                    description="On-site evaluation of coding model outputs. Compare solutions, write golden answers, and score for correctness and style.",
                    skills="Python, JavaScript, Git, SQL",
                    apply_url="https://www.turing.com",
                    experience_level="Mid-Level",
                    country="Germany"
                ),
                Job(
                    company="Surge AI",
                    title="RLHF Preference Ranker",
                    location="Remote (UK)",
                    salary="$32/hour",
                    remote="Remote",
                    description="Rank model completions for preference learning. Focus on clarity, helpfulness, and domain accuracy for technical prompts.",
                    skills="Writing, Prompting, NLP, Git",
                    apply_url="https://surgehq.ai",
                    experience_level="Entry Level",
                    country="United Kingdom"
                ),
            ]
            for job in jobs_to_seed:
                db.add(job)
            db.commit()
            print("[INFO] Seeded 10 jobs successfully.")
    except Exception as e:
        print(f"[ERROR] Seeding failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

seed_jobs()

@app.get("/")
def read_root():
    return {"message": "AI Job Hunter Agent API is running!"}
