from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, raise_db_error, get_user_client
from app.auth import get_user
from app.schemas import ProfileUpdate
from typing import Dict, Any
from pydantic import BaseModel, EmailStr

router = APIRouter()

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    email: bool = True
    in_app: bool = True
    achievements: bool = True
    reminders: bool = True
    weekly_summary: bool = True

@router.get("/profile")
def get_profile(user: dict = Depends(get_user)):
    """Get user profile settings"""
    try:
        user_id = user['id']
        
        user_client = get_user_client(user["token"])
        
        # Get full profile
        profile_res = user_client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        
        if not profile_res or not profile_res.data:
            print(f"[settings.py:get_profile:L30] Profile query returned None for user {user_id}")
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Get preferences
        prefs_res = user_client.table("user_preferences").select("*").eq("user_id", user_id).maybe_single().execute()
        prefs_data = prefs_res.data if (prefs_res and prefs_res.data) else {}
        if not prefs_res or not prefs_res.data:
            print(f"[settings.py:get_profile:L34] User preferences query returned None for user {user_id}")
        
        return {
            "profile": profile_res.data,
            "preferences": prefs_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_error(e)

@router.post("/profile")
def update_profile(profile_update: ProfileUpdate, user: dict = Depends(get_user)):
    """Update user profile information"""
    try:
        user_id = user['id']
        update_data = profile_update.dict(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
            
        user_client = get_user_client(user["token"])
        result = user_client.table("profiles").update(update_data).eq("id", user_id).execute()
        
        if not result or not result.data:
            print(f"[settings.py:update_profile:L57] Profile update query returned None for user {user_id}")
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile updated successfully", "profile": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise_db_error(e)

@router.post("/password")
def change_password(password_data: PasswordChange, user: dict = Depends(get_user)):
    """Change user password"""
    try:
        # Update password using Supabase Auth
        result = supabase.auth.update_user({
            "password": password_data.new_password
        })
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to update password")
        
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise_db_error(e)

@router.get("/notifications/preferences")
def get_notification_preferences(user: dict = Depends(get_user)):
    """Get notification preferences"""
    try:
        user_id = user['id']
        
        user_client = get_user_client(user["token"])
        profile_res = user_client.table("profiles").select("notification_preferences").eq("id", user_id).maybe_single().execute()
        
        if not profile_res or not profile_res.data:
            print(f"[settings.py:get_notification_preferences:L90] Profile notification_preferences query returned None for user {user_id}")
            # Return defaults if not found
            return {
                "email": True,
                "in_app": True,
                "achievements": True,
                "reminders": True,
                "weekly_summary": True
            }
        
        prefs = profile_res.data.get('notification_preferences', {}) if profile_res.data else {}
        return prefs
    except Exception as e:
        raise_db_error(e)

@router.post("/notifications/preferences")
def update_notification_preferences(prefs: NotificationPreferences, user: dict = Depends(get_user)):
    """Update notification preferences"""
    try:
        user_id = user['id']
        
        prefs_dict = prefs.dict()
        
        user_client = get_user_client(user["token"])
        result = user_client.table("profiles").update({
            "notification_preferences": prefs_dict
        }).eq("id", user_id).execute()
        
        if not result or not result.data:
            print(f"[settings.py:update_notification_preferences:L117] Profile update query returned None for user {user_id}")
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Notification preferences updated", "preferences": prefs_dict}
    except Exception as e:
        raise_db_error(e)

@router.get("/notifications")
def get_notifications(user: dict = Depends(get_user), unread_only: bool = False):
    """Get user notifications"""
    try:
        user_id = user['id']
        
        user_client = get_user_client(user["token"])
        query = user_client.table("notifications").select("*").eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        notifications_res = query.order("created_at", desc=True).limit(50).execute()
        
        return notifications_res.data if (notifications_res and notifications_res.data) else []
    except Exception as e:
        raise_db_error(e)

@router.post("/notifications/{notification_id}/read")
def mark_notification_as_read(notification_id: str, user: dict = Depends(get_user)):
    """Mark a notification as read"""
    try:
        user_id = user['id']
        
        user_client = get_user_client(user["token"])
        result = user_client.table("notifications").update({
            "is_read": True
        }).eq("id", notification_id).eq("user_id", user_id).execute()
        
        if not result or not result.data:
            print(f"[settings.py:mark_notification_as_read:L151] Notification read update returned None for ID {notification_id}")
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise_db_error(e)

@router.post("/notifications/mark-all-read")
def mark_all_notifications_as_read(user: dict = Depends(get_user)):
    """Mark all notifications as read"""
    try:
        user_id = user['id']
        
        user_client = get_user_client(user["token"])
        result = user_client.table("notifications").update({
            "is_read": True
        }).eq("user_id", user_id).eq("is_read", False).execute()
        
        return {"message": "All notifications marked as read", "count": len(result.data) if (result and result.data) else 0}
    except Exception as e:
        raise_db_error(e)
