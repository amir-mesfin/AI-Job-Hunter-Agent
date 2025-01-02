import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure backend/instance exists for SQLite db storage
DATABASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance"))
os.makedirs(DATABASE_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DATABASE_DIR, 'jobs.db')}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_schema():
    """Add Phase 2/3 columns to existing SQLite tables without wiping data."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "jobs" in tables:
            cols = {c["name"] for c in inspector.get_columns("jobs")}
            if "source" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN source VARCHAR DEFAULT 'seed'"))
            if "external_id" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN external_id VARCHAR"))
        if "profiles" in tables:
            cols = {c["name"] for c in inspector.get_columns("profiles")}
            if "skills" not in cols:
                conn.execute(text("ALTER TABLE profiles ADD COLUMN skills VARCHAR"))
        if "resumes" in tables:
            cols = {c["name"] for c in inspector.get_columns("resumes")}
            if "extracted_text" not in cols:
                conn.execute(text("ALTER TABLE resumes ADD COLUMN extracted_text TEXT"))
