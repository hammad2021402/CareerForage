import base64
import json
import os
from io import BytesIO
from typing import Any, List, Optional, Union

from openai import OpenAI
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from PyPDF2 import PdfReader

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

_groq_client: Any = None
if GROQ_API_KEY:
    _groq_client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )


def _extract_groq_text(resp_obj) -> str:
    """
    openai/gpt-oss-20b returns a Responses-API envelope even when called via
    chat.completions.  The openai Python SDK exposes this through the raw
    response, so we check both shapes:
      - Responses format: resp.output  (list of content blocks)
      - Chat Completions format: resp.choices[0].message.content
    """
    # Shape 1 – Responses API (output list)
    output = getattr(resp_obj, "output", None)
    if output:
        for block in output:
            block_type = getattr(block, "type", None)
            if block_type == "message":
                content_list = getattr(block, "content", [])
                for c in content_list:
                    if getattr(c, "type", None) == "output_text":
                        text = getattr(c, "text", None)
                        if text:
                            return text
    # Shape 1b – top-level output_text shorthand
    output_text = getattr(resp_obj, "output_text", None)
    if output_text:
        return output_text
    # Shape 2 – standard Chat Completions
    try:
        return resp_obj.choices[0].message.content or ""
    except Exception:
        return ""


def _groq_chat(system: str, user: str, temperature: float = 0.4, json_mode: bool = False) -> str:
    """Single-turn Groq call. Returns text response."""
    if not _groq_client:
        raise RuntimeError("Groq client not initialised — check GROQ_API_KEY")

    system_content = system
    if json_mode:
        system_content += "\nRespond ONLY with valid JSON. Do not include markdown or code fences."

    resp = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=4096,
    )
    return _extract_groq_text(resp)


def _groq_multiturn(
    system: str,
    history: list[dict[str, str]],
    user_message: str,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> str:
    """Multi-turn Groq call. history items must have role+content."""
    if not _groq_client:
        raise RuntimeError("Groq client not initialised — check GROQ_API_KEY")

    system_content = system
    if json_mode:
        system_content += "\nRespond ONLY with valid JSON. Do not include markdown or code fences."

    messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
    for m in history:
        role = "assistant" if m["role"] in ("assistant", "model") else "user"
        messages.append({"role": role, "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    resp = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=4096,
    )
    return _extract_groq_text(resp)


class RoadmapRequest(BaseModel):
    target_role: str = Field(..., min_length=2, max_length=120)
    current_skills: Optional[Union[List[str], str]] = None
    resume_text: Optional[str] = Field(default=None, max_length=50000)
    resume_pdf_base64: Optional[str] = None
    max_nodes: int = Field(default=10, ge=4, le=20)


class RoadmapNode(BaseModel):
    class Config:
        extra = "allow"

    id: str
    type: str = "skillNode"
    position: dict[str, float]
    data: dict[str, Any]


class RoadmapEdge(BaseModel):
    class Config:
        extra = "allow"

    id: str
    source: str
    target: str
    type: str = "smoothstep"
    animated: bool = False


class RoadmapResponse(BaseModel):
    nodes: list[RoadmapNode]
    edges: list[RoadmapEdge]
    meta: dict[str, Any]


class InterviewHistoryMessage(BaseModel):
    role: str
    content: str


class NodeInterviewRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=180)
    message: str = Field(..., min_length=1, max_length=3000)
    target_role: Optional[str] = Field(default=None, max_length=120)
    difficulty: str = Field(default="intermediate", max_length=40)
    conversation_history: list[InterviewHistoryMessage] = Field(default_factory=list)


class NodeInterviewResponse(BaseModel):
    response: str
    follow_up_question: Optional[str] = None
    score: int
    strengths: list[str]
    improvements: list[str]
    topic: str
    strict_mode: bool = True


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=3000)
    lesson_id: Optional[str] = None
    code_context: Optional[str] = None
    conversation_history: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str


def _extract_resume_text_from_base64_pdf(encoded_pdf: str) -> str:
    if not encoded_pdf or not encoded_pdf.strip():
        return ""

    raw = base64.b64decode(encoded_pdf, validate=True)
    reader = PdfReader(BytesIO(raw))
    pages: list[str] = []

    for page in reader.pages:
        extracted = page.extract_text() or ""
        if extracted.strip():
            pages.append(extracted.strip())

    return "\n\n".join(pages).strip()


def _normalize_skills(current_skills: Optional[Union[list[str], str]]) -> list[str]:
    if current_skills is None:
        return []

    if isinstance(current_skills, list):
        normalized = [skill.strip() for skill in current_skills if isinstance(skill, str) and skill.strip()]
    else:
        normalized = [chunk.strip() for chunk in current_skills.split(",") if chunk.strip()]

    unique: list[str] = []
    seen: set[str] = set()
    for skill in normalized:
        key = skill.lower()
        if key not in seen:
            seen.add(key)
            unique.append(skill)
    return unique


def _fallback_graph(target_role: str, skills: list[str], max_nodes: int) -> dict[str, Any]:
    role_core = target_role.title()
    base_topics = [
        "Foundations",
        "Core Concepts",
        "Hands-on Projects",
        "System Design",
        "Interview Preparation",
        "Portfolio and Resume",
    ]

    if skills:
        base_topics.insert(1, f"Bridge from {skills[0]}")

    topics = base_topics[:max_nodes]
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    for index, topic in enumerate(topics):
        node_id = f"node-{index + 1}"
        x_position = float((index % 3) * 320)
        y_position = float((index // 3) * 220)
        nodes.append(
            {
                "id": node_id,
                "type": "skillNode",
                "position": {"x": x_position, "y": y_position},
                "data": {
                    "label": f"{role_core}: {topic}",
                    "level": "beginner" if index < 2 else "intermediate" if index < 4 else "advanced",
                    "estimatedHours": 10 + index * 4,
                    "status": "recommended",
                    "description": f"Targeted learning step for {role_core}.",
                },
            }
        )

        if index > 0:
            edges.append(
                {
                    "id": f"edge-{index}",
                    "source": f"node-{index}",
                    "target": node_id,
                    "type": "smoothstep",
                    "animated": True,
                }
            )

    return {"nodes": nodes, "edges": edges}


def _sanitize_llm_output(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    return cleaned.strip()


def _validate_graph_structure(payload: dict[str, Any], max_nodes: int) -> dict[str, Any]:
    nodes = payload.get("nodes")
    edges = payload.get("edges")

    if not isinstance(nodes, list) or not isinstance(edges, list):
        raise ValueError("Response must include 'nodes' and 'edges' arrays")

    if len(nodes) == 0:
        raise ValueError("nodes array is empty")

    bounded_nodes = nodes[:max_nodes]
    allowed_ids: set[str] = set()

    for index, node in enumerate(bounded_nodes):
        if not isinstance(node, dict):
            raise ValueError("Each node must be an object")

        node_id = str(node.get("id", f"node-{index + 1}")).strip()
        if not node_id:
            node_id = f"node-{index + 1}"

        allowed_ids.add(node_id)

        node["id"] = node_id
        node["type"] = str(node.get("type", "skillNode"))

        position = node.get("position")
        if not isinstance(position, dict):
            position = {}

        x_val = position.get("x", float((index % 3) * 320))
        y_val = position.get("y", float((index // 3) * 220))
        node["position"] = {"x": float(x_val), "y": float(y_val)}

        data = node.get("data")
        if not isinstance(data, dict):
            data = {}

        label = str(data.get("label") or data.get("title") or node_id.replace("-", " ").title())
        data["label"] = label
        data.setdefault("level", "intermediate")
        data.setdefault("estimatedHours", 12)
        data.setdefault("status", "recommended")
        data.setdefault("description", f"Learning target: {label}")
        node["data"] = data

    normalized_edges: list[dict[str, Any]] = []
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            continue

        source = str(edge.get("source", "")).strip()
        target = str(edge.get("target", "")).strip()
        if source not in allowed_ids or target not in allowed_ids:
            continue

        normalized_edges.append(
            {
                "id": str(edge.get("id", f"edge-{index + 1}")),
                "source": source,
                "target": target,
                "type": str(edge.get("type", "smoothstep")),
                "animated": bool(edge.get("animated", True)),
            }
        )

    if not normalized_edges and len(bounded_nodes) > 1:
        for index in range(1, len(bounded_nodes)):
            normalized_edges.append(
                {
                    "id": f"edge-auto-{index}",
                    "source": bounded_nodes[index - 1]["id"],
                    "target": bounded_nodes[index]["id"],
                    "type": "smoothstep",
                    "animated": True,
                }
            )

    return {"nodes": bounded_nodes, "edges": normalized_edges}


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    if not _groq_client:
        return ChatResponse(
            response="AI tutor is in fallback mode. Add GROQ_API_KEY in backend/.env to enable full responses."
        )

    system = (
        "You are a concise coding tutor. Give practical explanations, avoid fluff, "
        "and prefer step-by-step help with clear examples when useful."
    )
    if payload.code_context and payload.code_context.strip():
        system += f"\n\nCode context:\n{payload.code_context.strip()}"

    history = [
        {"role": m.get("role", "user"), "content": str(m.get("content", "")).strip()}
        for m in payload.conversation_history[-8:]
        if str(m.get("content", "")).strip() and m.get("role") in ("user", "assistant", "model")
    ]

    try:
        text = _groq_multiturn(system, history, payload.message.strip(), temperature=0.4)
        return ChatResponse(response=text.strip() or "Please clarify your question.")
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Groq chat request failed: {error}") from error


@router.post("/generate-roadmap", response_model=RoadmapResponse)
def generate_roadmap(payload: RoadmapRequest) -> RoadmapResponse:
    if not payload.target_role or not payload.target_role.strip():
        raise HTTPException(status_code=400, detail="target_role must not be empty")

    normalized_skills = _normalize_skills(payload.current_skills)

    parsed_resume_text = ""
    if payload.resume_pdf_base64:
        try:
            parsed_resume_text = _extract_resume_text_from_base64_pdf(payload.resume_pdf_base64)
        except Exception as error:
            raise HTTPException(status_code=400, detail=f"Invalid resume_pdf_base64: {error}") from error

    raw_resume = (payload.resume_text or "").strip()
    merged_resume = (raw_resume + "\n\n" + parsed_resume_text).strip()

    if not normalized_skills and not merged_resume:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one of current_skills, resume_text, or resume_pdf_base64",
        )

    if not _groq_client:
        fallback = _fallback_graph(payload.target_role, normalized_skills, payload.max_nodes)
        validated = _validate_graph_structure(fallback, payload.max_nodes)
        return RoadmapResponse(
            nodes=validated["nodes"],
            edges=validated["edges"],
            meta={
                "targetRole": payload.target_role,
                "source": "fallback_no_groq_key",
                "skillsCount": len(normalized_skills),
                "resumeTextLength": len(merged_resume),
                "model": "none",
            },
        )

    system_prompt = (
        "You are a roadmap compiler for an AI education platform. "
        "Return only valid JSON with this exact top-level shape: "
        '{"nodes": [...], "edges": []} and no extra top-level keys. '
        "Do not include markdown, prose, comments, or code fences. "
        "Each node must contain id, type, position, data. "
        "Node.type must be 'skillNode'. Position must include numeric x and y. "
        "Node.data must include label, level, estimatedHours, status, description. "
        "Each edge must contain id, source, target, type, animated. "
        "Edge.type must be 'smoothstep'. "
        "Use a DAG progression from fundamentals to advanced topics. "
        "Maximize relevance to the target role and existing skills. "
        "Never output HTML or non-JSON text."
    )

    user_prompt = json.dumps({
        "targetRole": payload.target_role,
        "currentSkills": normalized_skills,
        "resumeText": merged_resume[:8000],
        "constraints": {
            "maxNodes": payload.max_nodes,
            "minNodes": 6,
            "allowParallelTracks": True,
            "includeMilestoneNodes": True,
            "levels": ["beginner", "intermediate", "advanced"],
        },
    }, ensure_ascii=False)

    try:
        raw_content = _groq_chat(system_prompt, user_prompt, temperature=0.2, json_mode=True)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Groq roadmap request failed: {error}") from error

    if not raw_content.strip():
        raise HTTPException(status_code=502, detail="Groq returned an empty response")

    try:
        parsed = json.loads(_sanitize_llm_output(raw_content))
        validated = _validate_graph_structure(parsed, payload.max_nodes)
    except Exception as error:
        fallback = _fallback_graph(payload.target_role, normalized_skills, payload.max_nodes)
        validated = _validate_graph_structure(fallback, payload.max_nodes)
        return RoadmapResponse(
            nodes=validated["nodes"],
            edges=validated["edges"],
            meta={
                "targetRole": payload.target_role,
                "source": "fallback_after_parse_error",
                "skillsCount": len(normalized_skills),
                "resumeTextLength": len(merged_resume),
                "model": GROQ_MODEL,
                "reason": str(error),
            },
        )

    return RoadmapResponse(
        nodes=validated["nodes"],
        edges=validated["edges"],
        meta={
            "targetRole": payload.target_role,
            "source": "groq",
            "skillsCount": len(normalized_skills),
            "resumeTextLength": len(merged_resume),
            "model": GROQ_MODEL,
        },
    )


@router.post("/node-interview", response_model=NodeInterviewResponse)
def node_interview(payload: NodeInterviewRequest) -> NodeInterviewResponse:
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic must not be empty")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message must not be empty")

    safe_difficulty = payload.difficulty.strip().lower() or "intermediate"
    if safe_difficulty not in {"beginner", "intermediate", "advanced"}:
        safe_difficulty = "intermediate"

    role_context = payload.target_role.strip() if payload.target_role else "Software Engineer"

    if not _groq_client:
        fallback_question = f"How would you apply {topic} in a real {role_context} scenario?"
        return NodeInterviewResponse(
            response=(
                f"Interviewer Feedback: Good start on {topic}. Clarify your assumptions, explain trade-offs, "
                "and provide one concrete implementation detail."
            ),
            follow_up_question=fallback_question,
            score=72,
            strengths=["Relevant answer", "Clear communication"],
            improvements=["Include complexity analysis", "Cover edge cases and failure handling"],
            topic=topic,
            strict_mode=True,
        )

    history_messages = [
        {
            "role": "assistant" if item.role.lower() in {"assistant", "ai", "interviewer", "model"} else "user",
            "content": item.content,
        }
        for item in payload.conversation_history[-10:]
        if item.content.strip()
    ]

    system_prompt = (
        "You are a strict technical interviewer for a national-level hackathon demo. "
        "Your behavior rules are mandatory: "
        "1) Ask and evaluate only within the specified topic. "
        "2) Be concise, direct, and technically rigorous. "
        "3) Score the candidate from 0 to 100 based on correctness, depth, and clarity. "
        "4) Give exactly 2 strengths and exactly 2 improvements. "
        "5) Always include one follow-up interview question. "
        "6) Return valid JSON only with keys: response, follow_up_question, score, strengths, improvements."
    )

    interviewer_context = json.dumps({
        "topic": topic,
        "target_role": role_context,
        "difficulty": safe_difficulty,
        "candidate_message": message,
        "interview_contract": {
            "response_style": "strict interviewer",
            "max_response_sentences": 5,
            "strengths_count": 2,
            "improvements_count": 2,
        },
    }, ensure_ascii=False)

    try:
        raw_content = _groq_multiturn(
            system_prompt, history_messages, interviewer_context,
            temperature=0.25, json_mode=True,
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Groq interview request failed: {error}") from error

    if not raw_content.strip():
        raise HTTPException(status_code=502, detail="Groq returned empty interview response")

    try:
        parsed = json.loads(_sanitize_llm_output(raw_content))
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Failed to parse Groq interview response: {error}") from error

    response_text = str(parsed.get("response") or "Please explain your reasoning in more depth.").strip()
    follow_up_question = str(parsed.get("follow_up_question") or f"What trade-offs exist when using {topic}?").strip()

    try:
        numeric_score = int(parsed.get("score", 70))
    except Exception:
        numeric_score = 70
    numeric_score = max(0, min(100, numeric_score))

    raw_strengths = parsed.get("strengths") if isinstance(parsed.get("strengths"), list) else []
    raw_improvements = parsed.get("improvements") if isinstance(parsed.get("improvements"), list) else []

    strengths = [str(item).strip() for item in raw_strengths if str(item).strip()][:2]
    improvements = [str(item).strip() for item in raw_improvements if str(item).strip()][:2]

    if len(strengths) < 2:
        strengths.extend(["Relevant domain understanding", "Clear attempt at structured explanation"][len(strengths):2])
    if len(improvements) < 2:
        improvements.extend(["Increase technical depth", "Discuss edge cases and constraints"][len(improvements):2])

    return NodeInterviewResponse(
        response=response_text,
        follow_up_question=follow_up_question,
        score=numeric_score,
        strengths=strengths,
        improvements=improvements,
        topic=topic,
        strict_mode=True,
    )