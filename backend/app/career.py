import json
import os
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI

from app.auth import get_user
from app.database import supabase

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_gemini = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    _gemini = genai.GenerativeModel(GEMINI_MODEL)

# Groq fallback for mock interview using openai/gpt-oss-20b
_groq_interview = None
try:
    _GROQ_KEY = os.getenv("GROQ_API_KEY", "").strip()
    if _GROQ_KEY:
        _groq_interview = OpenAI(
            api_key=_GROQ_KEY,
            base_url="https://api.groq.com/openai/v1",
        )
except Exception:
    pass

_GROQ_INTERVIEW_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


def _extract_groq_text_career(resp_obj) -> str:
    """Extract text from Groq response — handles both Responses API and Chat Completions formats.
    openai/gpt-oss-20b can return either format depending on the SDK call shape."""
    # Shape 1 – Responses API: resp.output is a list of content blocks
    output = getattr(resp_obj, "output", None)
    if output:
        for block in output:
            if getattr(block, "type", None) == "message":
                for c in getattr(block, "content", []):
                    if getattr(c, "type", None) == "output_text":
                        text = getattr(c, "text", None)
                        if text:
                            return text
    # Shape 1b – top-level shorthand
    output_text = getattr(resp_obj, "output_text", None)
    if output_text:
        return output_text
    # Shape 2 – standard Chat Completions
    try:
        return resp_obj.choices[0].message.content or ""
    except Exception:
        return ""


def _call_groq_interview_json(system: str, prompt: str) -> dict:
    """Call Groq (openai/gpt-oss-20b) for interview; returns parsed JSON dict."""
    resp = _groq_interview.chat.completions.create(
        model=_GROQ_INTERVIEW_MODEL,
        messages=[
            {"role": "system", "content": system + "\nRespond ONLY with valid JSON. Do not include markdown or code fences."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=4096,
    )
    text = _extract_groq_text_career(resp).strip()
    if not text:
        return {}
    # Strip accidental markdown fences
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _call_gemini_json(system: str, prompt: str, temperature: float = 0.4) -> dict:
    """Call Gemini with JSON mode; returns parsed dict."""
    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    cfg   = genai.GenerationConfig(temperature=temperature, response_mime_type="application/json")
    resp  = model.generate_content(prompt, generation_config=cfg)
    return json.loads(resp.text or "{}")

@router.get("/paths")
def get_career_paths(user: dict = Depends(get_user)):
    """Get available career paths — fields match frontend CareerPath interface"""
    try:
        career_paths = [
            {
                "id": "frontend-developer",
                "name": "Frontend Developer",
                "description": "Master React, TypeScript, and modern CSS to build world-class UIs.",
                "average_salary": 1200000,
                "projected_growth": 22,
                "match_score": 88
            },
            {
                "id": "full-stack-developer",
                "name": "Full Stack Developer",
                "description": "End-to-end product development — React frontend + Node/Python backend.",
                "average_salary": 1500000,
                "projected_growth": 28,
                "match_score": 92
            },
            {
                "id": "data-scientist",
                "name": "Data Scientist",
                "description": "Python, ML, and statistical modelling for high-demand analytics roles.",
                "average_salary": 1600000,
                "projected_growth": 35,
                "match_score": 78
            },
            {
                "id": "ml-engineer",
                "name": "Machine Learning Engineer",
                "description": "Deploy production ML pipelines with TensorFlow, PyTorch, and cloud platforms.",
                "average_salary": 1800000,
                "projected_growth": 40,
                "match_score": 72
            },
            {
                "id": "devops-engineer",
                "name": "DevOps / Cloud Engineer",
                "description": "AWS, Kubernetes, Docker, and CI/CD for India's fastest-growing cloud sector.",
                "average_salary": 1400000,
                "projected_growth": 32,
                "match_score": 80
            },
            {
                "id": "backend-developer",
                "name": "Backend Developer",
                "description": "Scalable APIs with Python/FastAPI, Node.js, PostgreSQL, and Redis.",
                "average_salary": 1300000,
                "projected_growth": 25,
                "match_score": 85
            },
        ]
        return career_paths
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
def get_job_listings(user: dict = Depends(get_user)):
    """Get job listings — fields match frontend JobListing interface"""
    try:
        jobs = [
            {
                "id": "job-1",
                "title": "Frontend Developer",
                "company": "Flipkart",
                "location": "Bengaluru, KA",
                "remote": True,
                "type": "Full-time",
                "salary_min": 1000000,
                "salary_max": 1800000,
                "posted_at": "2024-03-01",
                "match_score": 91,
                "application_url": "https://careers.flipkart.com",
                "skills": ["React", "TypeScript", "CSS"],
                "career_path_id": "frontend-developer"
            },
            {
                "id": "job-2",
                "title": "Full Stack Engineer",
                "company": "Razorpay",
                "location": "Bengaluru, KA",
                "remote": True,
                "type": "Full-time",
                "salary_min": 1400000,
                "salary_max": 2400000,
                "posted_at": "2024-03-05",
                "match_score": 87,
                "application_url": "https://razorpay.com/jobs",
                "skills": ["React", "Node.js", "PostgreSQL"],
                "career_path_id": "full-stack-developer"
            },
            {
                "id": "job-3",
                "title": "Data Scientist",
                "company": "Swiggy",
                "location": "Bengaluru, KA",
                "remote": False,
                "type": "Full-time",
                "salary_min": 1200000,
                "salary_max": 2200000,
                "posted_at": "2024-03-08",
                "match_score": 82,
                "application_url": "https://careers.swiggy.com",
                "skills": ["Python", "Machine Learning", "SQL"],
                "career_path_id": "data-scientist"
            },
            {
                "id": "job-4",
                "title": "Backend Developer (Python)",
                "company": "Zepto",
                "location": "Mumbai, MH",
                "remote": True,
                "type": "Full-time",
                "salary_min": 1000000,
                "salary_max": 1800000,
                "posted_at": "2024-03-10",
                "match_score": 88,
                "application_url": "https://jobs.zepto.com",
                "skills": ["Python", "FastAPI", "Redis"],
                "career_path_id": "backend-developer"
            },
            {
                "id": "job-5",
                "title": "MLOps Engineer",
                "company": "Ola Electric",
                "location": "Bengaluru, KA",
                "remote": False,
                "type": "Full-time",
                "salary_min": 1500000,
                "salary_max": 2800000,
                "posted_at": "2024-03-12",
                "match_score": 75,
                "application_url": "https://careers.olaelectric.com",
                "skills": ["Python", "Kubernetes", "TensorFlow"],
                "career_path_id": "ml-engineer"
            },
            {
                "id": "job-6",
                "title": "Cloud Infrastructure Engineer",
                "company": "PhonePe",
                "location": "Bengaluru, KA",
                "remote": True,
                "type": "Full-time",
                "salary_min": 1200000,
                "salary_max": 2400000,
                "posted_at": "2024-03-14",
                "match_score": 83,
                "application_url": "https://careers.phonepe.com",
                "skills": ["AWS", "Kubernetes", "Terraform"],
                "career_path_id": "devops-engineer"
            },
        ]
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-tree")
def get_skill_tree(user: dict = Depends(get_user)):
    # This would be dynamically generated based on user's path
    try:
        # Placeholder data
        skill_tree_data = {
            "nodes": [
                {"id": "react", "label": "React"},
                {"id": "hooks", "label": "Hooks"},
                {"id": "state", "label": "State Management"},
            ],
            "edges": [
                {"from": "react", "to": "hooks"},
                {"from": "react", "to": "state"},
            ]
        }
        return skill_tree_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/simulations/{career_path_id}")
def get_simulation(career_path_id: int, user: dict = Depends(get_user)):
    # Placeholder data
    try:
        simulations = {
            1: {"title": "Day in the Life of a Frontend Dev", "tasks": ["Fix a bug", "Build a new feature"]},
            2: {"title": "Day in the Life of a Full Stack Dev", "tasks": ["Deploy a service", "Optimize a query"]}
        }
        simulation = simulations.get(career_path_id)
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        return simulation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_INTERVIEW_TYPE_CONTEXT = {
    "technical": (
        "Focus on DSA, algorithms, data structures, system fundamentals, and coding concepts. "
        "Evaluate answers on correctness, time/space complexity awareness, and code quality."
    ),
    "behavioral": (
        "Focus on STAR-method situational questions about leadership, conflict, failure, and teamwork. "
        "Evaluate how well the candidate structures answers using Situation/Task/Action/Result."
    ),
    "system-design": (
        "Focus on designing large-scale distributed systems. "
        "Probe for requirements clarification, capacity estimation, high-level design, and tradeoffs."
    ),
    "hr": (
        "Focus on culture fit, motivation, salary expectations, career goals, and professional maturity. "
        "Evaluate clarity, professionalism, and self-awareness."
    ),
}


def _build_mock_interview_system(role: str, seniority: str, interview_type: str) -> str:
    type_ctx = _INTERVIEW_TYPE_CONTEXT.get(interview_type, _INTERVIEW_TYPE_CONTEXT["technical"])
    return (
        f"You are a strict professional interviewer for a {seniority} {role} role. "
        f"{type_ctx} "
        "CRITICAL: Evaluate answers honestly — wrong, vague, or incomplete answers MUST receive low scores. "
        "After 6 candidate turns, wrap up with a closing summary and set done=true. "
        "Respond ONLY with valid JSON with EXACTLY these keys:\n"
        "  \"question\": string (next interview question; omit only if done=true)\n"
        "  \"feedback\": string (specific, honest feedback on the candidate's last answer; empty string on first question)\n"
        "  \"tips\": array of 1-2 short actionable tips (empty array on first question)\n"
        "  \"strengths\": array of 1-2 observed strengths (empty array on first question)\n"
        "  \"improvements\": array of 1-2 areas to improve (empty array on first question)\n"
        "  \"scores\": object with keys: confidence (0-100), technical (0-100), communication (0-100), clarity (0-100)\n"
        "    Score rules — apply STRICTLY based on answer quality:\n"
        "      - Wrong / blank / off-topic answer: 10-35\n"
        "      - Vague / partial answer: 36-55\n"
        "      - Correct but shallow: 56-70\n"
        "      - Good with detail: 71-85\n"
        "      - Excellent and thorough: 86-100\n"
        "    Set all scores to 50 for the very first question (no candidate answer yet).\n"
        "  \"closing\": string (final overall assessment; include only when done=true)\n"
        "  \"done\": boolean\n"
        "Do NOT include markdown, prose, or code fences outside JSON."
    )


@router.post("/mock-interview")
def mock_interview(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """AI mock interview — returns next question + real-time per-dimension scores."""
    role      = str(payload.get("role", "Software Engineer"))
    seniority = str(payload.get("seniority", "Mid-level"))
    history   = payload.get("history", [])
    skills    = payload.get("skills", [])
    turn      = len([m for m in history if m.get("role") == "candidate"])

    # Detect interview type from the skills array the frontend sends
    interview_type = "technical"
    for skill in skills:
        if skill in _INTERVIEW_TYPE_CONTEXT:
            interview_type = skill
            break

    system = _build_mock_interview_system(role, seniority, interview_type)
    conversation = "\n".join(
        f"{m.get('role', 'user').upper()}: {m.get('message', '')}" for m in history[-10:]
    )
    prompt = (
        f"Interview so far (candidate turn {turn}):\n{conversation}\n\n"
        "Continue as the interviewer. If turn=0 (no candidate messages yet), "
        "ask the opening question and set all scores to 50."
    )

    def _normalise(parsed: dict) -> dict:
        scores_raw = parsed.get("scores") or {}
        scores = {
            "confidence":    max(0, min(100, int(scores_raw.get("confidence", 50)))),
            "technical":     max(0, min(100, int(scores_raw.get("technical", 50)))),
            "communication": max(0, min(100, int(scores_raw.get("communication", 50)))),
            "clarity":       max(0, min(100, int(scores_raw.get("clarity", 50)))),
        }
        return {
            "question":     parsed.get("question"),
            "feedback":     parsed.get("feedback") or "",
            "tips":         parsed.get("tips") or [],
            "strengths":    parsed.get("strengths") or [],
            "improvements": parsed.get("improvements") or [],
            "scores":       scores,
            "follow_up":    parsed.get("follow_up"),
            "closing":      parsed.get("closing"),
            "done":         bool(parsed.get("done", False)),
        }

    # 1️⃣ Groq — primary (openai/gpt-oss-20b)
    if _groq_interview:
        try:
            parsed = _call_groq_interview_json(system, prompt)
            if parsed:
                return _normalise(parsed)
        except Exception as groq_err:
            print(f"[mock-interview groq error] {groq_err}")

    # 2️⃣ Gemini — secondary
    if _gemini:
        try:
            parsed = _call_gemini_json(system, prompt, temperature=0.4)
            if parsed:
                return _normalise(parsed)
        except Exception as gem_err:
            print(f"[mock-interview gemini error] {gem_err}")

    # 3️⃣ Static fallback
    default_scores = {"confidence": 50, "technical": 50, "communication": 50, "clarity": 50}
    if turn == 0:
        return {
            "question": f"Welcome to your {seniority} {role} interview. Tell me about yourself and your most impactful project.",
            "feedback": "", "tips": [], "strengths": [], "improvements": [],
            "scores": default_scores, "done": False,
        }
    if turn >= 6:
        return {
            "closing": "Thank you for the interview! Check your analytics panel for a detailed performance breakdown.",
            "feedback": "Session complete.", "tips": [], "strengths": [], "improvements": [],
            "scores": default_scores, "done": True,
        }
    fallback_qs = [
        "Walk me through how you would design a scalable REST API.",
        "Describe a challenging bug you fixed and how you debugged it.",
        "How do you ensure code quality in a fast-moving team?",
        "Tell me about a difficult technical tradeoff you've had to make.",
        "How would you approach optimising a slow database query?",
    ]
    return {
        "question":     fallback_qs[min(turn - 1, len(fallback_qs) - 1)],
        "feedback":     "Good effort — try to be more specific and use concrete examples.",
        "tips":         ["Quantify your impact", "Walk through your reasoning step by step"],
        "strengths":    [],
        "improvements": ["Add more technical depth", "Be more specific with examples"],
        "scores":       {"confidence": 50, "technical": 44, "communication": 50, "clarity": 46},
        "done":         False,
    }
        


@router.post("/extract-pdf")
def extract_pdf(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """Extract text from base64 encoded PDF or DOCX."""
    pdf_base64 = payload.get("pdf_base64", "")
    file_type = payload.get("file_type", "pdf").lower()
    
    if not pdf_base64:
        raise HTTPException(status_code=400, detail="pdf_base64 is required")
    try:
        import base64, io
        file_bytes = base64.b64decode(pdf_base64)
        
        if file_type == "docx" or file_type == "doc":
            # Extract DOCX text using standard zipfile and xml parsing
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx:
                xml_content = docx.read('word/document.xml')
                root = ET.fromstring(xml_content)
                texts = []
                for el in root.iter():
                    if el.tag.endswith('}t') or el.tag.endswith('t'):
                        if el.text:
                            texts.append(el.text)
                text = " ".join(texts).strip()
            print(f"[extract-file] Extracted {len(text)} characters from uploaded DOCX")
            return {"text": text, "length": len(text)}
            
        else:
            # Extract PDF
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            pages = [p.extract_text() or "" for p in reader.pages]
            text = "\n".join(pages).strip()
            print(f"[extract-file] Extracted {len(text)} characters from uploaded PDF")
            return {"text": text, "length": len(text)}
            
    except Exception as e:
        print(f"[extract-file] Error during extraction: {e}")
        raise HTTPException(status_code=400, detail=f"File extraction failed: {str(e)}")


def _call_ai_json(system: str, prompt: str) -> dict:
    """
    Attempts to call Gemini first if configured.
    Otherwise, falls back to Groq.
    If neither is configured, raises RuntimeError.
    """
    global _gemini, _groq_interview
    
    # 1. Print details for logging audit (Issue #5)
    print("\n" + "="*60)
    print("PROMPT SENT TO AI")
    print(f"System Prompt:\n{system}")
    print(f"User Prompt:\n{prompt}")
    print("="*60 + "\n")

    # Try Gemini
    if GEMINI_API_KEY and _gemini:
        print("[resume-review] Invoking Gemini AI...")
        try:
            model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
            cfg   = genai.GenerationConfig(temperature=0.25, response_mime_type="application/json")
            resp  = model.generate_content(prompt, generation_config=cfg)
            res_text = resp.text or ""
            print("\n" + "="*60)
            print("RAW AI RESPONSE RECEIVED (Gemini)")
            print(res_text)
            print("="*60 + "\n")
            
            parsed = json.loads(res_text.strip())
            print("\n" + "="*60)
            print("PARSED AI OUTPUT")
            print(json.dumps(parsed, indent=2))
            print("="*60 + "\n")
            return parsed
        except Exception as gem_err:
            print(f"[resume-review] Gemini error: {gem_err}")
            # Try Groq as fallback below

    # Try Groq
    if _groq_interview:
        print("[resume-review] Invoking Groq AI...")
        try:
            resp = _groq_interview.chat.completions.create(
                model=_GROQ_INTERVIEW_MODEL,
                messages=[
                    {"role": "system", "content": system + "\nRespond ONLY with valid JSON. Do not include markdown or code fences."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.25,
                max_tokens=4096,
            )
            res_text = _extract_groq_text_career(resp).strip()
            print("\n" + "="*60)
            print("RAW AI RESPONSE RECEIVED (Groq)")
            print(res_text)
            print("="*60 + "\n")
            
            if not res_text:
                raise ValueError("Groq returned empty response")
            
            # Clean markdown code block formatting if present
            if res_text.startswith("```"):
                lines = res_text.split("\n")
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                res_text = "\n".join(lines).strip()
            
            parsed = json.loads(res_text.strip())
            print("\n" + "="*60)
            print("PARSED AI OUTPUT")
            print(json.dumps(parsed, indent=2))
            print("="*60 + "\n")
            return parsed
        except Exception as groq_err:
            print(f"[resume-review] Groq error: {groq_err}")
            raise RuntimeError(f"AI service failed. Gemini error or not configured. Groq error: {str(groq_err)}")

    raise RuntimeError("No AI service API keys configured (both GEMINI_API_KEY and GROQ_API_KEY are missing in the backend environment).")


@router.post("/resume-review")
def resume_review(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """
    AI-powered resume ATS analysis and tailoring.
    Returns dynamic scores based on actual resume content, role, company, and job description.
    """
    resume_text   = str(payload.get("resume", ""))
    role          = str(payload.get("role", "Software Engineer")).strip() or "Software Engineer"
    company       = str(payload.get("company", "")).strip()
    requirements  = str(payload.get("requirements", "")).strip()
    mode          = str(payload.get("mode", "analyze"))  # "analyze" | "rebuild"

    # --- PDF base64 extraction (legacy fallback if sent) ---
    resume_pdf_b64 = payload.get("resume_pdf_b64", "")
    if resume_pdf_b64 and not resume_text:
        try:
            import base64, io, PyPDF2
            pdf_bytes = base64.b64decode(resume_pdf_b64)
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            pages = [p.extract_text() or "" for p in reader.pages]
            resume_text = "\n".join(pages).strip()
        except Exception as pdf_err:
            print(f"[resume-review] PDF extraction error: {pdf_err}")

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="resume text is required")

    resume_snippet = resume_text[:8000]

    # ------------------------------------------------------------------
    # AI-powered analysis (Gemini / Groq)
    # ------------------------------------------------------------------
    try:
        jd_context = ""
        if requirements:
            jd_context = f"\n\nJOB DESCRIPTION / REQUIREMENTS:\n{requirements[:3000]}"
        if company:
            jd_context = f"\n\nTARGET COMPANY: {company}{jd_context}"

        if mode == "rebuild":
            # ---- REBUILDER MODE: Return full tailored resume content ----
            role_skills_map = {
                "frontend": "HTML5, CSS3, JavaScript (ES6+), TypeScript, React.js, Redux, Next.js, Responsive Design, REST APIs, Git, Webpack, Figma, UI/UX, Accessibility (WCAG), Performance Optimization",
                "backend": "Python, FastAPI, Django, Node.js, Express.js, REST APIs, PostgreSQL, MySQL, MongoDB, Redis, Docker, JWT Authentication, SQL, Microservices, AWS/GCP, CI/CD",
                "data analyst": "SQL, Python, Pandas, NumPy, Excel, Power BI, Tableau, Data Visualization, Statistics, ETL, Data Cleaning, Business Intelligence, Matplotlib, Seaborn, Jupyter",
                "data scientist": "Python, Machine Learning, Scikit-learn, TensorFlow, PyTorch, Pandas, NumPy, SQL, Statistics, Data Visualization, Feature Engineering, NLP, Deep Learning, Model Deployment",
                "full stack": "React.js, Node.js, Python, REST APIs, PostgreSQL, MongoDB, Docker, Git, TypeScript, AWS, Authentication, CI/CD, Redux, Express.js",
                "devops": "Docker, Kubernetes, AWS, GCP, Azure, Terraform, CI/CD, Jenkins, GitHub Actions, Linux, Bash, Ansible, Monitoring, Prometheus, Grafana",
                "ml engineer": "Python, TensorFlow, PyTorch, MLOps, Scikit-learn, Kubernetes, Docker, REST APIs, Feature Engineering, Model Serving, MLflow, AWS SageMaker",
            }
            # Pick the best matching role skills reference
            role_lower = role.lower()
            role_skills_ref = ""
            for key, skills in role_skills_map.items():
                if key in role_lower:
                    role_skills_ref = f"\nROLE-SPECIFIC SKILLS REFERENCE for {role}: {skills}"
                    break
            if not role_skills_ref:
                # Default to full-stack if unrecognized
                role_skills_ref = f"\nROLE-SPECIFIC SKILLS REFERENCE: Extract the most relevant technical skills for the specific role mentioned."

            company_line = f" at {company}" if company else ""
            company_culture = ""
            if company:
                culture_map = {
                    "google": "Google expects strong algorithms, system design at scale, clean code, and distributed systems expertise.",
                    "amazon": "Amazon expects AWS cloud skills, scalability focus, and alignment with Leadership Principles.",
                    "microsoft": "Microsoft expects Azure/cloud, enterprise software, .NET or cross-platform development skills.",
                    "deloitte": "Deloitte expects consulting mindset, Agile delivery, business analysis, and enterprise client deliverables.",
                    "tcs": "TCS expects enterprise client project delivery, large-scale system integration, and strong domain knowledge.",
                    "accenture": "Accenture expects consulting, digital transformation, cloud migration, and client-facing communication skills.",
                    "infosys": "Infosys expects strong project delivery, client management, Java/.NET/cloud skills, and process adherence.",
                    "wipro": "Wipro expects project lifecycle management, cloud adoption, automation, and client relationship skills.",
                    "flipkart": "Flipkart expects e-commerce scale, React/Node.js frontend/backend, high availability, and performance optimization.",
                    "razorpay": "Razorpay expects fintech domain, payment flows, security (PCI DSS), REST APIs, and high reliability systems.",
                }
                for k, v in culture_map.items():
                    if k in company.lower():
                        company_culture = f" COMPANY CULTURE NOTE — {v}"
                        break
                if not company_culture:
                    company_culture = f" Tailor content to match {company}'s technology stack and engineering expectations."

            system = (
                f"You are an elite ATS-optimization expert and senior resume writer specializing in {role} roles{company_line}."
                f"{company_culture}\n\n"

                "═══════════════════════════════════════════════\n"
                "STEP 1 — DETECT ROLE CATEGORY\n"
                "═══════════════════════════════════════════════\n"
                f"Analyze TARGET ROLE: '{role}' and classify it into one of: Frontend, Backend, Data Analyst, Data Scientist, Full-Stack, DevOps, ML Engineer, or Other.\n"
                "All generated content MUST be specific to this detected role category. Do NOT generate generic content.\n\n"

                "═══════════════════════════════════════════════\n"
                "STEP 2 — EXTRACT CANDIDATE NAME\n"
                "═══════════════════════════════════════════════\n"
                "Extract the candidate's REAL FULL NAME from the resume header/contact section.\n"
                "CRITICAL: NEVER use placeholder names like 'John Doe', 'Candidate', 'Applicant', or 'User'.\n"
                "Always use the actual name found in the resume. Store it for use in the professional_summary.\n\n"

                "═══════════════════════════════════════════════\n"
                "STEP 3 — EXTRACT JD KEYWORDS\n"
                "═══════════════════════════════════════════════\n"
                "From the provided Job Description, extract ALL technical keywords: programming languages, frameworks, tools, methodologies, soft skills.\n"
                "These extracted keywords are the ATS target — the resume must contain as many as possible.\n\n"

                "═══════════════════════════════════════════════\n"
                "STEP 4 — COMPUTE ATS SCORE (DO NOT FAKE IT)\n"
                "═══════════════════════════════════════════════\n"
                "Calculate the post-tailoring ATS score using this exact formula:\n"
                "  ats_score = (keyword_match_pct × 0.40) + (skills_coverage × 0.20) + (project_relevance × 0.20) + (experience_relevance × 0.20)\n"
                "Where:\n"
                "  keyword_match_pct = (JD keywords found in tailored resume / total JD keywords) × 100\n"
                "  skills_coverage   = percentage of role-specific skills present in tailored skills section (0-100)\n"
                "  project_relevance = how well rewritten projects match the role category (0-100, judge honestly)\n"
                "  experience_relevance = how well rewritten experience bullets match the role (0-100, judge honestly)\n"
                "NEVER output a static score like 80 for every resume. Score MUST vary by actual match quality.\n"
                "For a well-matching resume + JD: target 75-85. For poor match: 40-60. Be honest.\n\n"

                "═══════════════════════════════════════════════\n"
                "STEP 5 — GENERATE TAILORED CONTENT\n"
                "═══════════════════════════════════════════════\n"
                f"{role_skills_ref}\n\n"

                "PROFESSIONAL SUMMARY RULES:\n"
                f"  - MUST begin with the candidate's REAL NAME extracted from the resume.\n"
                f"  - MUST mention seeking '{role}' role" + (f" at '{company}'" if company else "") + ".\n"
                f"  - Example opening: '[Real Name] is an experienced {role} seeking to contribute to" + (f" {company}" if company else " a dynamic organization") + " with [their top 2-3 skills]...'\n"
                "  - Length: 3-4 sentences. Embed at least 4 JD keywords naturally.\n"
                "  - Do NOT use generic phrases like 'results-driven professional' or 'passionate developer'.\n\n"

                "SKILLS SECTION RULES:\n"
                "  - Generate a ROLE-SPECIFIC skills list — different for Frontend vs Backend vs Data vs DevOps.\n"
                "  - Prioritize skills from the JD keywords extracted in Step 3.\n"
                "  - Include skills actually found in the candidate's resume.\n"
                "  - Add 1-3 missing JD skills that the candidate could reasonably claim based on their background.\n"
                "  - For Frontend: prioritize HTML/CSS/JS/React/Redux/UI-UX/REST APIs/Git.\n"
                "  - For Backend: prioritize Python/FastAPI/Django/Databases/Auth/Docker/REST APIs.\n"
                "  - For Data Analyst: prioritize SQL/Excel/Power BI/Python/Pandas/Visualization/ETL.\n"
                "  - NEVER reuse the same skill list for different roles.\n\n"

                "EXPERIENCE BULLET RULES:\n"
                "  - Rewrite each bullet using strong action verbs: Developed, Implemented, Optimized, Designed, Built, Integrated, Improved, Architected, Deployed, Automated.\n"
                "  - Each bullet MUST include at least 1 JD keyword.\n"
                "  - Quantify impact wherever possible from the resume's actual content.\n"
                "  - For Frontend bullets: emphasize UI, UX, performance, responsive design, React components.\n"
                "  - For Backend bullets: emphasize APIs, database optimization, authentication, throughput, scalability.\n"
                "  - For Data bullets: emphasize insights, visualization, data pipelines, accuracy, business impact.\n\n"

                "PROJECT DESCRIPTION RULES:\n"
                "  - Rewrite each project description to highlight ROLE-SPECIFIC aspects.\n"
                "  - Frontend projects: Focus on UI components, React, responsive design, user experience.\n"
                "  - Backend projects: Focus on APIs, database schemas, authentication, performance.\n"
                "  - Data projects: Focus on analysis, visualization, insights, business decisions.\n"
                "  - NEVER write identical project descriptions for different role applications.\n"
                "  - Each project description must mention at least 2 JD keywords.\n\n"

                "═══════════════════════════════════════════════\n"
                "OUTPUT FORMAT\n"
                "═══════════════════════════════════════════════\n"
                "Return ONLY a valid JSON object with these EXACT keys:\n"
                "- ats_score: integer (calculated using formula above — NOT hardcoded)\n"
                "- score_breakdown: object with exactly these 6 integer keys: Keywords, Skills, Experience, Education, Projects, Formatting\n"
                "- matched_keywords: list of strings (JD keywords found in the tailored resume)\n"
                "- missing_keywords: list of strings (important JD keywords still missing after tailoring)\n"
                "- keyword_match_pct: integer 0-100\n"
                "- summary: string (2-3 sentence fit analysis referencing the candidate's real name)\n"
                "- highlights: list of 3-5 strings (specific candidate strengths for this role)\n"
                "- improvements: list of 3-5 strings (remaining gaps to address)\n"
                "- keywords: list of 8-12 strings (critical ATS keywords for this role + JD)\n"
                "- next_steps: list of 3-4 strings (concrete prioritized actions)\n"
                "- tailored_resume: object with:\n"
                "    - candidate_name: string (real name extracted from resume — NEVER a placeholder)\n"
                "    - professional_summary: string (3-4 sentences, contains candidate name and company name if provided)\n"
                "    - skills: list of strings (role-specific tailored skills — DIFFERENT per role)\n"
                "    - experience_bullets: list of strings (3-6 rewritten bullets using action verbs + JD keywords)\n"
                "    - projects: list of strings (2-4 rewritten project descriptions, role-specific focus)\n"
                "Do NOT include markdown, prose, or code fences outside JSON."
            )
            prompt = (
                f"TARGET ROLE: {role}\n"
                + (f"TARGET COMPANY: {company}\n" if company else "")
                + f"{jd_context}\n\n"
                f"CANDIDATE RESUME (extract name, skills, experience, projects from this):\n{resume_snippet}\n\n"
                "Now execute all 5 steps and produce the tailored resume JSON. "
                "Remember: use the candidate's REAL name from the resume. "
                "The professional summary MUST mention the target role"
                + (f" and {company}" if company else "")
                + ". Skills and projects must be specific to the detected role category."
            )
        else:
            # ---- ANALYZER MODE: Pure ATS analysis ----
            system = (
                f"You are a strict ATS (Applicant Tracking System) analyzer evaluating a resume for a {role} role"
                + (f" at {company}" if company else "") + ". "
                "Analyze the resume ACCURATELY and DYNAMICALLY — scores must reflect the actual content of this specific resume. "
                "A resume with weak keyword coverage should score 30-50. A strong targeted resume should score 70-90. "
                "Never give a static or rounded score. Be precise and honest.\n\n"
                "CANDIDATE NAME RULE: Extract the candidate's real name from the resume. Never use placeholder names.\n\n"
                "ATS SCORE FORMULA — use this to compute ats_score:\n"
                "  ats_score = (keyword_match_pct × 0.40) + (skills_coverage × 0.20) + (project_relevance × 0.20) + (experience_relevance × 0.20)\n"
                "  keyword_match_pct = (role/JD keywords found in resume / total expected keywords) × 100\n"
                "  skills_coverage = percentage of role-essential skills present (0-100)\n"
                "  project_relevance = how well projects match the role (0-100)\n"
                "  experience_relevance = how well experience matches (0-100)\n"
                "Score MUST vary by actual content. Do NOT always return 80.\n\n"
                + (f"Company analysis: Grade against {company}'s standards. " if company else "")
                + "Extract all technical keywords from the job description if provided.\n\n"
                "Return ONLY a valid JSON object with these exact keys:\n"
                "- ats_score: integer 0-100 (calculated with formula above)\n"
                "- score_breakdown: object with exactly these 6 integer keys: Keywords, Skills, Experience, Education, Projects, Formatting\n"
                "  Scoring guidelines:\n"
                "  * Keywords: Does the resume use role-specific terminology and ATS keywords?\n"
                "  * Skills: Are relevant technical and soft skills present and prominent?\n"
                "  * Experience: Is work history detailed, quantified, and relevant?\n"
                "  * Education: Does educational background match typical requirements?\n"
                "  * Projects: Are projects described with impact, tech stack, and outcomes?\n"
                "  * Formatting: Is the resume clean, scannable, action-verb led, and ATS-friendly?\n"
                "- matched_keywords: list of strings (keywords from the role/JD found in the resume)\n"
                "- missing_keywords: list of strings (important role keywords NOT present in the resume)\n"
                "- keyword_match_pct: integer 0-100 (percentage of role keywords found)\n"
                "- summary: string (2-3 sentence honest assessment of fit for this role)\n"
                "- highlights: list of 3-5 strings (specific strengths identified in this resume)\n"
                "- improvements: list of 4-6 strings (specific, actionable fixes for this exact resume)\n"
                "- keywords: list of 10-15 strings (all critical ATS keywords for this role)\n"
                "- next_steps: list of 3-4 strings (prioritized action items)\n"
                "- tailored_resume: null\n"
                "Do NOT include markdown, prose, or code fences outside JSON. "
                "IMPORTANT: ats_score and all sub-scores must vary based on resume content — never output static values."
            )
            prompt = (
                f"TARGET ROLE: {role}{jd_context}\n\n"
                f"RESUME TO ANALYZE:\n{resume_snippet}\n\n"
                "Analyze this resume now using the ATS formula."
            )

        result = _call_ai_json(system, prompt)

        # Normalize and validate the response
        ats_score = max(0, min(100, int(result.get("ats_score", 50))))
        breakdown_raw = result.get("score_breakdown", {})
        breakdown = {
            "Keywords":   max(0, min(100, int(breakdown_raw.get("Keywords",   ats_score)))),
            "Skills":     max(0, min(100, int(breakdown_raw.get("Skills",     ats_score)))),
            "Experience": max(0, min(100, int(breakdown_raw.get("Experience", ats_score)))),
            "Education":  max(0, min(100, int(breakdown_raw.get("Education",  ats_score)))),
            "Projects":   max(0, min(100, int(breakdown_raw.get("Projects",   ats_score)))),
            "Formatting": max(0, min(100, int(breakdown_raw.get("Formatting", ats_score)))),
        }
        kw_pct = max(0, min(100, int(result.get("keyword_match_pct", 0))))

        tailored = result.get("tailored_resume")
        if tailored and isinstance(tailored, dict):
            tailored = {
                "candidate_name": str(tailored.get("candidate_name", "")),
                "professional_summary": str(tailored.get("professional_summary", "")),
                "skills": [str(s) for s in (tailored.get("skills") or [])],
                "experience_bullets": [str(b) for b in (tailored.get("experience_bullets") or [])],
                "projects": [str(p) for p in (tailored.get("projects") or [])],
            }


        return {
            "ats_score":         ats_score,
            "score_breakdown":   breakdown,
            "matched_keywords":  [str(k) for k in (result.get("matched_keywords") or [])],
            "missing_keywords":  [str(k) for k in (result.get("missing_keywords") or [])],
            "keyword_match_pct": kw_pct,
            "summary":           str(result.get("summary", "")),
            "highlights":        [str(h) for h in (result.get("highlights") or [])],
            "improvements":      [str(i) for i in (result.get("improvements") or [])],
            "keywords":          [str(k) for k in (result.get("keywords") or [])],
            "next_steps":        [str(s) for s in (result.get("next_steps") or [])],
            "tailored_resume":   tailored,
        }

    except Exception as e:
        print(f"[resume-review error] {e}")
        raise HTTPException(status_code=502, detail=f"Resume review failed: {str(e)}")

