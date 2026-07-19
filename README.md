# CareerForge — Intelligent Career Readiness Platform

> **India's #1 AI Career Copilot for Students** · Full-Stack · India-First

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai)](https://openai.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)

---

## What is CareerForge?

CareerForge closes the **skill-to-job gap** for Indian tech students using 8 AI engines powered by live Naukri, LinkedIn India, and Glassdoor demand signals. From resume upload to offer letter — in one platform.

---

## 8 Core AI Engines

| # | Engine | Description |
|---|--------|-------------|
| 1 | **Smart Entry & Deadline** | Resume dropzone (PDF/DOC), 18-career selector, job-ready deadline picker (1m/3m/6m/1yr) with adaptive pacing |
| 2 | **Skill Gap Intelligence** | "You are 62% ready for Data Scientist." — India-first demand signals from Naukri, LinkedIn India, Glassdoor |
| 3 | **Adaptive Roadmap** | ReactFlow 2.5D skill graph — pulsing nodes, right-click context menu, quiz-triggered mutations, project nodes |
| 4 | **Persistent AI Mentor** | "Rishi" — Senior SWE @ Google India persona, deadline-aware, persists full conversation across sessions |
| 5 | **Pro Mock Interview** | Split-screen: chat + live analytics (Confidence Score, Technical Score, instant feedback per answer) |
| 6 | **AI Quiz + Closed Loop** | Score ≥70 marks node mastered; <70 injects Review Node into roadmap with smooth transition |
| 7 | **Gamification Dashboard** | XP counter, streak flame, level progress ring, Bento Grid layout, week activity grid |
| 8 | **Focus Mode Extension** | Chrome MV3 extension blocks 12 distracting sites with Pomodoro timer + violet/cyan branded popup |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18, Python ≥ 3.11
- Supabase project (free tier works)
- OpenAI API key (app runs in fallback mode without it)

### Frontend
```bash
# 1. Install dependencies
npm install

# 2. Set environment
cp .env.example .env
# Edit .env → set VITE_API_URL=http://localhost:8000

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend

# 1. Install Python deps
pip install -r requirements.txt

# 2. Set environment
cp .env.example .env
# Edit backend/.env — see required keys below

# 3. Run the database schema
# (in your Supabase SQL editor)
# paste contents of: backend/complete_schema.sql

# 4. Start FastAPI
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

---

## Required Environment Variables

### Frontend (`/.env`)
| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | `http://localhost:8000` | ✅ |

### Backend (`/backend/.env`)
| Variable | Where to get | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) | ✅ AI features |
| `OPENAI_MODEL` | `gpt-4o-mini` | ✅ |
| `SUPABASE_URL` | Supabase Project → Settings → API | ✅ Auth + DB |
| `SUPABASE_KEY` | Supabase Project → Settings → API → service_role | ✅ Auth + DB |
| `JUDGE0_API_URL` | [rapidapi.com/judge0](https://rapidapi.com/judge0-official/api/judge0-ce) | ⬜ Code runner |
| `JUDGE0_API_KEY` | RapidAPI key | ⬜ Code runner |


> **No OpenAI key?** The app runs gracefully in fallback mode — roadmap generation returns structured placeholder data, chat returns a helpful message.

---

## Tech Stack

### Frontend
- **React 18** + **Vite 5** + **TypeScript 5**
- **Tailwind CSS** — Design Bible: `#000000` bg, `#0a0a0a` cards, violet→cyan gradient
- **Framer Motion** — 60fps micro-interactions, scale hover states
- **ReactFlow** — 2.5D adaptive skill graph with custom pulsing nodes
- **react-dropzone** — Resume upload with PDF base64 parsing
- **recharts** — XP bar charts in Study Analytics
- **class-variance-authority** — Type-safe component variants

### Backend
- **FastAPI** + **Python 3.11**
- **Supabase** — Auth (JWT), PostgreSQL database
- **OpenAI GPT-4o-mini** — Roadmap, skill gap, mentor, interview, quiz evaluation
- **PyPDF2** — Resume PDF text extraction

---

## Project Structure

```
careerforge/
├── src/
│   ├── components/
│   │   ├── auth/        Welcome.tsx          — Split-screen auth + onboarding wizard
│   │   ├── dashboard/   SkillGapEngine.tsx   — India-first AI skill gap widget
│   │   │                AIMentor.tsx         — Persistent Rishi mentor chat
│   │   ├── pages/       Dashboard.tsx        — 12-col Bento Grid
│   │   │                LearningPathView.tsx — ReactFlow adaptive roadmap
│   │   │                FocusFlowArena.tsx   — Mock interview split-screen
│   │   │                ZenGarden.tsx        — Study analytics dashboard
│   │   ├── layout/      NavHeaderEnhanced.tsx — Low Data Mode toggle + XP badge
│   │   └── ui/          Button, Card, Skeleton, Badge, Input
│   ├── services/        api.ts               — All 40+ backend endpoints typed
│   └── context/         UserContext.tsx      — Auth + token persistence
├── backend/
│   ├── app/
│   │   ├── ai.py        — GPT-4o roadmap, chat, node-interview
│   │   ├── auth.py      — Supabase auth (register/login/me/logout)
│   │   ├── career.py    — Job listings, mock interview, resume review
│   │   ├── gamification.py — XP, streaks, achievements
│   │   └── store.py     — XP reward redemption store
│   └── main.py          — FastAPI app + CORS
├── chrome-extension/    — Manifest V3 focus blocker (12 sites, Pomodoro timer)
└── .env.example
```

---

## Chrome Extension Setup

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load Unpacked** → select `chrome-extension/` folder
4. The CareerForge Focus Mode icon appears in your toolbar
5. Click it to start a Pomodoro session with site blocking

---

## Design System

All UI follows a strict **Design Bible**:
- **Background:** `#000000`
- **Cards:** `#0a0a0a` with `border-white/[0.08]`
- **Accent:** Violet (`#8b5cf6`) → Cyan (`#06b6d4`) gradient — used ONLY for CTAs, active nodes, glow effects
- **Font:** Inter variable (all weights, single network request)
- **Spacing:** Strict 8px scale
- **Low Data Mode:** Toggle in nav adds `.low-data-mode` to `<html>` — kills all animations instantly for low-connectivity regions

---

## SIH Problem Statement Alignment

This project addresses **SIH Problem Statement: AI-Powered Career Guidance for Students** with:
- ✅ India-first: Naukri, LinkedIn India, Glassdoor demand signals
- ✅ Accessibility: Dyslexic font, high contrast, font size controls, Low Data Mode
- ✅ Offline-resilient: localStorage persistence — resume, roadmap, mentor history survive page refresh
- ✅ Multilingual-ready: Architecture supports i18n (not yet implemented)
- ✅ Free to use: No subscription, works with free Supabase + OpenAI free tier

---

*Built with ❤️ in India*
