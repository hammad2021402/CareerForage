from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, get_user_client
from app.auth import get_user

router = APIRouter()

@router.get("/challenges")
def get_challenges(user: dict = Depends(get_user)):
    try:
        # Placeholder data
        challenges = [
            {"id": "c1", "track": "Lofi Beats", "challenge": "Implement a debounce function."},
            {"id": "c2", "track": "Synthwave", "challenge": "Solve a palindrome problem."}
        ]
        return challenges
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete")
def complete_challenge(payload: dict, user: dict = Depends(get_user)):
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        user_client.table("focus_flow_leaderboard").insert({
            "user_id": user_id,
            "challenge_id": payload.get("challenge_id"),
            "completion_time_seconds": payload.get("completion_time_seconds")
        }).execute()
        return {"message": "Challenge completion recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
