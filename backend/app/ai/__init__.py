"""Phase 3 — AI helpers with OpenAI when available, heuristic fallbacks otherwise."""
from __future__ import annotations

import os
import re
from collections import Counter
from typing import List, Optional, Tuple

SKILL_CATALOG = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git",
    "Docker", "Linux", "Java", "C++", "Go", "Rust", "NLP", "Prompting",
    "PyTorch", "TensorFlow", "Kubernetes", "AWS", "Azure", "GCP",
    "Algorithms", "LaTeX", "HTML", "CSS", "Django", "FastAPI", "Flask",
    "Pandas", "NumPy", "Machine Learning", "Deep Learning", "RLHF",
    "Communication", "Writing", "Research", "System Design",
]


def extract_skills(text: str) -> List[str]:
    found = []
    for skill in SKILL_CATALOG:
        if re.search(rf"\b{re.escape(skill)}\b", text or "", re.I):
            found.append(skill)
    seen = set()
    out = []
    for s in found:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


def extract_profile_from_resume(text: str) -> dict:
    """Pull common profile fields from CV text (best-effort heuristics)."""
    raw = text or ""
    out: dict = {}

    # LinkedIn
    m = re.search(
        r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_\-%/]+",
        raw,
        re.I,
    )
    if m:
        url = m.group(0).rstrip("/.")
        if not url.lower().startswith("http"):
            url = "https://" + url
        out["linkedin"] = url

    # GitHub
    m = re.search(
        r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_\-]+/?",
        raw,
        re.I,
    )
    if m:
        url = m.group(0).rstrip("/.")
        # skip github.com/orgs style noise
        if not re.search(r"github\.com/(features|pricing|about|login)\b", url, re.I):
            if not url.lower().startswith("http"):
                url = "https://" + url
            out["github"] = url

    # Portfolio / personal site (exclude linkedin/github/mailto)
    for m in re.finditer(r"https?://[^\s)>\]]+", raw, re.I):
        url = m.group(0).rstrip(".,);]")
        low = url.lower()
        if any(x in low for x in ("linkedin.com", "github.com", "mailto:", "google.com", "schemas.")):
            continue
        out["portfolio"] = url
        break

    # Phone
    m = re.search(
        r"(?:(?:phone|tel|mobile|cell)[:\s]*)?"
        r"(\+?\d[\d\s().-]{7,}\d)",
        raw,
        re.I,
    )
    if m:
        phone = re.sub(r"\s+", " ", m.group(1)).strip()
        digits = re.sub(r"\D", "", phone)
        if 8 <= len(digits) <= 15:
            out["phone"] = phone

    # Experience years
    m = re.search(
        r"(\d{1,2})\+?\s*(?:\+|plus\s+)?(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\.?)",
        raw,
        re.I,
    )
    if m:
        out["experience"] = f"{m.group(1)} years"
    else:
        m = re.search(r"(?:experience|exp\.?)[:\s]+([^\n]{3,60})", raw, re.I)
        if m:
            out["experience"] = m.group(1).strip(" -•\t")

    # Country / location hints
    m = re.search(
        r"(?:location|based in|country|address)[:\s]+([A-Za-z][A-Za-z .,'-]{2,40})",
        raw,
        re.I,
    )
    if m:
        out["country"] = m.group(1).strip(" .,")
    else:
        for country in (
            "United States", "USA", "Canada", "United Kingdom", "UK", "Germany",
            "France", "India", "Ethiopia", "Nigeria", "Kenya", "Australia",
            "Netherlands", "Remote",
        ):
            if re.search(rf"\b{re.escape(country)}\b", raw, re.I):
                out["country"] = country
                break

    # Bio / summary — first summary/about/profile block
    m = re.search(
        r"(?:summary|profile|about(?:\s+me)?|objective|professional\s+summary)\s*[:\n]+(.{40,420})",
        raw,
        re.I | re.S,
    )
    if m:
        bio = re.sub(r"\s+", " ", m.group(1)).strip()
        bio = re.split(r"(?:experience|education|skills|projects)\b", bio, maxsplit=1, flags=re.I)[0]
        out["bio"] = bio[:500].strip()

    skills = extract_skills(raw)
    if skills:
        out["skills"] = ", ".join(skills)

    return out


def apply_resume_fields_to_profile(profile, fields: dict, *, overwrite: bool = False) -> list:
    """Write extracted CV fields onto a Profile ORM object. Returns list of updated keys."""
    updated = []
    for key, value in fields.items():
        if not value:
            continue
        current = getattr(profile, key, None)
        if key == "skills" and current:
            existing = [s.strip() for s in current.split(",") if s.strip()]
            incoming = [s.strip() for s in str(value).split(",") if s.strip()]
            merged = list(dict.fromkeys([*existing, *incoming]))
            new_val = ", ".join(merged)
            if new_val != current:
                setattr(profile, key, new_val)
                updated.append(key)
            continue
        if overwrite or not (current and str(current).strip()):
            setattr(profile, key, value)
            updated.append(key)
    return updated


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z+#.]{1,}", (text or "").lower())


def semantic_similarity(a: str, b: str) -> float:
    """Lightweight bag-of-words cosine similarity (no heavy ML deps)."""
    ta, tb = _tokenize(a), _tokenize(b)
    if not ta or not tb:
        return 0.0
    ca, cb = Counter(ta), Counter(tb)
    keys = set(ca) | set(cb)
    dot = sum(ca[k] * cb[k] for k in keys)
    na = sum(v * v for v in ca.values()) ** 0.5
    nb = sum(v * v for v in cb.values()) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def match_score(
    user_skills: List[str],
    job_skills: str,
    job_title: str = "",
    job_desc: str = "",
    user_bio: str = "",
    resume_text: str = "",
) -> Tuple[float, List[str], List[str]]:
    user_set = {s.strip().lower() for s in user_skills if s.strip()}
    job_list = [s.strip() for s in (job_skills or "").split(",") if s.strip()]
    job_from_text = extract_skills(f"{job_title} {job_desc}")
    for s in job_from_text:
        if s not in job_list:
            job_list.append(s)

    overlap = sorted({s for s in job_list if s.lower() in user_set}, key=str.lower)
    missing = sorted({s for s in job_list if s.lower() not in user_set}, key=str.lower)

    jacc = _jaccard(user_set, {s.lower() for s in job_list})
    title_boost = 0.05 if any(
        k in (job_title or "").lower() for k in ("ai", "ml", "llm", "evaluat", "annotat")
    ) else 0.0
    profile_blob = " ".join(user_skills) + " " + (user_bio or "") + " " + (resume_text or "")[:2000]
    job_blob = f"{job_title} {job_skills} {job_desc}"
    semantic = semantic_similarity(profile_blob, job_blob)
    score = min(
        100.0,
        round((jacc * 55 + semantic * 30 + title_boost * 100 + min(len(overlap) * 3, 12)), 1),
    )
    return score, overlap, missing


def build_cover_letter(
    name: str,
    job_title: str,
    company: str,
    user_skills: List[str],
    experience: str = "",
    bio: str = "",
    job_description: str = "",
) -> str:
    skills_line = ", ".join(user_skills[:6]) if user_skills else "software engineering and AI evaluation"
    exp_line = experience or "hands-on experience with AI systems"
    bio_bit = f" {bio.strip()}" if bio else ""

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        generated = _openai_text(
            system="You write concise, professional cover letters for AI evaluation job applicants. Max 220 words. No markdown.",
            user=(
                f"Write a cover letter for {name} applying to {job_title} at {company}. "
                f"Experience: {exp_line}. Skills: {skills_line}.{bio_bit} "
                f"Job snippet: {job_description[:800]}"
            ),
        )
        if generated:
            return generated

    return (
        f"Dear {company} Hiring Team,\n\n"
        f"I am writing to apply for the {job_title} role. With {exp_line}, "
        f"I am excited to contribute to your AI evaluation and model-quality work.\n\n"
        f"My strongest skills include {skills_line}. I am comfortable reviewing model outputs, "
        f"writing clear rationales, and producing high-quality reference solutions under flexible schedules."
        f"{bio_bit}\n\n"
        f"I would welcome the opportunity to support {company}'s evaluation pipeline and help raise the quality "
        f"of your models. Thank you for your time and consideration.\n\n"
        f"Sincerely,\n{name}"
    )


def tailor_resume_bullets(
    name: str,
    job_title: str,
    company: str,
    user_skills: List[str],
    experience: str = "",
    resume_excerpt: str = "",
) -> str:
    skills = user_skills[:8] or ["Python", "Git", "Communication"]
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        generated = _openai_text(
            system="You rewrite resume bullets tailored to a target AI evaluation job. Return 5-7 bullet points only.",
            user=(
                f"Candidate: {name}. Target: {job_title} at {company}. "
                f"Experience: {experience}. Skills: {', '.join(skills)}. "
                f"Resume excerpt: {resume_excerpt[:1500]}"
            ),
        )
        if generated:
            return generated

    bullets = [
        f"Evaluated AI/LLM outputs for correctness, clarity, and safety aligned with {company} {job_title} expectations.",
        f"Applied {', '.join(skills[:3])} to produce reference solutions and structured review notes.",
        f"Documented failure modes and edge cases to improve annotation guidelines and model rubrics.",
        f"Collaborated asynchronously on coding and reasoning tasks with consistent quality standards.",
        f"Maintained {experience or 'professional'} delivery cadence suitable for flexible hourly evaluation work.",
    ]
    if resume_excerpt:
        bullets.append(
            "Mapped prior project experience to evaluation workflows emphasizing reproducibility and clear written justification."
        )
    return "\n".join(f"• {b}" for b in bullets)


def _openai_text(system: str, user: str) -> Optional[str]:
    try:
        import httpx

        key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.6,
            },
            timeout=45.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def read_resume_file(path: str, file_type: str) -> str:
    """Best-effort text extraction from PDF/DOCX."""
    try:
        if file_type.upper() == "PDF" or path.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader

                reader = PdfReader(path)
                parts = []
                for page in reader.pages[:20]:
                    parts.append(page.extract_text() or "")
                return "\n".join(parts).strip()
            except Exception:
                with open(path, "rb") as f:
                    raw = f.read(50000)
                return re.sub(rb"[^\x20-\x7E\n]", b" ", raw).decode("latin-1", errors="ignore")
        if file_type.upper() == "DOCX" or path.lower().endswith(".docx"):
            try:
                import docx

                doc = docx.Document(path)
                return "\n".join(p.text for p in doc.paragraphs).strip()
            except Exception:
                return ""
    except Exception:
        return ""
    return ""


def profile_skill_list(profile_skills: Optional[str], resume_text: str = "", bio: str = "") -> List[str]:
    skills: List[str] = []
    if profile_skills:
        skills.extend([s.strip() for s in profile_skills.split(",") if s.strip()])
    skills.extend(extract_skills(f"{resume_text}\n{bio}"))
    seen = set()
    out = []
    for s in skills:
        k = s.lower()
        if k not in seen:
            seen.add(k)
            out.append(s)
    return out
