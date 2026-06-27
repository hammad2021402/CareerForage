# NexusLearn AI - Backend

This directory contains the Python FastAPI backend for the NexusLearn AI project.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Set up Supabase:**
    - Create a new project on [Supabase](https://supabase.com/).
    - Navigate to the "SQL Editor" and run the SQL commands from the `Database Schema` section below to create the necessary tables.
    - In your Supabase project, go to "Settings" -> "API".
    - Find your Project URL and `anon` key.

3.  **Environment Variables:**
    Create a `.env` file in this `backend` directory and add the following variables:

    ```
    SUPABASE_URL="YOUR_SUPABASE_URL"
    SUPABASE_KEY="YOUR_SUPABASE_ANON_KEY"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    ```

4.  **Run the Data Seeding Script:**
    To populate the database with initial mock data, run the following command:
    ```bash
    python seed_data.py
    ```

5.  **Run the Development Server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be available at `http://127.0.0.1:8000`.

---

## Database Schema

Here is the complete SQL schema for the Supabase Postgres database.

```sql
-- Profiles Table: Stores public user information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    xp_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0
);

-- User Preferences Table: Stores results from the initial assessment
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    learning_goal TEXT,
    skill_level TEXT,
    interests JSONB,
    learning_style TEXT
);

-- Courses Table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT
);

-- Modules Table
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL
);

-- Lessons Table
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'video', 'read', 'practice'
    content TEXT, -- URL for video, Markdown for read, JSON for practice
    xp_value INTEGER DEFAULT 10
);

-- User Progress Table: Tracks lesson completion
CREATE TABLE user_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

-- Achievements Table
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    xp_reward INTEGER
);

-- User Achievements Table: Links achievements to users
CREATE TABLE user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus Flow Leaderboard Table
CREATE TABLE focus_flow_leaderboard (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id TEXT,
    completion_time_seconds INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemption Store Items Table
CREATE TABLE redemption_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    xp_cost INTEGER NOT NULL
);

-- User Redemption Log Table
CREATE TABLE user_redemptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES redemption_items(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

```
