import json
import os
from typing import Any

from openai import OpenAI
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

_groq_client: Any = None
if GROQ_API_KEY:
    _groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )


def _chat_json(system: str, user: str, temperature: float = 0.4) -> dict:
    """Single-turn Groq call that returns a parsed JSON dict."""
    if not _groq_client:
        raise RuntimeError("Groq client not initialised — check GROQ_API_KEY")

    resp = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system + "\nRespond ONLY with valid JSON. Do not include markdown or code fences."},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=4096,
    )
    text = resp.choices[0].message.content or "{}"
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


# ── Request / Response models ──────────────────────────────

class SummaryRequest(BaseModel):
    title: str = Field(..., max_length=200)
    content: str = Field(..., min_length=10, max_length=20000)


class SummaryResponse(BaseModel):
    summary: str
    key_points: list[str]
    topics: list[str]
    difficulty: str


class QuizRequest(BaseModel):
    title: str = Field(..., max_length=200)
    content: str = Field(..., min_length=10, max_length=20000)
    num_questions: int = Field(default=5, ge=3, le=10)


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]
    topic: str
    difficulty: str


# ── Endpoints ──────────────────────────────────────────────

@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(req: SummaryRequest):
    try:
        data = _chat_json(
            system="""You are an expert study assistant. Analyse the provided notes and return a JSON object with exactly these keys:
- "summary": 2-4 sentence overview (string)
- "key_points": list of 5-7 concise bullet-point strings (each under 20 words)
- "topics": list of 3-5 topic/tag strings
- "difficulty": one of "beginner" | "intermediate" | "advanced"

Return ONLY valid JSON, no markdown, no extra text.""",
            user=f"Note title: {req.title}\n\nContent:\n{req.content}",
        )
        return SummaryResponse(
            summary=str(data.get("summary", "Summary unavailable.")),
            key_points=[str(p) for p in data.get("key_points", [])],
            topics=[str(t) for t in data.get("topics", [])],
            difficulty=str(data.get("difficulty", "intermediate")),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Summary failed: {exc}") from exc


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    try:
        data = _chat_json(
            system=f"""You are a quiz generator. Create exactly {req.num_questions} multiple-choice questions from the notes.
Each question must test understanding and application, not just recall.

Return ONLY valid JSON:
{{
  "topic": "main topic name",
  "difficulty": "beginner|intermediate|advanced",
  "questions": [
    {{
      "question": "Question text?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A) ...",
      "explanation": "One sentence explaining why this is correct."
    }}
  ]
}}""",
            user=f"Note title: {req.title}\n\nContent:\n{req.content}",
            temperature=0.5,
        )
        questions = [
            QuizQuestion(
                question=str(q.get("question", "")),
                options=[str(o) for o in q.get("options", [])],
                answer=str(q.get("answer", "")),
                explanation=str(q.get("explanation", "")),
            )
            for q in data.get("questions", [])
        ]
        return QuizResponse(
            questions=questions,
            topic=str(data.get("topic", req.title)),
            difficulty=str(data.get("difficulty", "intermediate")),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quiz failed: {exc}") from exc
