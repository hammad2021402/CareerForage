from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, raise_db_error, get_user_client
from app.auth import get_user
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

router = APIRouter()

ALL_ACHIEVEMENTS = {
    "first_topic": {
        "slug": "first_topic",
        "title": "First Step",
        "description": "Completed your first roadmap topic",
        "icon": "🎯",
        "type": "milestone",
        "xp_reward": 50
    },
    "level_2": {
        "slug": "level_2",
        "title": "Rising Star",
        "description": "Reached Level 2",
        "icon": "⭐",
        "type": "milestone",
        "xp_reward": 100
    },
    "xp_100": {
        "slug": "xp_100",
        "title": "Century Club",
        "description": "Earned 100 XP",
        "icon": "💯",
        "type": "milestone",
        "xp_reward": 100
    },
    "milestone_complete": {
        "slug": "milestone_complete",
        "title": "Milestone Crusher",
        "description": "Completed a learning milestone",
        "icon": "🏆",
        "type": "milestone",
        "xp_reward": 150
    },
    "roadmap_25": {
        "slug": "roadmap_25",
        "title": "Quarter Way There",
        "description": "Completed 25% of your roadmap",
        "icon": "🥉",
        "type": "progress",
        "xp_reward": 100
    },
    "roadmap_50": {
        "slug": "roadmap_50",
        "title": "Halfway Hero",
        "description": "Completed 50% of your roadmap",
        "icon": "🥈",
        "type": "progress",
        "xp_reward": 150
    },
    "roadmap_100": {
        "slug": "roadmap_100",
        "title": "Roadmap Master",
        "description": "Completed 100% of your roadmap",
        "icon": "🥇",
        "type": "progress",
        "xp_reward": 250
    }
}


def get_or_create_achievement_id(slug: str, user_client) -> Optional[str]:
    """Retrieves standard achievement ID by slug, inserting it if not found."""
    try:
        existing = user_client.table("achievements").select("id").eq("slug", slug).execute()
        if existing and existing.data:
            return existing.data[0]["id"]
        
        defn = ALL_ACHIEVEMENTS.get(slug)
        if not defn:
            return None
            
        res = user_client.table("achievements").insert({
            "slug": slug,
            "title": defn["title"],
            "description": defn["description"],
            "icon": defn["icon"],
            "type": defn["type"],
            "xp_reward": defn["xp_reward"]
        }).execute()
        
        if res and res.data:
            return res.data[0]["id"]
    except Exception as e:
        print(f"[get_or_create_achievement_id] error: {e}")
    return None


def update_user_streak(user_id: str, user_client):
    """Calculates and updates streaks daily activity in database using profile JSONB."""
    try:
        profile_res = user_client.table("profiles").select("current_streak, longest_streak, notification_preferences").eq("id", user_id).maybe_single().execute()
        if not profile_res or not profile_res.data:
            print("[gamification.py:update_user_streak:L100] Streak check returned None for user", user_id)
            return
            
        profile = profile_res.data
        current_streak = profile.get('current_streak', 0) or 0
        longest_streak = profile.get('longest_streak', 0) or 0
        prefs = profile.get('notification_preferences') or {}
        if not isinstance(prefs, dict):
            prefs = {}
            
        last_active_str = prefs.get('last_active_date')
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        if last_active_str:
            try:
                last_active = datetime.strptime(last_active_str, "%Y-%m-%d").date()
                today = datetime.now().date()
                diff = (today - last_active).days
                
                if diff == 1:
                    current_streak += 1
                elif diff > 1:
                    current_streak = 1
                # if diff == 0, keep streak unchanged
            except Exception:
                current_streak = 1
        else:
            current_streak = 1
            
        if current_streak > longest_streak:
            longest_streak = current_streak
            
        prefs['last_active_date'] = today_str
        
        user_client.table("profiles").update({
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "notification_preferences": prefs
        }).eq("id", user_id).execute()
    except Exception as e:
        print(f"[update_user_streak] error: {e}")


def check_and_unlock_achievements(user_id: str, user_client, total_topics: Optional[int] = None, mastered_topics: Optional[int] = None):
    """Evaluates and unlocks achievements dynamically, awarding XP and inserting notifications."""
    try:
        profile_res = user_client.table("profiles").select("xp_points, level").eq("id", user_id).maybe_single().execute()
        if not profile_res or not profile_res.data:
            print("[gamification.py:check_and_unlock_achievements:L147] Achievements check returned None for user", user_id)
            return
            
        profile = profile_res.data
        xp = profile.get("xp_points", 0) or 0
        level = profile.get("level", 1) or 1
        
        unlocked_slugs = []
        if level >= 2:
            unlocked_slugs.append("level_2")
        if xp >= 100:
            unlocked_slugs.append("xp_100")
            
        if mastered_topics is not None and mastered_topics > 0:
            unlocked_slugs.append("first_topic")
            if total_topics and total_topics > 0:
                pct = mastered_topics / total_topics
                if pct >= 0.25:
                    unlocked_slugs.append("roadmap_25")
                if pct >= 0.50:
                    unlocked_slugs.append("roadmap_50")
                if pct >= 1.0:
                    unlocked_slugs.append("roadmap_100")
                    
        if not unlocked_slugs:
            return
            
        # Get existing unlocked achievements IDs
        existing = user_client.table("user_achievements").select("achievement_id").eq("user_id", user_id).execute()
        existing_ids = [r["achievement_id"] for r in existing.data] if (existing and existing.data) else []
        
        for slug in unlocked_slugs:
            ach_id = get_or_create_achievement_id(slug, user_client)
            if ach_id and ach_id not in existing_ids:
                # Unlock!
                user_client.table("user_achievements").insert({
                    "user_id": user_id,
                    "achievement_id": ach_id
                }).execute()
                
                defn = ALL_ACHIEVEMENTS[slug]
                reward = defn["xp_reward"]
                new_xp = xp + reward
                
                new_level = level
                while new_xp >= new_level * 100:
                    new_level += 1
                    
                user_client.table("profiles").update({
                    "xp_points": new_xp,
                    "level": new_level
                }).eq("id", user_id).execute()
                
                # Update variables for next iterations
                xp = new_xp
                level = new_level
                
                # Insert achievement unlocked notification
                try:
                    user_client.table("notifications").insert({
                        "user_id": user_id,
                        "title": f"Achievement Unlocked: {defn['title']}",
                        "message": f"Congratulations! You've unlocked '{defn['title']}' and earned {reward} XP!",
                        "type": "achievement"
                    }).execute()
                except Exception:
                    pass
    except Exception as e:
        print(f"[check_and_unlock_achievements] error: {e}")


@router.get("/status")
def get_gamification_status(
    total_topics: Optional[int] = None,
    mastered_topics: Optional[int] = None,
    user: dict = Depends(get_user)
):
    """Get user's real database-backed gamification status including XP, level, streaks, and achievements"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        # Trigger dynamic checks
        update_user_streak(user_id, user_client)
        check_and_unlock_achievements(user_id, user_client, total_topics, mastered_topics)
        
        # Query updated profile (authoritative XP: xp_points)
        profile_res = user_client.table("profiles").select("xp_points, level, current_streak, longest_streak").eq("id", user_id).maybe_single().execute()
        profile = profile_res.data if (profile_res and profile_res.data) else {}
        
        xp = profile.get('xp_points', 0) or 0
        level = profile.get('level', 1) or 1
        current_streak = profile.get('current_streak', 0) or 0
        longest_streak = profile.get('longest_streak', 0) or 0
        
        # Calculate level progress (Level 1 is 0-99 XP, Level 2 is 100-199 XP, etc.)
        current_level_xp = (level - 1) * 100
        next_level_xp = level * 100
        xp_in_level = xp - current_level_xp
        xp_to_next = next_level_xp - xp
        level_progress = (xp_in_level / 100.0) * 100
        
        # Get actual week activity from user completions in user_progress
        week_activity = []
        try:
            start_date = datetime.now() - timedelta(days=6)
            progress_res = user_client.table("user_progress").select("completed_at").eq("user_id", user_id).gte("completed_at", start_date.strftime("%Y-%m-%d")).execute()
            completed_days = []
            if progress_res and progress_res.data:
                for row in progress_res.data:
                    c_at = row.get("completed_at")
                    if c_at:
                        completed_days.append(datetime.strptime(c_at[:10], "%Y-%m-%d").strftime("%a"))
            
            for i in range(7):
                date = datetime.now() - timedelta(days=6-i)
                day_name = date.strftime("%a")
                # Active if they have a completion record or if day falls within current streak count (fallback)
                is_active = day_name in completed_days or i < current_streak
                week_activity.append({
                    "day": day_name,
                    "active": is_active
                })
        except Exception:
            # Fallback week activity
            for i in range(7):
                date = datetime.now() - timedelta(days=6-i)
                week_activity.append({
                    "day": date.strftime("%a"),
                    "active": i < current_streak
                })

        # Get actual unlocked achievements joined with definitions
        achievements = []
        try:
            unlocked_res = user_client.table("user_achievements").select("achievements(*)").eq("user_id", user_id).execute()
            if unlocked_res and unlocked_res.data:
                for row in unlocked_res.data:
                    ach = row.get("achievements")
                    if ach:
                        achievements.append({
                            "id": ach.get("slug"),
                            "title": ach.get("title"),
                            "description": ach.get("description"),
                            "icon": ach.get("icon") or "🏆",
                            "type": ach.get("type", "milestone"),
                            "xp_reward": ach.get("xp_reward", 100)
                        })
        except Exception as err:
            print(f"[get_gamification_status] achievements join error: {err}")

        # Pending claims (empty list to avoid hardcoded mock claims popups)
        pending_claims = []
        
        return {
            "xp": xp,
            "total_xp": xp,
            "level": level,
            "current_level": level,
            "next_level_xp": next_level_xp,
            "nextLevelXp": next_level_xp,
            "current_level_xp": current_level_xp,
            "currentLevelXp": current_level_xp,
            "level_progress": level_progress,
            "levelProgress": level_progress,
            "xp_to_next": xp_to_next,
            "streak": {
                "current": current_streak,
                "current_streak": current_streak,
                "longest": longest_streak,
                "longest_streak": longest_streak,
                "total_days": current_streak,
                "totalDays": current_streak,
                "week": week_activity,
                "week_activity": week_activity,
                "recent_activity": week_activity
            },
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_days": current_streak,
            "week_activity": week_activity,
            "achievements": achievements,
            "pending_claims": pending_claims,
            "claims": pending_claims
        }
    except Exception as e:
        raise_db_error(e)


@router.post("/claim-xp")
def claim_xp(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """Claim pending XP"""
    return {
        "status": "success",
        "awarded_xp": 0,
        "total_xp": 0,
        "level": 1,
        "message": "Claims are fully integrated into direct completions."
    }


@router.post("/award-xp")
def award_xp(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """Award a specific amount of XP for completing a lesson or activity."""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        amount = int(payload.get('amount', 50))
        reason = str(payload.get('reason', 'activity'))
        amount = max(10, min(500, amount))

        profile_res = user_client.table("profiles").select("xp_points, level").eq("id", user_id).maybe_single().execute()
        if not profile_res or not profile_res.data:
            print("[gamification.py:award_xp:L358] Award XP returned None for user", user_id)
            raise HTTPException(status_code=404, detail="User profile not found")

        profile = profile_res.data
        current_xp = profile.get('xp_points', 0) or 0
        current_level = profile.get('level', 1) or 1
        new_xp = current_xp + amount

        new_level = current_level
        while new_xp >= new_level * 100:
            new_level += 1

        user_client.table("profiles").update({
            "xp_points": new_xp,
            "level": new_level
        }).eq("id", user_id).execute()

        leveled_up = new_level > current_level
        
        # Trigger streak and achievements checks
        update_user_streak(user_id, user_client)
        check_and_unlock_achievements(user_id, user_client)
        
        if leveled_up:
            try:
                user_client.table("notifications").insert({
                    "user_id": user_id,
                    "title": f"Level Up! You're now Level {new_level}",
                    "message": f"Congratulations! You've reached level {new_level}!",
                    "type": "milestone"
                }).execute()
            except Exception:
                pass

        return {
            "status": "success",
            "awarded_xp": amount,
            "total_xp": new_xp,
            "level": new_level,
            "leveled_up": leveled_up,
            "reason": reason,
            "message": f"Earned {amount} XP for {reason}!"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error awarding XP: {str(e)}")
        raise_db_error(e)


@router.get("/achievements")
def get_achievements(user: dict = Depends(get_user)):
    """Get user's achievements dynamically from database"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        achievements = []
        unlocked_res = user_client.table("user_achievements").select("achievements(*)").eq("user_id", user_id).execute()
        if unlocked_res and unlocked_res.data:
            for row in unlocked_res.data:
                ach = row.get("achievements")
                if ach:
                    achievements.append({
                        "id": ach.get("slug"),
                        "title": ach.get("title"),
                        "description": ach.get("description"),
                        "icon": ach.get("icon") or "🏆",
                        "type": ach.get("type", "milestone"),
                        "xp_reward": ach.get("xp_reward", 100)
                    })
        return achievements
    except Exception as e:
        raise_db_error(e)


@router.get("/claims")
def get_claims(user: dict = Depends(get_user)):
    """Get pending XP claims"""
    return []


@router.get("/streak")
def get_streak(user: dict = Depends(get_user)):
    """Get user's streak information"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        profile_res = user_client.table("profiles").select("current_streak, longest_streak").eq("id", user_id).maybe_single().execute()
        profile = profile_res.data if profile_res and profile_res.data else {}
        
        current_streak = profile.get('current_streak', 0) or 0
        longest_streak = profile.get('longest_streak', 0) or 0
        
        week_activity = []
        for i in range(7):
            date = datetime.now() - timedelta(days=6-i)
            week_activity.append({
                "day": date.strftime("%a"),
                "active": i < current_streak
            })
        
        return {
            "current": current_streak,
            "current_streak": current_streak,
            "longest": longest_streak,
            "longest_streak": longest_streak,
            "total_days": current_streak,
            "totalDays": current_streak,
            "week": week_activity,
            "week_activity": week_activity,
            "recent_activity": week_activity
        }
    except Exception as e:
        raise_db_error(e)
