-- ============================================
-- INTERVIEW MODULE TABLES
-- ============================================

-- Table for persistent interview questions (the question bank)
CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    subtopic TEXT,
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'expert'
    company TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    question TEXT NOT NULL UNIQUE,
    followups JSONB DEFAULT '[]'::jsonb,
    expected_points JSONB DEFAULT '[]'::jsonb,
    time_limit INTEGER DEFAULT 180,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for active/completed interview sessions
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    seniority TEXT NOT NULL,
    interview_type TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    asked_question_ids JSONB DEFAULT '[]'::jsonb,      -- JSON array of question IDs
    asked_questions_text JSONB DEFAULT '[]'::jsonb,    -- JSON array of question texts
    covered_topics JSONB DEFAULT '[]'::jsonb,          -- JSON array of covered topics
    difficulty_history JSONB DEFAULT '[]'::jsonb,      -- JSON array of difficulties asked
    answer_history JSONB DEFAULT '[]'::jsonb,          -- JSON array of turns: {question, answer, score, feedback, tips, strengths, improvements, scores}
    weak_topics JSONB DEFAULT '[]'::jsonb,             -- JSON array of weak topics
    strong_topics JSONB DEFAULT '[]'::jsonb,           -- JSON array of strong topics
    report JSONB,                                      -- Professional summary report on completion
    current_question_followup_count INTEGER DEFAULT 0,  -- Number of follow-ups asked for current question
    current_question_max_followups INTEGER DEFAULT 2,   -- Max follow-ups allowed for current question
    current_question_completed BOOLEAN DEFAULT TRUE,   -- Is the current question completed
    current_question_main_text TEXT,                   -- Text of the main question for follow-ups
    status TEXT DEFAULT 'active',                      -- 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view interview questions" ON public.interview_questions;
DROP POLICY IF EXISTS "Authenticated users can insert interview questions" ON public.interview_questions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.interview_sessions;

-- Policies for public.interview_questions
CREATE POLICY "Anyone can view interview questions"
    ON public.interview_questions FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert interview questions"
    ON public.interview_questions FOR INSERT
    WITH CHECK (true);

-- Policies for public.interview_sessions
CREATE POLICY "Users can manage their own sessions"
    ON public.interview_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions"
    ON public.interview_sessions FOR ALL
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_topic_difficulty ON public.interview_questions(topic, difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions(user_id);
