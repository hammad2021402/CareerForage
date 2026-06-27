from dotenv import load_dotenv
load_dotenv()  # MUST be first — loads .env before any app module reads os.getenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import auth, dashboard, learning, assessments, career, focus_flow, store, settings, accessibility, voice, gamification, ai, notes, code, interview

app = FastAPI(title="CareerForge AI Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/auth",          tags=["auth"])
app.include_router(dashboard.router,     prefix="/dashboard",     tags=["dashboard"])
app.include_router(learning.router,      prefix="/learning",      tags=["learning"])
app.include_router(assessments.router,   prefix="/assessments",   tags=["assessments"])
app.include_router(career.router,        prefix="/career",        tags=["career"])
app.include_router(focus_flow.router,    prefix="/focus-flow",    tags=["focus-flow"])
app.include_router(store.router,         prefix="/store",         tags=["store"])
app.include_router(gamification.router,  prefix="/gamification",  tags=["gamification"])
app.include_router(settings.router,      prefix="/settings",      tags=["settings"])
app.include_router(accessibility.router, prefix="/accessibility", tags=["accessibility"])
app.include_router(voice.router,         prefix="/voice",         tags=["voice"])
app.include_router(ai.router,            prefix="/api",           tags=["ai"])
app.include_router(notes.router,         prefix="/notes",         tags=["notes"])
app.include_router(code.router,          prefix="/code",          tags=["code"])
app.include_router(interview.router,     prefix="/interview",     tags=["interview"])

@app.get("/")
def read_root():
    return {"status": "ok", "service": "nexuslearn-backend"}


@app.get("/health")
def health():
    return {"status": "healthy"}
