import json
import os

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_user
from app.database import supabase

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_gemini = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    _gemini = genai.GenerativeModel(GEMINI_MODEL)

@router.get("/")
def get_assessments(user: dict = Depends(get_user)):
    # In a real app, this would be personalized. For now, returning all.
    try:
        # This is a placeholder. You'd have an 'assessments' table.
        assessments = [
            {"id": 1, "title": "React Fundamentals"},
            {"id": 2, "title": "Advanced Python Concepts"}
        ]
        return assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grade")
def grade_assessment(payload: dict, user: dict = Depends(get_user)):
    """
    Grade an assessment answer using Gemini Flash.
    Expects: question, answer, (optional) max_score, language
    Returns: score, strengths, improvements, suggestions, feedback
    """
    if not _gemini:
        return {
            "score": 75,
            "max_score": 100,
            "strengths": ["Good understanding of basic concepts"],
            "improvements": ["Could provide more detailed examples"],
            "suggestions": ["Try to elaborate on edge cases"],
            "feedback": "Your answer demonstrates a solid grasp of the fundamentals. To improve, consider providing more specific examples and discussing potential edge cases."
        }

    question  = payload.get('question', '')
    answer    = payload.get('answer', '')
    max_score = payload.get('max_score', 100)
    language  = payload.get('language', 'general')

    system = (
        f"You are an expert programming educator specialising in {language}. "
        "Provide detailed, constructive feedback. Respond ONLY with valid JSON."
    )
    prompt = (
        f"Grade the following answer.\n\nQUESTION:\n{question}\n\nSTUDENT ANSWER:\n{answer}\n\n"
        f'Return JSON with keys: score (0-{max_score}), strengths (list), improvements (list), suggestions (list), feedback (string).'
    )

    try:
        model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
        cfg   = genai.GenerationConfig(temperature=0.5, response_mime_type="application/json")
        resp  = model.generate_content(prompt, generation_config=cfg)
        feedback_json = json.loads(resp.text or "{}")
        feedback_json["max_score"] = max_score
        return feedback_json
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse Gemini response")
    except Exception as e:
        print(f"Error in grade_assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
