"""
interview.py — Enhanced AI Mock Interview Module
Supports: Technical, Behavioral, System Design, HR Round
"""

import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

try:
    from app.auth import get_user
    from app.career import _call_groq_interview_json, _call_gemini_json
except ImportError:
    get_user = None

router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────
class InterviewTurn(BaseModel):
    role: str   # "coach" | "candidate"
    message: str


class InterviewRequest(BaseModel):
    role: str
    seniority: Optional[str] = "Mid-level"
    interview_type: Optional[str] = "technical"  # technical | behavioral | system-design | hr
    history: List[InterviewTurn] = []
    skills: Optional[List[str]] = []


class InterviewResponse(BaseModel):
    question: Optional[str] = None
    feedback: Optional[str] = None
    tips: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    follow_up: Optional[str] = None
    closing: Optional[str] = None
    done: Optional[bool] = False


# ─── Prompt builders ────────────────────────────────────────
TYPE_CONTEXT = {
    "technical": (
        "You are a senior technical interviewer at a top-tier tech company. "
        "Ask DSA, algorithms, system fundamentals, and coding-concept questions. "
        "After each candidate answer, give concise feedback on their technical accuracy, "
        "complexity analysis, and code quality. Then ask the next question."
    ),
    "behavioral": (
        "You are an experienced behavioral interviewer. Ask STAR-method situational questions "
        "about leadership, conflict, failure, teamwork, and growth. "
        "After each answer, evaluate how well they used the STAR framework, "
        "specificity of examples, and demonstrated impact."
    ),
    "system-design": (
        "You are a principal engineer conducting a system design interview. "
        "Ask about designing large-scale distributed systems (URL shortener, chat app, feed system, etc.). "
        "Probe for: requirements clarification, capacity estimation, high-level design, "
        "database choice, scalability, and tradeoffs. Evaluate completeness and depth."
    ),
    "hr": (
        "You are an HR manager conducting a culture-fit and soft-skills interview. "
        "Ask about motivation, salary expectations, career goals, values, "
        "work style, and company research. After each answer, give feedback on "
        "clarity, professionalism, and self-awareness."
    ),
}

FALLBACK_QUESTIONS = {
    "technical": [
        "Explain the difference between a stack and a queue. When would you use each?",
        "Walk me through how you'd implement a LRU cache. What data structures would you use?",
        "What is the time complexity of quicksort in the average and worst case? Why?",
        "How does a hash map handle collisions? Describe two approaches.",
        "Explain the concept of dynamic programming with an example.",
    ],
    "behavioral": [
        "Tell me about a time you faced a major technical challenge. How did you approach it?",
        "Describe a situation where you disagreed with a colleague's technical decision. What happened?",
        "Tell me about a project you're most proud of and your specific contribution.",
        "Give an example of a time you had to learn a new technology quickly under pressure.",
        "Tell me about a time you failed. What did you learn from it?",
    ],
    "system-design": [
        "Design a URL shortening service like bit.ly. Walk me through the architecture.",
        "How would you design a real-time chat application that supports millions of users?",
        "Design a news feed system like Twitter's timeline. What are the key challenges?",
        "How would you design a distributed cache system? What tradeoffs would you consider?",
        "Design an API rate limiter. What algorithms would you use?",
    ],
    "hr": [
        "Tell me about yourself and what brought you to apply for this role.",
        "What are your salary expectations for this position?",
        "Where do you see yourself in five years?",
        "What do you know about our company and why do you want to work here?",
        "What is your greatest professional strength and how does it apply to this role?",
    ],
}


def _build_system_prompt(role: str, seniority: str, interview_type: str) -> str:
    context = TYPE_CONTEXT.get(interview_type, TYPE_CONTEXT["technical"])
    return f"""
{context}

You are interviewing a candidate for a {seniority} {role} position.

Interview rules:
- Ask ONE focused question at a time
- After each candidate response, provide brief constructive feedback (2-3 sentences)
- Then immediately ask the next question
- After 6-8 exchanges, wrap up with closing remarks
- Always maintain a professional but encouraging tone

Respond ONLY with valid JSON in this exact format:
{{
  "question": "Your next interview question here",
  "feedback": "Feedback on their previous answer (empty string for first question)",
  "tips": ["tip1", "tip2"],
  "strengths": ["strength observed"],
  "improvements": ["area to improve"],
  "done": false
}}

When ending the session (after 6-8 questions), set done=true and include a "closing" field:
{{
  "done": true,
  "closing": "Thank you for your time. Overall assessment...",
  "feedback": "Final comprehensive feedback",
  "strengths": ["..."],
  "improvements": ["..."],
  "tips": ["..."]
}}
""".strip()


def _build_conversation_prompt(history: List[InterviewTurn]) -> str:
    if not history:
        return "Start the interview with your first question. The candidate is ready."
    
    lines = []
    for turn in history[-8:]:  # Last 8 turns to manage context
        speaker = "INTERVIEWER" if turn.role == "coach" else "CANDIDATE"
        lines.append(f"{speaker}: {turn.message}")
    
    lines.append("\nNow continue the interview. Respond with JSON as instructed.")
    return "\n".join(lines)


# ─── Endpoint ───────────────────────────────────────────────
@router.post("/conduct", response_model=InterviewResponse)
async def conduct_interview(payload: InterviewRequest):
    """Enhanced interview endpoint with type-specific prompting."""
    
    # Detect interview type from skills array or explicit field
    interview_type = payload.interview_type or "technical"
    if payload.skills:
        for skill in payload.skills:
            if skill in TYPE_CONTEXT:
                interview_type = skill
                break
    
    role_clean = payload.role.split("—")[0].split("(")[0].strip()
    system_prompt = _build_system_prompt(role_clean, payload.seniority or "Mid-level", interview_type)
    conversation_prompt = _build_conversation_prompt(payload.history)
    
    # Try Groq first, then Gemini
    try:
        from app.career import _groq_interview, _call_groq_interview_json
        if _groq_interview:
            data = _call_groq_interview_json(system_prompt, conversation_prompt)
            return InterviewResponse(**{k: v for k, v in data.items() if k in InterviewResponse.__fields__})
    except Exception:
        pass
    
    try:
        from app.career import _call_gemini_json
        data = _call_gemini_json(system_prompt, conversation_prompt)
        return InterviewResponse(**{k: v for k, v in data.items() if k in InterviewResponse.__fields__})
    except Exception:
        pass
    
    # Fallback: return static question
    questions = FALLBACK_QUESTIONS.get(interview_type, FALLBACK_QUESTIONS["technical"])
    q_index = len([t for t in payload.history if t.role == "coach"]) % len(questions)
    
    is_done = len(payload.history) >= 14
    if is_done:
        return InterviewResponse(
            done=True,
            closing=f"Thank you for completing this {interview_type} interview! You've shown good engagement. Review the analytics on the right for your performance breakdown.",
            feedback="Session complete. Check your scores and download the report.",
            tips=["Practice regularly", "Record yourself answering questions", "Review fundamentals"],
        )
    
    return InterviewResponse(
        question=questions[q_index],
        feedback="" if not payload.history else "Good effort! Keep going.",
        tips=["Be specific", "Think out loud"],
        strengths=[],
        improvements=[],
    )
