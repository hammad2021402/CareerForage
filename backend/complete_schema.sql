-- NexusLearn AI - Complete Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- CORE USER TABLES
-- ============================================

-- Profiles table (already exists, adding missing columns if any)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- User preferences (add learning_goal if missing)
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS learning_goal TEXT DEFAULT 'web_development';

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'achievement', 'reminder', 'milestone'
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================
-- LEARNING PATH TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_hours INTEGER DEFAULT 40,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT DEFAULT 'interactive', -- 'interactive', 'read', 'watch'
    content TEXT, -- Markdown or HTML content for 'read' mode
    video_url TEXT, -- YouTube URL for 'watch' mode
    code_template TEXT, -- Starting code for 'interactive' mode
    language TEXT DEFAULT 'javascript', -- Programming language
    test_cases JSONB, -- Array of test cases for code execution
    order_index INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 50,
    difficulty TEXT DEFAULT 'easy',
    estimated_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
    code_submission TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Public read for learning content
CREATE POLICY "Anyone can view learning paths"
    ON public.learning_paths FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view modules"
    ON public.modules FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view lessons"
    ON public.lessons FOR SELECT
    USING (true);

-- Users can manage their own progress
CREATE POLICY "Users can view their own progress"
    ON public.user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON public.user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON public.user_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all progress"
    ON public.user_progress FOR ALL
    USING (true);

-- ============================================
-- ACHIEVEMENTS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🏆',
    type TEXT DEFAULT 'milestone', -- 'milestone', 'streak', 'skill', 'social'
    xp_reward INTEGER DEFAULT 100,
    criteria JSONB, -- JSON defining unlock criteria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
    ON public.achievements FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own unlocked achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert user achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (true);

-- ============================================
-- STORE & REDEMPTION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.redemption_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    xp_cost INTEGER NOT NULL,
    category TEXT DEFAULT 'reward',
    image_url TEXT,
    stock INTEGER DEFAULT -1, -- -1 for unlimited
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.redemption_items(id) ON DELETE SET NULL,
    xp_cost INTEGER NOT NULL,
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.redemption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active redemption items"
    ON public.redemption_items FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can view their own redemptions"
    ON public.user_redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage redemptions"
    ON public.user_redemptions FOR ALL
    USING (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson ON public.user_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON public.user_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_modules_path ON public.modules(learning_path_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_topic_difficulty ON public.interview_questions(topic, difficulty);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions(user_id);

