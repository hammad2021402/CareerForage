from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from app.database import supabase, raise_db_error, get_user_client
from app.schemas import UserCreate, UserLogin

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def ensure_profile_and_data(user_id: str, email: str, user_client, full_name: str = None):
    try:
        # Check if profile exists
        profile_response = user_client.table("profiles").select("*").eq("id", user_id).execute()
        if not profile_response.data:
            # Create default profile
            profile_data = {
                "id": user_id,
                "full_name": full_name or (email.split("@")[0] if email else "User"),
                "xp_points": 0,
                "current_streak": 0,
                "longest_streak": 0
            }
            user_client.table("profiles").insert(profile_data).execute()
    except Exception as e:
        print(f"Error ensuring profile for user {user_id}: {str(e)}")

    try:
        # Check if user_preferences exist
        prefs_response = user_client.table("user_preferences").select("*").eq("user_id", user_id).execute()
        if not prefs_response.data:
            # Create default preferences
            preferences_data = {
                "user_id": user_id,
                "learning_goal": "web_development",
                "skill_level": "beginner",
                "interests": [],
                "learning_style": "practical"
            }
            user_client.table("user_preferences").insert(preferences_data).execute()
    except Exception as e:
        print(f"Error ensuring preferences for user {user_id}: {str(e)}")


def get_user(token: str = Depends(oauth2_scheme)):
    try:
        user_client = get_user_client(token)
        user_response = user_client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = user_response.user
        ensure_profile_and_data(user.id, user.email, user_client)
        user_dict = user.dict()
        user_dict["token"] = token
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        # Log the actual error for debugging
        print(f"Auth error: {str(e)}")
        raise_db_error(e, 401)

@router.post("/register")
def register(user: UserCreate):
    try:
        # Sign up the user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
        })
        
        # Check if user is created successfully
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Could not create user")

        new_user = auth_response.user
        session = auth_response.session

        # If no session was created (email confirmation required), sign in the user
        if not session:
            login_response = supabase.auth.sign_in_with_password({
                "email": user.email,
                "password": user.password,
            })
            session = login_response.session

        # Ensure we have a valid access token
        if not session or not session.access_token:
            raise HTTPException(status_code=500, detail="Authentication token missing in response")

        # Create request-scoped authenticated client
        user_client = get_user_client(session.access_token)

        # Create or update profile for the user
        profile_data = {
            "id": new_user.id,
            "full_name": user.full_name,
        }
        
        # Try to insert, if it fails due to duplicate, update instead
        try:
            user_client.table("profiles").insert(profile_data).execute()
        except Exception as profile_error:
            # If profile already exists, update it
            if "duplicate key" in str(profile_error):
                user_client.table("profiles").update(profile_data).eq("id", new_user.id).execute()
            else:
                raise profile_error

        # Save user preferences if provided
        if user.goals or user.learning_style:
            preferences_data = {
                "user_id": new_user.id,
                "learning_goal": user.goals[0] if user.goals else "web_development",
                "learning_style": user.learning_style,
                "interests": user.goals,
            }
            # Try to insert, if it fails due to duplicate, update instead
            try:
                user_client.table("user_preferences").insert(preferences_data).execute()
            except Exception as pref_error:
                if "duplicate key" in str(pref_error):
                    user_client.table("user_preferences").update(preferences_data).eq("user_id", new_user.id).execute()
                else:
                    raise pref_error

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": user.email,
                "full_name": user.full_name,
            }
        }
    except Exception as e:
        raise_db_error(e, 400)


@router.post("/login")
def login(user: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password,
        })
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_data = auth_response.user
        token = auth_response.session.access_token
        user_client = get_user_client(token)
        
        ensure_profile_and_data(user_data.id, user_data.email, user_client)
        
        # Get user profile
        profile_response = user_client.table("profiles").select("*").eq("id", user_data.id).execute()
        profile = profile_response.data[0] if profile_response.data else {}
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_data.id,
                "email": user_data.email,
                "full_name": profile.get("full_name", ""),
            }
        }
    except Exception as e:
        raise_db_error(e, 400)


@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user_client = get_user_client(token)
        user_response = user_client.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user_data = user_response.user
        
        ensure_profile_and_data(user_data.id, user_data.email, user_client)
        
        # Get user profile
        profile_response = user_client.table("profiles").select("*").eq("id", user_data.id).execute()
        profile = profile_response.data[0] if profile_response.data else {}
        
        return {
            "id": user_data.id,
            "email": user_data.email,
            "full_name": profile.get("full_name", ""),
            "xp": profile.get("xp_points", 0),
            "level": (profile.get("xp_points", 0) // 100) + 1,
            "avatar_url": None,
        }
    except Exception as e:
        raise_db_error(e, 401)


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme)):
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise_db_error(e, 400)


@router.post("/refresh")
def refresh_token(payload: dict):
    refresh_token_str = payload.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(status_code=400, detail="refresh_token is required")
    try:
        res = supabase.auth.refresh_session(refresh_token_str)
        if not res or not res.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "token_type": "bearer",
            "user": {
                "id": res.user.id,
                "email": res.user.email,
            }
        }
    except Exception as e:
        raise_db_error(e, 401)
