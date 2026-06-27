import os



import google.generativeai as genai

from fastapi import APIRouter, Depends, HTTPException



from app.auth import get_user

from app.schemas import VoiceCommand



router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_gemini = None

if GEMINI_API_KEY:

    genai.configure(api_key=GEMINI_API_KEY)

    _gemini = genai.GenerativeModel(GEMINI_MODEL)



@router.post("/voice-command")

def voice_command(command: VoiceCommand, user: dict = Depends(get_user)):

    """Process voice commands and generate code"""

    if not command.command.strip():

        raise HTTPException(status_code=400, detail="command must not be empty")



    try:

        if not _gemini:

            return {

                "code": "// Add GEMINI_API_KEY in backend/.env to enable voice command code generation."

            }



        model = genai.GenerativeModel(

            GEMINI_MODEL,

            system_instruction="You are a code generation assistant. Return raw code only — no markdown fences, no explanation."

        )

        cfg = genai.GenerationConfig(temperature=0.2)

        resp = model.generate_content(

            f'Convert this voice command to code: "{command.command}"',

            generation_config=cfg,

        )

        generated = (resp.text or "").strip()

        return {"code": generated or "// No code generated."}

    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))

