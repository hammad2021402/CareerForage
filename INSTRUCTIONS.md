# Interview Studio — Drop-in Update

## Files to replace in your project:

### 1. Frontend (main change)
```
src/components/pages/FocusFlowArena.tsx  ← REPLACE
```

### 2. Backend (new file)
```
backend/app/interview.py                 ← ADD (new file)
backend/main.py                          ← REPLACE
```

---

## What's new:

### FocusFlowArena.tsx — Complete rewrite
- **3 phases**: Setup → Active Interview → Results
- **4 Interview Types**: Technical, Behavioral, System Design, HR Round
- **Voice Input**: Web Speech API mic button — speak your answers
- **Live Transcription**: See what you're saying in real time
- **AI Voice Output**: Interviewer reads questions aloud (toggle mute)
- **Webcam Feed**: Live camera preview with REC indicator (toggle in top bar)
- **AI Waveform**: Animated bars while AI is speaking
- **Live Analytics sidebar**:
  - Overall score + 4 sub-scores (Confidence, Technical, Communication, Clarity)
  - Real-time filler word tracker (um, uh, like, basically…)
  - Live AI feedback after each answer
  - Tips panel
  - STAR method coach (Behavioral mode)
- **Session timer** + word counter
- **Results page**: Full report with score breakdown, strengths, improvements, filler stats
- **Download Report**: Full transcript + scores as .txt file

### backend/app/interview.py — New module
- Type-aware prompting per interview type
- Groq → Gemini fallback chain
- Static fallback questions when AI unavailable
- `/interview/conduct` POST endpoint

### backend/main.py — Updated
- Registers the new `/interview` router

---

## Notes:
- Voice input works in Chrome, Edge, and Safari (not Firefox)
- Camera requires HTTPS or localhost
- The existing `/career/mock-interview` endpoint is still used (backward compatible)
- Route stays `/focus-arena` — nothing else needs to change
