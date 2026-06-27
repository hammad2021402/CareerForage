import os
import sys
import json
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import supabase

def run_diagnostics():
    print("=== Database Diagnostics ===")
    
    # 1. Check Profiles table
    try:
        profiles_res = supabase.table("profiles").select("*").limit(5).execute()
        print(f"Profiles: Found {len(profiles_res.data)} profiles.")
        if profiles_res.data:
            print("First Profile sample:", profiles_res.data[0])
    except Exception as e:
        print("Error reading profiles:", e)
        
    # 2. Check Lessons table
    try:
        lessons_res = supabase.table("lessons").select("id, title").limit(5).execute()
        print(f"Lessons: Found {len(lessons_res.data)} lessons.")
        if lessons_res.data:
            print("First Lesson sample:", lessons_res.data[0])
    except Exception as e:
        print("Error reading lessons:", e)
        
    # 3. Check User Progress table
    try:
        progress_res = supabase.table("user_progress").select("*").limit(5).execute()
        print(f"User Progress: Found {len(progress_res.data)} records.")
        if progress_res.data:
            print("First Progress sample:", progress_res.data[0])
    except Exception as e:
        print("Error reading user_progress:", e)

    # 4. Simulate a progress insert with "now()" to check for syntax/cast errors
    if profiles_res.data and lessons_res.data:
        test_user_id = profiles_res.data[0]["id"]
        test_lesson_id = lessons_res.data[0]["id"]
        print(f"\nTesting insert for user {test_user_id} and lesson {test_lesson_id} using 'now()':")
        try:
            res = supabase.table("user_progress").insert({
                "user_id": test_user_id,
                "lesson_id": test_lesson_id,
                "status": "completed",
                "completed_at": "now()"
            }).execute()
            print("Insert succeeded:", res.data)
            # Cleanup
            supabase.table("user_progress").delete().eq("user_id", test_user_id).eq("lesson_id", test_lesson_id).execute()
        except Exception as e:
            print("Insert failed. Error details:")
            print(e)
            print("Type of error:", type(e))

if __name__ == "__main__":
    run_diagnostics()
