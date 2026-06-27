from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, raise_db_error, get_user_client
from app.auth import get_user

router = APIRouter()

@router.get("/")
def get_dashboard(user: dict = Depends(get_user)):
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])

        # Fetch all necessary data in parallel
        profile_res = user_client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        progress_res = user_client.table("user_progress").select("lesson_id").eq("user_id", user_id).execute()
        achievements_res = user_client.table("user_achievements").select("achievement_id").eq("user_id", user_id).execute()

        profile = {}
        if profile_res and profile_res.data:
            profile = profile_res.data
        else:
            print("[dashboard.py:get_dashboard:L17] Profile query for endpoint /dashboard/ returned None")

        progress_data = progress_res.data if (progress_res and progress_res.data) else []
        achievements_data = achievements_res.data if (achievements_res and achievements_res.data) else []
        
        # Constructing the response
        dashboard_data = {
            "contextualGreeting": f"Welcome back, {profile.get('full_name', 'User')}!",
            "todaysFocus": "Mastering React Hooks", # This would be dynamic in a real app
            "learningPath": {
                "nodes": [], # Placeholder
                "connections": [], # Placeholder
                "completionStatus": len(progress_data)
            },
            "motivationStreak": {
                "current": profile.get('current_streak', 0),
                "longest": profile.get('longest_streak', 0)
            },
            "skillNavigator": [], # Placeholder
            "achievements": [a['achievement_id'] for a in achievements_data],
            "recentActivity": [] # Placeholder
        }
        return dashboard_data
    except Exception as e:
        raise_db_error(e)
