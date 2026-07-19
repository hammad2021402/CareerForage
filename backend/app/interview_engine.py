import os
import json
import sqlite3
import uuid
import datetime
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from groq import Groq

# ─── Load Environment variables & Initialize LLMs ───────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL     = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

print(f"[interview_engine INIT] GROQ_API_KEY={'SET (' + GROQ_API_KEY[:8] + '...)' if GROQ_API_KEY else 'MISSING'}")
print(f"[interview_engine INIT] GROQ_MODEL={GROQ_MODEL}")
print(f"[interview_engine INIT] GEMINI_API_KEY={'SET' if GEMINI_API_KEY else 'MISSING'}")

_groq_client = None
if GROQ_API_KEY:
    try:
        _groq_client = Groq(api_key=GROQ_API_KEY)
        print(f"[interview_engine INIT] Groq client CREATED successfully")
    except Exception as e:
        print(f"[interview_engine INIT] Groq client FAILED: {e}")
else:
    print("[interview_engine INIT] Groq client SKIPPED (no API key)")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─── Configuration Loader ──────────────────────────────────────────────────
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "interview_modes.json")
INTERVIEW_MODES: Dict[str, Any] = {}

if os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, "r") as f:
            INTERVIEW_MODES = json.load(f)
    except Exception as e:
        print(f"Error loading interview_modes.json: {e}")
else:
    print("Warning: interview_modes.json not found in app directory.")

# Fallback basic modes if JSON fails to load
if not INTERVIEW_MODES:
    INTERVIEW_MODES = {
        "dsa": {
            "name": "Data Structures & Algorithms (DSA)",
            "topics": ["Arrays", "Strings", "Linked List", "Stack", "Queue", "Hashing", "System Design"],
            "difficulty_progression": ["Easy", "Easy", "Medium", "Medium", "Hard", "Hard"],
            "total_questions": 6
        }
    }

# ─── Database & SQLite Compatibility Layer ──────────────────────────────────
DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "interview_forge.db"))


def ensure_sqlite_tables():
    """Ensure that the local SQLite fallback database and tables exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_questions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        subtopic TEXT,
        difficulty TEXT NOT NULL,
        company TEXT,
        tags TEXT,
        question TEXT NOT NULL UNIQUE,
        followups TEXT,
        expected_points TEXT,
        time_limit INTEGER DEFAULT 180,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        role TEXT NOT NULL,
        seniority TEXT NOT NULL,
        interview_type TEXT NOT NULL,
        total_questions INTEGER DEFAULT 0,
        current_question_index INTEGER DEFAULT 0,
        asked_question_ids TEXT,
        asked_questions_text TEXT,
        covered_topics TEXT,
        difficulty_history TEXT,
        answer_history TEXT,
        weak_topics TEXT,
        strong_topics TEXT,
        report TEXT,
        current_question_followup_count INTEGER DEFAULT 0,
        current_question_max_followups INTEGER DEFAULT 2,
        current_question_completed BOOLEAN DEFAULT 1,
        current_question_main_text TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()

    # Dynamic SQLite migration check for existing databases
    try:
        cursor.execute("PRAGMA table_info(interview_sessions)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "current_question_followup_count" not in existing_cols:
            cursor.execute("ALTER TABLE interview_sessions ADD COLUMN current_question_followup_count INTEGER DEFAULT 0")
        if "current_question_max_followups" not in existing_cols:
            cursor.execute("ALTER TABLE interview_sessions ADD COLUMN current_question_max_followups INTEGER DEFAULT 2")
        if "current_question_completed" not in existing_cols:
            cursor.execute("ALTER TABLE interview_sessions ADD COLUMN current_question_completed BOOLEAN DEFAULT 1")
        if "current_question_main_text" not in existing_cols:
            cursor.execute("ALTER TABLE interview_sessions ADD COLUMN current_question_main_text TEXT")
        conn.commit()
    except Exception as migration_error:
        print(f"Error executing local database migration: {migration_error}")

    conn.close()

# Initialize tables at load
ensure_sqlite_tables()

def auto_seed_if_empty():
    """Checks if the questions table is empty, and if so seeds it."""
    # Check SQLite
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM interview_questions")
        count = cursor.fetchone()[0]
        conn.close()
        if count == 0:
            print("SQLite question bank is empty. Auto-seeding...")
            from app.seed_interview_questions import seed_sqlite
            seed_sqlite()
    except Exception as e:
        print(f"Error checking/auto-seeding SQLite: {e}")

    # Check Supabase
    db = get_supabase_client()
    if db:
        try:
            res = db.table("interview_questions").select("id", count="exact", limit=1).execute()
            if res.count == 0:
                print("Supabase question bank is empty. Auto-seeding...")
                from app.seed_interview_questions import seed_supabase
                seed_supabase()
        except Exception as e:
            print(f"Error checking/auto-seeding Supabase: {e}")



# ─── Supabase Client Proxy (Lazy import to avoid circular dependency) ───────
def get_supabase_client():
    try:
        from app.database import supabase
        return supabase
    except ImportError:
        return None

auto_seed_if_empty()

# ─── LLM Helpers ────────────────────────────────────────────────────────────
def _call_llm_raw(system: str, prompt: str, temperature: float = 0.3) -> str:
    """Tries Groq first, then Gemini, then returns empty string on failure."""
    if _groq_client:
        try:
            print(f"[interview_engine] Calling Groq with model={GROQ_MODEL}...")
            resp = _groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=2048,
            )
            content = getattr(resp, "choices", [None])[0]
            if content and hasattr(content, "message"):
                result = content.message.content or ""
                print(f"[interview_engine] Groq SUCCESS, response length={len(result)}")
                return result
        except Exception as e:
            print(f"[interview_engine LLM groq error] {e}")
    else:
        print("[interview_engine] No Groq client available")

    if GEMINI_API_KEY:
        try:
            print(f"[interview_engine] Falling back to Gemini model={GEMINI_MODEL}...")
            model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
            cfg   = genai.GenerationConfig(temperature=temperature)
            resp  = model.generate_content(prompt, generation_config=cfg)
            result = resp.text or ""
            print(f"[interview_engine] Gemini SUCCESS, response length={len(result)}")
            return result
        except Exception as e:
            print(f"[interview_engine LLM gemini error] {e}")

    print("[interview_engine] ALL LLM calls failed, returning empty string")
    return ""

def _call_llm_json(system: str, prompt: str, temperature: float = 0.3) -> Dict[str, Any]:
    """Helper to call LLM and extract valid JSON."""
    system_adjusted = system + "\nRespond ONLY with valid JSON. Do not include markdown code fences."
    raw = _call_llm_raw(system_adjusted, prompt, temperature).strip()
    if not raw:
        return {}
    
    # Strip markdown fences
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    
    try:
        return json.loads(raw)
    except Exception as e:
        print(f"Failed to parse JSON response from LLM: {e}. Raw was: {raw[:150]}")
        return {}

# ─── Business Logic Methods ─────────────────────────────────────────────────

def get_user_lifetime_asked_questions(user_id: str) -> List[str]:
    """Retrieve all previously asked question texts across completed sessions of this user."""
    asked = []
    # 1. Try Supabase
    db = get_supabase_client()
    if db:
        try:
            res = db.table("interview_sessions").select("asked_questions_text").eq("user_id", user_id).execute()
            for row in res.data:
                q_list = row.get("asked_questions_text") or []
                if isinstance(q_list, list):
                    asked.extend(q_list)
                elif isinstance(q_list, str):
                    try:
                        asked.extend(json.loads(q_list))
                    except:
                        pass
            return list(set(asked))
        except Exception as e:
            print(f"Supabase error fetching lifetime questions: {e}. Falling back to SQLite.")

    # 2. Try SQLite fallback
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT asked_questions_text FROM interview_sessions WHERE user_id = ?", (user_id,))
        for row in cursor.fetchall():
            if row[0]:
                try:
                    q_list = json.loads(row[0])
                    asked.extend(q_list)
                except:
                    pass
        conn.close()
    except Exception as e:
        print(f"SQLite error fetching lifetime questions: {e}")
        
    return list(set(asked))

def validate_semantic_similarity(proposed: str, asked_questions: List[str]) -> float:
    """Uses LLM to evaluate the similarity between a proposed question and asked questions.
    Returns a similarity score between 0 and 100."""
    if not asked_questions:
        return 0.0

    system = (
        "You are a semantic analysis assistant. Compare a proposed interview question "
        "against a list of already asked questions. Determine if the proposed question "
        "is a semantic duplicate (checks the exact same concept or problem, even if phrased differently) "
        "of any question in the list. Respond with JSON: {\"similarity_percentage\": int}"
    )
    prompt = f"""
Already asked questions:
{json.dumps(asked_questions, indent=2)}

Proposed question:
"{proposed}"

Evaluate the maximum similarity percentage between the proposed question and the closest match in the asked list.
If they cover the identical topic, algorithm, or concept (e.g. Stack vs Queue vs 'Explain Stack and Queue'), the similarity is > 90%.
Respond ONLY with JSON: {{"similarity_percentage": <0-100>}}
"""
    try:
        res = _call_llm_json(system, prompt, temperature=0.1)
        return float(res.get("similarity_percentage", 0.0))
    except Exception as e:
        print(f"Error checking semantic similarity: {e}")
        # Return 0.0 on error to avoid blocking the pipeline completely
        return 0.0

def generate_custom_question(role: str, seniority: str, topic: str, difficulty: str, weak_topics: List[str], asked_questions: List[str], is_followup: bool = False, parent_question: str = "", followup_focus: str = "") -> Dict[str, Any]:
    """Uses a professional persona to generate a high-quality interview question."""
    system = (
        "You are a Senior Software Engineer and Principal Architect conducting a professional "
        "technical interview matching top-tier companies like Google, Amazon, Microsoft, and Meta. "
        "Your question must be clear, practical, and test deep understanding. "
        "Provide your response in JSON matching this structure: \n"
        "{\n"
        "  \"question\": \"The actual interview question text\",\n"
        "  \"subtopic\": \"specific subtopic\",\n"
        "  \"expected_points\": [\"key point candidate should mention\", \"another point\"],\n"
        "  \"followups\": [\"followup question 1\", \"followup question 2\"]\n"
        "}"
    )
    
    prompt = f"""
Role: {role}
Seniority: {seniority}
Topic: {topic}
Difficulty: {difficulty}
Candidate Weaknesses: {json.dumps(weak_topics)}
Already Asked Questions (Avoid these!):
{json.dumps(asked_questions, indent=2)}
"""

    if is_followup:
        prompt += f"\nThis is a follow-up probing deeper into: '{parent_question}'."
        if followup_focus:
            prompt += f"\nYour follow-up question MUST focus specifically on: {followup_focus}."
        else:
            prompt += "\nDive into implementation details, tradeoffs, or edge cases."
    else:
        prompt += "\nGenerate a unique, core syllabus question."

    prompt += "\nEnsure the question is professional, concise, and asks for exactly ONE concrete question."

    res = _call_llm_json(system, prompt, temperature=0.6)
    if not res or "question" not in res:
        # Fallback question generation on failure
        return {
            "question": f"Explain the core engineering trade-offs and implementation details for {topic} at a {difficulty} level.",
            "subtopic": topic,
            "expected_points": ["tradeoffs", "time complexity", "implementation"],
            "followups": []
        }
    return res

def fetch_and_validate_question(
    session: Dict[str, Any], 
    topic: str, 
    difficulty: str, 
    user_id: str, 
    is_followup: bool = False,
    parent_question: str = "",
    followup_focus: str = "",
    max_retries: int = 5
) -> Dict[str, Any]:
    """Question validation pipeline:
    1. Tries to find a question in the bank (Supabase/SQLite) for main questions.
    2. If followup or not found, generates one.
    3. Runs semantic check against lifetime asked questions + current session questions.
    4. Enforces safety rule: never ask the exact same question consecutively.
    5. Repeats if similarity > 80% or duplicate found.
    6. Saves new questions back to the database.
    """
    db = get_supabase_client()
    session_asked = session.get("asked_questions_text") or []
    lifetime_asked = get_user_lifetime_asked_questions(user_id)
    all_asked = list(set(session_asked + lifetime_asked))
    last_asked = session_asked[-1] if session_asked else ""

    for attempt in range(max_retries):
        question_data = None
        
        # Only look up in database bank if it's a main question (not a contextual followup)
        if not is_followup:
            db_qs = []
            if db:
                try:
                    res = db.table("interview_questions").select("*").eq("topic", topic).eq("difficulty", difficulty).execute()
                    db_qs = res.data or []
                except Exception as e:
                    print(f"Supabase question lookup failed: {e}. Falling back to SQLite.")

            if not db_qs:
                try:
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT id, topic, subtopic, difficulty, company, question, tags, followups, expected_points FROM interview_questions WHERE topic = ? AND difficulty = ?",
                        (topic, difficulty)
                    )
                    for row in cursor.fetchall():
                        db_qs.append({
                            "id": row[0],
                            "topic": row[1],
                            "subtopic": row[2],
                            "difficulty": row[3],
                            "company": row[4],
                            "question": row[5],
                            "tags": json.loads(row[6]) if row[6] else [],
                            "followups": json.loads(row[7]) if row[7] else [],
                            "expected_points": json.loads(row[8]) if row[8] else []
                        })
                    conn.close()
                except Exception as e:
                    print(f"SQLite question lookup failed: {e}")

            # Filter out exact matches
            filtered_qs = [q for q in db_qs if q["question"] not in all_asked]
            
            if filtered_qs:
                question_data = filtered_qs[0]
                proposed_q = question_data["question"]
                
                # Check consecutive safety rule
                if proposed_q.strip().lower() == last_asked.strip().lower():
                    print("Bank question matches last asked consecutively. Skipping...")
                    continue
                    
                # Verify semantic similarity
                similarity = validate_semantic_similarity(proposed_q, all_asked)
                if similarity <= 80.0:
                    print(f"Found validated question in database bank for {topic} ({difficulty})")
                    return question_data
                else:
                    print(f"Database question semantic match too high ({similarity}%), generating new variation...")
        
        # Generate custom variation/followup
        generated = generate_custom_question(
            role=session.get("role", "Software Engineer"),
            seniority=session.get("seniority", "Mid-level"),
            topic=topic,
            difficulty=difficulty,
            weak_topics=session.get("weak_topics") or [],
            asked_questions=all_asked,
            is_followup=is_followup,
            parent_question=parent_question,
            followup_focus=followup_focus
        )

        proposed_q = generated["question"]
        
        # Check consecutive safety rule
        if proposed_q.strip().lower() == last_asked.strip().lower():
            print(f"Generated consecutive duplicate in attempt {attempt+1}, regenerating...")
            continue
            
        # Check exact duplicate in all asked
        if proposed_q in all_asked:
            print(f"Generated duplicate text in attempt {attempt+1}, regenerating...")
            continue
            
        # Check semantic duplicate
        similarity = validate_semantic_similarity(proposed_q, all_asked)
        if similarity > 80.0:
            print(f"Generated question rejected by validation pipeline (Similarity: {similarity}% > 80%), regenerating...")
            continue

        # Validated! Save to bank
        new_id = str(uuid.uuid4())
        question_data = {
            "id": new_id,
            "topic": topic,
            "subtopic": generated.get("subtopic", topic),
            "difficulty": difficulty,
            "company": "AI Forge",
            "tags": [session.get("interview_type", "technical")],
            "question": proposed_q,
            "followups": generated.get("followups", []),
            "expected_points": generated.get("expected_points", []),
            "time_limit": 180
        }

        # Save to SQLite
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO interview_questions (id, topic, subtopic, difficulty, company, tags, question, followups, expected_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id, topic, question_data["subtopic"], difficulty, "AI Forge", 
                 json.dumps(question_data["tags"]), proposed_q, 
                 json.dumps(question_data["followups"]), json.dumps(question_data["expected_points"]))
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to write to SQLite bank: {e}")

        # Save to Supabase
        if db:
            try:
                db.table("interview_questions").insert(question_data).execute()
            except Exception as e:
                print(f"Failed to write to Supabase bank: {e}")

        print(f"Generated, validated and saved new question to bank for {topic} ({difficulty})")
        return question_data

    # Return exhaustion flag so caller can advance to next topic if follow-up generation fails
    if is_followup:
        print("Could not generate a unique follow-up. Returning exhaustion state.")
        return {"question": "", "is_exhausted": True}

    # Absolute fallback for main question
    return {
        "id": str(uuid.uuid4()),
        "topic": topic,
        "subtopic": topic,
        "difficulty": difficulty,
        "question": f"Can you detail the core architecture, data structures, and trade-offs when optimizing a {topic} task?",
        "followups": [],
        "expected_points": ["efficiency", "optimization"]
    }

# ─── Session Persistence Helpers ────────────────────────────────────────────

def load_session_object(session_id: str) -> Optional[Dict[str, Any]]:
    """Loads interview session from Supabase or local SQLite."""
    # 1. Supabase
    db = get_supabase_client()
    if db:
        try:
            res = db.table("interview_sessions").select("*").eq("id", session_id).maybe_single().execute()
            if res.data:
                # Supabase returns columns as appropriate types, but double check arrays
                session = res.data
                for key in ["asked_question_ids", "asked_questions_text", "covered_topics", "difficulty_history", "answer_history", "weak_topics", "strong_topics", "report"]:
                    if isinstance(session.get(key), str):
                        try:
                            session[key] = json.loads(session[key])
                        except:
                            pass
                session["current_question_completed"] = bool(session.get("current_question_completed", True))
                return session
        except Exception as e:
            print(f"Supabase load session error: {e}. Trying SQLite.")

    # 2. SQLite
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            session = dict(row)
            for key in ["asked_question_ids", "asked_questions_text", "covered_topics", "difficulty_history", "answer_history", "weak_topics", "strong_topics", "report"]:
                if session.get(key):
                    try:
                        session[key] = json.loads(session[key])
                    except:
                        session[key] = []
                else:
                    session[key] = []
            session["current_question_completed"] = bool(session.get("current_question_completed", True))
            return session
    except Exception as e:
        print(f"SQLite load session error: {e}")
        
    return None

def save_session_object(session: Dict[str, Any]):
    """Saves interview session to Supabase and local SQLite."""
    session_copy = session.copy()
    session_copy["updated_at"] = datetime.datetime.utcnow().isoformat()
    
    # Stringify fields for database
    db_data = {
        "id": session_copy["id"],
        "user_id": session_copy["user_id"],
        "role": session_copy["role"],
        "seniority": session_copy["seniority"],
        "interview_type": session_copy["interview_type"],
        "total_questions": session_copy["total_questions"],
        "current_question_index": session_copy["current_question_index"],
        "asked_question_ids": json.dumps(session_copy.get("asked_question_ids") or []),
        "asked_questions_text": json.dumps(session_copy.get("asked_questions_text") or []),
        "covered_topics": json.dumps(session_copy.get("covered_topics") or []),
        "difficulty_history": json.dumps(session_copy.get("difficulty_history") or []),
        "answer_history": json.dumps(session_copy.get("answer_history") or []),
        "weak_topics": json.dumps(session_copy.get("weak_topics") or []),
        "strong_topics": json.dumps(session_copy.get("strong_topics") or []),
        "report": json.dumps(session_copy.get("report")) if session_copy.get("report") else None,
        "current_question_followup_count": int(session_copy.get("current_question_followup_count", 0)),
        "current_question_max_followups": int(session_copy.get("current_question_max_followups", 2)),
        "current_question_completed": int(session_copy.get("current_question_completed", True)),
        "current_question_main_text": session_copy.get("current_question_main_text"),
        "status": session_copy["status"]
    }

    # 1. SQLite
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO interview_sessions (id, user_id, role, seniority, interview_type, total_questions, current_question_index, 
                                      asked_question_ids, asked_questions_text, covered_topics, difficulty_history, 
                                      answer_history, weak_topics, strong_topics, report, current_question_followup_count,
                                      current_question_max_followups, current_question_completed, current_question_main_text, status)
        VALUES (:id, :user_id, :role, :seniority, :interview_type, :total_questions, :current_question_index, 
                :asked_question_ids, :asked_questions_text, :covered_topics, :difficulty_history, 
                :answer_history, :weak_topics, :strong_topics, :report, :current_question_followup_count,
                :current_question_max_followups, :current_question_completed, :current_question_main_text, :status)
        ON CONFLICT(id) DO UPDATE SET
            current_question_index = excluded.current_question_index,
            asked_question_ids = excluded.asked_question_ids,
            asked_questions_text = excluded.asked_questions_text,
            covered_topics = excluded.covered_topics,
            difficulty_history = excluded.difficulty_history,
            answer_history = excluded.answer_history,
            weak_topics = excluded.weak_topics,
            strong_topics = excluded.strong_topics,
            report = excluded.report,
            current_question_followup_count = excluded.current_question_followup_count,
            current_question_max_followups = excluded.current_question_max_followups,
            current_question_completed = excluded.current_question_completed,
            current_question_main_text = excluded.current_question_main_text,
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP
        """, db_data)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQLite save session error: {e}")

    # 2. Supabase
    db = get_supabase_client()
    if db:
        try:
            # Map types cleanly for Supabase jsonb
            supabase_data = db_data.copy()
            for key in ["asked_question_ids", "asked_questions_text", "covered_topics", "difficulty_history", "answer_history", "weak_topics", "strong_topics", "report"]:
                if supabase_data[key]:
                    supabase_data[key] = json.loads(supabase_data[key])
            supabase_data["current_question_completed"] = bool(supabase_data["current_question_completed"])
            
            db.table("interview_sessions").upsert(supabase_data).execute()
        except Exception as e:
            print(f"Supabase save session error: {e}")

# ─── Report Generator ───────────────────────────────────────────────────────

def generate_professional_report(session: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the professional AI review summary."""
    history = session.get("answer_history") or []
    if not history:
        return {
            "overall_score": 0,
            "technical_score": 0,
            "communication_score": 0,
            "confidence_score": 0,
            "clarity_score": 0,
            "recommendation": "No answers recorded.",
            "suggestions": []
        }

    # Calculate average scores
    conf_scores = [h["scores"]["confidence"] for h in history if "scores" in h]
    tech_scores = [h["scores"]["technical"] for h in history if "scores" in h]
    comm_scores = [h["scores"]["communication"] for h in history if "scores" in h]
    clar_scores = [h["scores"]["clarity"] for h in history if "scores" in h]

    confidence = int(sum(conf_scores) / len(conf_scores)) if conf_scores else 50
    technical = int(sum(tech_scores) / len(tech_scores)) if tech_scores else 50
    communication = int(sum(comm_scores) / len(comm_scores)) if comm_scores else 50
    clarity = int(sum(clar_scores) / len(clar_scores)) if clar_scores else 50
    
    overall = int((confidence + technical + communication + clarity) / 4)

    # Use LLM to write a comprehensive recommendation
    system = "You are a Principal Technical Recruiter. Synthesize this candidate interview transcript and write a concise, professional summary report."
    prompt = f"""
Candidate Role: {session.get('role')} ({session.get('seniority')})
Interview Type: {session.get('interview_type')}

Scoring:
- Overall: {overall}%
- Technical: {technical}%
- Communication: {communication}%
- Confidence: {confidence}%
- Clarity: {clarity}%

Strong Areas: {json.dumps(session.get('strong_topics') or [])}
Needs Improvement: {json.dumps(session.get('weak_topics') or [])}

Transcript:
{json.dumps([{"q": h.get("question"), "a": h.get("answer"), "feedback": h.get("feedback")} for h in history], indent=2)}

Respond with a JSON object:
{{
  "recommendation": "Overall feedback and career path recommendation (3-4 sentences)",
  "suggestions": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"]
}}
"""
    res = _call_llm_json(system, prompt, temperature=0.5)
    
    report = {
        "overall_score": overall,
        "technical_score": technical,
        "communication_score": communication,
        "confidence_score": confidence,
        "clarity_score": clarity,
        "topics_covered": session.get("covered_topics") or [],
        "strong_topics": session.get("strong_topics") or [],
        "weak_topics": session.get("weak_topics") or [],
        "question_coverage_pct": int((len(session.get("covered_topics") or []) / max(1, len(history))) * 100),
        "difficulty_reached": session.get("difficulty_history")[-1] if session.get("difficulty_history") else "Easy",
        "total_attempted": len(history),
        "recommendation": res.get("recommendation") or "You have demonstrated key technical skills. Continue practicing systems-level and algorithmic design.",
        "suggestions": res.get("suggestions") or ["Review core concepts in weak topics.", "Practice mock interviews under time constraints."]
    }
    return report

# ─── Core Orchestrator Entrypoint ───────────────────────────────────────────

def get_followup_focus(interview_type: str, followup_count: int) -> str:
    """Returns type-specific focus instructions for contextual follow-up generation."""
    it = interview_type.lower()
    if "behavioral" in it or "hr" in it:
        if followup_count == 1:
            return "elaborate on your specific actions, decisions, and communications during this situation (STAR Action focus)"
        else:
            return "explain the final outcomes, metrics of success, and key reflections or learnings (STAR Result focus)"
    elif "dsa" in it or "algo" in it or "leet" in it or "python" in it or "java" in it:
        if followup_count == 1:
            return "analyze time and space complexity in Big O notation, and propose runtime or memory optimizations"
        else:
            return "identify edge cases, invalid inputs, overflow constraints, or describe a coding implementation variation"
    elif "systemdesign" in it or "design" in it or "cloud" in it or "architecture" in it or "devops" in it:
        if followup_count == 1:
            return "scale bottlenecks, database replication/sharding, concurrent requests, or load balancer failures"
        else:
            return "database choices (SQL vs NoSQL), CAP Theorem tradeoffs, or caching layers (Redis/CDN) to handle high write/read loads"
    else:
        if followup_count == 1:
            return "architectural trade-offs, configuration values, or alternative design patterns"
        else:
            return "error handling, unit testing boundary cases, or security vulnerabilities (OWASP Top 10) mitigation"

def process_interview_turn(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Processes a candidate's response (or starts a session) and prepares the next turn."""
    interview_id = payload.get("interview_id")
    role = payload.get("role", "Software Engineer")
    seniority = payload.get("seniority", "Mid-level")
    skills = payload.get("skills") or []
    
    # Detect mode config
    interview_type = "dsa"
    for s in skills:
        cleaned_s = s.replace("-", "").lower()
        if cleaned_s in INTERVIEW_MODES:
            interview_type = cleaned_s
            break

    first_mode_key = next(iter(INTERVIEW_MODES))
    mode_config = INTERVIEW_MODES.get(interview_type, INTERVIEW_MODES[first_mode_key])
    max_questions = mode_config.get("total_questions", 10)
    syllabus_topics = mode_config.get("topics") or []
    diff_progression = mode_config.get("difficulty_progression") or ["Easy", "Medium", "Hard"]

    # 1. Fetch or Instantiate Session
    session = None
    if interview_id:
        session = load_session_object(interview_id)
        
    if not session:
        # Create brand new session
        session_id = interview_id or str(uuid.uuid4())
        session = {
            "id": session_id,
            "user_id": user_id,
            "role": role,
            "seniority": seniority,
            "interview_type": interview_type,
            "total_questions": max_questions,
            "current_question_index": 0,
            "asked_question_ids": [],
            "asked_questions_text": [],
            "covered_topics": [],
            "difficulty_history": [],
            "answer_history": [],
            "weak_topics": [],
            "strong_topics": [],
            "current_question_followup_count": 0,
            "current_question_max_followups": 2,
            "current_question_completed": True,
            "current_question_main_text": "",
            "status": "active"
        }
        print(f"Created new interview session: {session_id}")

    # 2. Evaluate Last Answer (if turn index > 0 and history has candidate turns)
    raw_history = payload.get("history", [])
    candidate_turns = [t for t in raw_history if t.get("role") == "candidate"]
    
    evaluation = None
    if candidate_turns:
        # Candidate answered! Let's score it and update state
        last_turn = candidate_turns[-1]
        last_answer = last_turn.get("message", "")
        last_question = session["asked_questions_text"][-1] if session["asked_questions_text"] else ""
        last_topic = session["covered_topics"][-1] if session["covered_topics"] else syllabus_topics[0]
        
        last_answer_clean = last_answer.strip().lower()
        is_skip = any(phrase in last_answer_clean for phrase in ["next question", "skip", "dont know", "don't know", "move on", "pass"])
        
        if is_skip:
            # Bypass LLM evaluation entirely
            scores = {"confidence": 30, "technical": 0, "communication": 30, "clarity": 30}
            evaluation = {
                "question": last_question,
                "answer": last_answer,
                "score": 0,
                "feedback": "Understood, let's move on to the next question.",
                "tips": ["Make sure to prepare for this topic next time."],
                "strengths": [],
                "improvements": [last_topic],
                "scores": scores,
                "topic": last_topic,
                "difficulty": session["difficulty_history"][-1] if session["difficulty_history"] else "Easy"
            }
            session["answer_history"].append(evaluation)
            session["current_question_completed"] = True
            session["current_question_followup_count"] = 0
            session["current_question_index"] += 1
            if last_topic not in session["weak_topics"]:
                session["weak_topics"].append(last_topic)
        else:
            # Evaluate using LLM
            eval_system = (
                "You are a strict, objective technical recruiter. Evaluate the candidate's answer to the question. "
                "Respond ONLY with JSON format:\n"
                "{\n"
                "  \"feedback\": \"Constructive 2-sentence feedback\",\n"
                "  \"wants_to_end\": boolean, // Set to true ONLY if the candidate explicitly says they want to quit, stop, exit, or terminate the entire mock interview session. Do NOT set to true if they just say 'next question', 'skip', or similar to move on.\n"
                "  \"tips\": [\"actionable tip 1\", \"tip 2\"],\n"
                "  \"strengths\": [\"observed strength\"],\n"
                "  \"improvements\": [\"improvement area\"],\n"
                "  \"scores\": {\"confidence\": int, \"technical\": int, \"communication\": int, \"clarity\": int}\n"
                "}"
            )
            
            eval_prompt = f"""
Question: "{last_question}"
Candidate Answer: "{last_answer}"
Topic: {last_topic}
Expected scoring guideline:
- Empty/Wrong/Off-topic: 10-35
- Shallow/Vague: 36-55
- Correct but generic: 56-70
- Detailed and accurate: 71-85
- Thorough, complete, and optimal: 86-100
"""
            eval_res = _call_llm_json(eval_system, eval_prompt, temperature=0.3)
            scores_raw = eval_res.get("scores") or {}
            scores = {
                "confidence": max(0, min(100, int(scores_raw.get("confidence", 60)))),
                "technical": max(0, min(100, int(scores_raw.get("technical", 60)))),
                "communication": max(0, min(100, int(scores_raw.get("communication", 60)))),
                "clarity": max(0, min(100, int(scores_raw.get("clarity", 60))))
            }
            
            # Overall technical score
            primary_score = scores["technical"]
            
            evaluation = {
                "question": last_question,
                "answer": last_answer,
                "score": primary_score,
                "feedback": eval_res.get("feedback") or "Good answer. Try to go deeper into edge cases.",
                "tips": eval_res.get("tips") or [],
                "strengths": eval_res.get("strengths") or [],
                "improvements": eval_res.get("improvements") or [],
                "scores": scores,
                "topic": last_topic,
                "difficulty": session["difficulty_history"][-1] if session["difficulty_history"] else "Easy"
            }
            
            # Update answer history and statistics
            session["answer_history"].append(evaluation)
            
            # Check if user explicitly wants to end the interview
            wants_to_end = eval_res.get("wants_to_end", False)
            if wants_to_end:
                session["current_question_index"] = max_questions
            elif primary_score >= 70:
                # Answer is good -> Complete topic and move to next topic
                session["current_question_completed"] = True
                session["current_question_followup_count"] = 0
                session["current_question_index"] += 1
                if last_topic not in session["strong_topics"]:
                    session["strong_topics"].append(last_topic)
            else:
                # Answer is weak
                followup_count = session.get("current_question_followup_count", 0)
                max_followups = session.get("current_question_max_followups", 2)
                
                if followup_count < max_followups:
                    # Generate contextual follow-up
                    session["current_question_completed"] = False
                    session["current_question_followup_count"] = followup_count + 1
                else:
                    # Answer is still weak after maximum follow-ups
                    # Provide brief coaching tip, record weak score, move to next question
                    session["current_question_completed"] = True
                    session["current_question_followup_count"] = 0
                    session["current_question_index"] += 1
                    if last_topic not in session["weak_topics"]:
                        session["weak_topics"].append(last_topic)
                    
                    # Append coaching tip to feedback
                    coaching_tip = "\n\n[Recruiter Coaching] We've reached the follow-up limit on this topic. Note: When addressing these concepts, focus on explaining architectural trade-offs, scalability bottlenecks, and runtime complexity explicitly."
                    evaluation["feedback"] += coaching_tip

    # 3. Check Session Completion
    if session["current_question_index"] >= max_questions or len(session["asked_questions_text"]) >= max_questions:
        # Wrap up the interview
        session["status"] = "completed"
        report = generate_professional_report(session)
        session["report"] = report
        save_session_object(session)
        
        return {
            "interview_id": session["id"],
            "done": True,
            "closing": report["recommendation"],
            "feedback": "Session complete. Check your scores and download the report.",
            "tips": report["suggestions"],
            "strengths": report["strong_topics"],
            "improvements": report["weak_topics"],
            "scores": {
                "confidence": report["confidence_score"],
                "technical": report["technical_score"],
                "communication": report["communication_score"],
                "clarity": report["clarity_score"]
            },
            "report": report
        }

    # 4. Syllabus Navigation & Adaptive Selection
    current_topic = None
    target_difficulty = None
    next_question_data = None
    next_question_text = ""

    if session.get("current_question_completed", True):
        # Pick next topic
        covered_count = len(session["covered_topics"])
        topic_idx = covered_count % len(syllabus_topics) if syllabus_topics else 0
        current_topic = syllabus_topics[topic_idx] if syllabus_topics else "General Development"
        
        turn_idx = session["current_question_index"]
        diff_idx = min(turn_idx, len(diff_progression) - 1)
        target_difficulty = diff_progression[diff_idx]
        
        next_question_data = fetch_and_validate_question(
            session=session,
            topic=current_topic,
            difficulty=target_difficulty,
            user_id=user_id,
            is_followup=False
        )
        next_question_text = next_question_data["question"]
        session["current_question_main_text"] = next_question_text
        session["current_question_completed"] = False
        session["current_question_followup_count"] = 0
    else:
        # Follow-up Mode!
        current_topic = session["covered_topics"][-1] if session["covered_topics"] else syllabus_topics[0]
        target_difficulty = session["difficulty_history"][-1] if session["difficulty_history"] else "Easy"
        
        focus = get_followup_focus(interview_type, session["current_question_followup_count"])
        
        next_question_data = fetch_and_validate_question(
            session=session,
            topic=current_topic,
            difficulty=target_difficulty,
            user_id=user_id,
            is_followup=True,
            parent_question=session.get("current_question_main_text", ""),
            followup_focus=focus
        )
        
        if next_question_data.get("is_exhausted"):
            # If no unique follow-up can be generated, move to the next topic
            print("No unique follow-up generated. Skipping topic...")
            session["current_question_completed"] = True
            session["current_question_followup_count"] = 0
            session["current_question_index"] += 1
            
            # Recheck completion
            if session["current_question_index"] >= max_questions:
                session["status"] = "completed"
                report = generate_professional_report(session)
                session["report"] = report
                save_session_object(session)
                return {
                    "interview_id": session["id"],
                    "done": True,
                    "closing": report["recommendation"],
                    "feedback": "Session complete. Check your scores and download the report.",
                    "tips": report["suggestions"],
                    "strengths": report["strong_topics"],
                    "improvements": report["weak_topics"],
                    "scores": {
                        "confidence": report["confidence_score"],
                        "technical": report["technical_score"],
                        "communication": report["communication_score"],
                        "clarity": report["clarity_score"]
                    },
                    "report": report
                }
            
            covered_count = len(session["covered_topics"])
            topic_idx = covered_count % len(syllabus_topics) if syllabus_topics else 0
            current_topic = syllabus_topics[topic_idx] if syllabus_topics else "General Development"
            
            turn_idx = session["current_question_index"]
            diff_idx = min(turn_idx, len(diff_progression) - 1)
            target_difficulty = diff_progression[diff_idx]
            
            next_question_data = fetch_and_validate_question(
                session=session,
                topic=current_topic,
                difficulty=target_difficulty,
                user_id=user_id,
                is_followup=False
            )
            next_question_text = next_question_data["question"]
            session["current_question_main_text"] = next_question_text
            session["current_question_completed"] = False
            session["current_question_followup_count"] = 0
        else:
            next_question_text = next_question_data["question"]

    # 5. Save State
    session["asked_question_ids"].append(next_question_data.get("id"))
    session["asked_questions_text"].append(next_question_text)
    if current_topic not in session["covered_topics"]:
        session["covered_topics"].append(current_topic)
    session["difficulty_history"].append(target_difficulty)

    save_session_object(session)

    # 6. Build Response
    default_scores = {"confidence": 50, "technical": 50, "communication": 50, "clarity": 50}
    
    # 7. Conversational Smoothing
    chat_message = next_question_text
    if evaluation and evaluation.get("feedback"):
        system_smoothing = "You are a direct, professional technical interviewer."
        prompt_smoothing = f"""
We are in a mock interview. 
Candidate's last answer received this feedback: "{evaluation['feedback']}"
Next question to ask: "{next_question_text}"

Your task: Provide the interviewer's next spoken response. 
Briefly and naturally deliver the essence of the feedback (1-2 short sentences max), then directly ask the next question. 
Do NOT be overly polite, do not use corporate filler (e.g., "I want to start by saying", "Thank you for your response", "I appreciate your time"). Be concise, human, and direct.
If the candidate's answer was completely off-topic, just acknowledge it briefly and professionally, and move to the next question.
Do NOT use JSON. Do NOT include markdown. Output ONLY the spoken text.
"""
        try:
            smoothed = _call_llm_raw(system_smoothing, prompt_smoothing, temperature=0.6).strip()
            if smoothed:
                chat_message = smoothed
        except Exception as e:
            print(f"[interview_engine] Smoothing failed: {e}")
            chat_message = f"{evaluation['feedback']}\n\n{next_question_text}"
            
    return {
        "interview_id": session["id"],
        "question": next_question_text,
        "chat_message": chat_message,
        "feedback": evaluation["feedback"] if evaluation else "",
        "tips": evaluation["tips"] if evaluation else [],
        "strengths": evaluation["strengths"] if evaluation else [],
        "improvements": evaluation["improvements"] if evaluation else [],
        "scores": evaluation["scores"] if evaluation else default_scores,
        "done": False
    }
