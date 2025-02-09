# AI Job Hunter Agent

Full-stack assistant for **AI evaluation** jobs — Phases 1–3.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite (SQLAlchemy) — swap to PostgreSQL later |
| Auth | JWT + bcrypt |
| Resume storage | Local `backend/uploads/` |
| Collectors | Greenhouse, Lever, RSS (with offline demo fallback) |
| AI | Heuristic matching + optional OpenAI (`OPENAI_API_KEY`) |

## Phases

### Phase 1 — Foundation
Auth, profile, master CV, dashboard, search/filters, save/bookmark, apply (external), history.

### Phase 2 — Job collectors
- Configure Greenhouse / Lever / Ashby / RSS sources
- Sync into the local jobs DB (deduped by `external_id` / URL)
- Manual job create API
- UI: **Collectors** page → Sync all

### Phase 3 — AI assistant
- Skill extraction from CV/profile
- Job match scores (skill overlap + semantic cosine) + skill gaps
- Cover letter generation
- Tailored resume bullets
- Dedicated **Saved**, **History**, and **AI Match** pages
- Uses OpenAI when `OPENAI_API_KEY` is set; otherwise high-quality templates

## Quick start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional LLM:

```bash
export OPENAI_API_KEY=sk-...
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Tests

```bash
cd backend
source venv/bin/activate
PYTHONPATH=. pytest tests/ -v
```

## User flow

Sign up → Profile + master CV → **Collectors** sync (optional) → Search jobs → **AI Match** → Cover letter / tailor CV → Apply on company site → Track history.

## Project layout

```
backend/app/
  collectors/     # Phase 2 Greenhouse / Lever / RSS
  ai/             # Phase 3 matching & generation
  routers/        # auth, profile, jobs, history, collectors, ai
frontend/app/
  dashboard/ jobs/ profile/ ai/ collectors/ auth/
```

<!-- progress 2025-01-15 -->

<!-- progress 2025-01-17 -->

<!-- progress 2025-01-19 -->

<!-- progress 2025-01-22 -->

<!-- progress 2025-01-25 -->

<!-- progress 2025-01-27 -->

<!-- progress 2025-01-31 -->

<!-- progress 2025-02-03 -->

<!-- progress 2025-02-06 -->

<!-- progress 2025-02-09 -->
