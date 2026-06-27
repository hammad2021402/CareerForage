from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, raise_db_error, get_user_client
from app.auth import get_user
from app.schemas import LearningPathUpdate, CodeExecutionRequest
from typing import Dict, Any, List
import requests
import os
import json
import base64
import uuid
from datetime import datetime, timezone

router = APIRouter()

# Judge0 API configuration
JUDGE0_API_URL = os.getenv("JUDGE0_API_URL", "https://judge0-ce.p.rapidapi.com")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")

# Language ID mapping for Judge0
LANGUAGE_IDS = {
    "javascript": 63,  # Node.js
    "python": 71,      # Python 3
    "java": 62,
    "cpp": 54,         # C++ (GCC 9.2.0)
    "c": 50,           # C (GCC 9.2.0)
    "typescript": 74,
}

def ensure_lesson_exists(lesson_title_or_id: str, user_client) -> str:
    """Ensures a lesson exists in the database by checking its UUID (deterministic based on title/id).
    Returns the valid UUID string.
    """
    try:
        val = uuid.UUID(lesson_title_or_id, version=4)
        lesson_uuid = str(val)
    except ValueError:
        lesson_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, lesson_title_or_id))
    
    # 2. Check if exists
    res = user_client.table("lessons").select("id").eq("id", lesson_uuid).maybe_single().execute()
    if res and res.data:
        return lesson_uuid

    # 3. Create learning path, module, and lesson if they don't exist
    path_slug = "ai-generated-roadmap"
    path_res = user_client.table("learning_paths").select("id").eq("slug", path_slug).maybe_single().execute()
    if path_res and path_res.data:
        path_id = path_res.data["id"]
    else:
        path_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, path_slug))
        try:
            user_client.table("learning_paths").insert({
                "id": path_uuid,
                "slug": path_slug,
                "name": "AI Generated Roadmap",
                "description": "Your personalized learning path"
            }).execute()
            path_id = path_uuid
        except Exception:
            path_id = path_uuid
            
    module_slug = "default-module"
    module_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, module_slug))
    module_res = user_client.table("modules").select("id").eq("id", module_uuid).maybe_single().execute()
    if module_res and module_res.data:
        module_id = module_res.data["id"]
    else:
        try:
            user_client.table("modules").insert({
                "id": module_uuid,
                "learning_path_id": path_id,
                "title": "Core Curriculum",
                "description": "Essential topics"
            }).execute()
            module_id = module_uuid
        except Exception:
            module_id = module_uuid

    # Insert the lesson
    try:
        user_client.table("lessons").insert({
            "id": lesson_uuid,
            "module_id": module_id,
            "title": lesson_title_or_id,
            "description": f"AI-assisted learning module for {lesson_title_or_id}",
            "content_type": "interactive",
            "xp_reward": 250
        }).execute()
    except Exception as e:
        print(f"Error creating lesson record: {e}")
        
    return lesson_uuid

@router.get("/paths")
def get_learning_paths(user: dict = Depends(get_user)):
    """Get all available learning paths"""
    try:
        user_client = get_user_client(user["token"])
        paths_res = user_client.table("learning_paths").select("*").execute()
        return paths_res.data if (paths_res and paths_res.data) else []
    except Exception as e:
        raise_db_error(e)

@router.get("/completed-lessons")
def get_completed_lessons(user: dict = Depends(get_user)):
    """Get list of completed lesson titles/IDs for the authenticated user"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        progress_res = user_client.table("user_progress").select("completed_at, lessons(id, title)").eq("user_id", user_id).eq("status", "completed").execute()
        
        completed = []
        if progress_res and progress_res.data:
            for row in progress_res.data:
                lesson = row.get("lessons")
                if lesson:
                    completed.append({
                        "id": lesson.get("id"),
                        "title": lesson.get("title")
                    })
        return completed
    except Exception as e:
        raise_db_error(e)

@router.get("/path")
def get_user_learning_path(user: dict = Depends(get_user)):
    """Get user's current learning path with modules and lessons"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        # Get user's learning goal
        prefs_res = user_client.table("user_preferences").select("learning_goal").eq("user_id", user_id).maybe_single().execute()
        
        learning_goal = "web_development"  # default
        if prefs_res and prefs_res.data and prefs_res.data.get('learning_goal'):
            learning_goal = prefs_res.data['learning_goal']
        else:
            print(f"[learning.py:get_user_learning_path:L46] user_preferences query returned None for user {user_id}")
        
        # Get the learning path for this goal
        path_res = user_client.table("learning_paths").select("*").eq("slug", learning_goal).maybe_single().execute()
        
        if not path_res or not path_res.data:
            print(f"[learning.py:get_user_learning_path:L52] learning_paths query for goal {learning_goal} returned None")
            # Return default path if not found
            path_res = user_client.table("learning_paths").select("*").limit(1).maybe_single().execute()
        
        path = path_res.data if (path_res and path_res.data) else {"id": "default", "name": "Getting Started"}
        if not path_res or not path_res.data:
            print("[learning.py:get_user_learning_path:L56] Default learning_path query returned None")
        path_id = path.get('id', 'default')
        
        # Get modules for this path
        modules_res = user_client.table("modules").select("*").eq("learning_path_id", path_id).order("order_index").execute()
        modules = modules_res.data if (modules_res and modules_res.data) else []
        if not modules_res or not modules_res.data:
            print(f"[learning.py:get_user_learning_path:L61] Modules query for path {path_id} returned None")
        
        # Get lessons for each module
        for module in modules:
            lessons_res = user_client.table("lessons").select("id, title, description, content_type, difficulty, estimated_minutes, xp_reward, order_index").eq("module_id", module.get('id')).order("order_index").execute()
            module['lessons'] = lessons_res.data if (lessons_res and lessons_res.data) else []
            if not lessons_res or not lessons_res.data:
                print(f"[learning.py:get_user_learning_path:L66] Lessons query for module {module.get('id')} returned None")
        
        # Get user's progress
        progress_res = user_client.table("user_progress").select("lesson_id, status").eq("user_id", user_id).execute()
        progress_data = progress_res.data if (progress_res and progress_res.data) else []
        if not progress_res or not progress_res.data:
            print(f"[learning.py:get_user_learning_path:L70] User progress query for user {user_id} returned None")
        progress_map = {p['lesson_id']: p['status'] for p in progress_data if p and 'lesson_id' in p}
        
        # Add progress status to lessons
        for module in modules:
            for lesson in module.get('lessons', []):
                lesson['status'] = progress_map.get(lesson['id'], 'not_started')
        
        return {
            "path": path,
            "modules": modules
        }
    except Exception as e:
        raise_db_error(e)

@router.post("/update-path")
def update_learning_path(path_update: LearningPathUpdate, user: dict = Depends(get_user)):
    """Update user's learning path/goal"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        update_data = {
            "learning_goal": path_update.learning_goal
        }
        
        if path_update.goals:
            update_data["interests"] = path_update.goals
        
        if path_update.learning_style:
            update_data["learning_style"] = path_update.learning_style
        
        # Check if preferences exist
        prefs_res = user_client.table("user_preferences").select("id").eq("user_id", user_id).execute()
        prefs_data = prefs_res.data if (prefs_res and prefs_res.data) else []
        if not prefs_res or not prefs_res.data:
            print(f"[learning.py:update_learning_path:L103] User preferences check returned None for user {user_id}")
        
        if prefs_data:
            # Update existing
            result = user_client.table("user_preferences").update(update_data).eq("user_id", user_id).execute()
        else:
            # Insert new
            update_data["user_id"] = user_id
            result = user_client.table("user_preferences").insert(update_data).execute()
        
        # Create notification
        user_client.table("notifications").insert({
            "user_id": user_id,
            "title": "Learning Path Updated",
            "message": f"You've switched to the {path_update.learning_goal.replace('_', ' ').title()} learning path!",
            "type": "info"
        }).execute()
        
        return {"message": "Learning path updated successfully"}
    except Exception as e:
        raise_db_error(e)

@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str, user: dict = Depends(get_user)):
    """Get detailed lesson content"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        lesson_res = user_client.table("lessons").select("*").eq("id", lesson_id).maybe_single().execute()
        if not lesson_res or not lesson_res.data:
            print(f"[learning.py:get_lesson:L128] Lesson query returned None for ID {lesson_id}")
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Get user's progress for this lesson
        progress_res = user_client.table("user_progress").select("*").eq("user_id", user_id).eq("lesson_id", lesson_id).execute()
        progress_data = progress_res.data if (progress_res and progress_res.data) else []
        if not progress_res or not progress_res.data:
            print(f"[learning.py:get_lesson:L133] Progress query returned None for user {user_id} and lesson {lesson_id}")
        
        lesson = lesson_res.data
        lesson['progress'] = progress_data[0] if progress_data else None
        
        return lesson
    except Exception as e:
        raise_db_error(e)

@router.post("/execute-code")
async def execute_code(request: CodeExecutionRequest, user: dict = Depends(get_user)):
    """Execute code using Judge0 API"""
    try:
        user_client = get_user_client(user["token"])
        language_id = LANGUAGE_IDS.get(request.language.lower(), 63)
        
        # Get test cases from lesson if lesson_id is provided
        test_cases = request.test_cases or []
        if request.lesson_id and not test_cases:
            lesson_res = user_client.table("lessons").select("test_cases").eq("id", request.lesson_id).maybe_single().execute()
            if lesson_res and lesson_res.data and lesson_res.data.get('test_cases'):
                test_cases = lesson_res.data['test_cases']
            elif not lesson_res or not lesson_res.data:
                print(f"[learning.py:execute_code:L152] Lesson query returned None for ID {request.lesson_id}")
        
        results = []
        
        if not test_cases:
            # Just run the code once without test cases
            submission_data = {
                "source_code": base64.b64encode(request.code.encode()).decode(),
                "language_id": language_id,
                "stdin": base64.b64encode("".encode()).decode()
            }
            
            if JUDGE0_API_KEY:
                headers = {
                    "content-type": "application/json",
                    "X-RapidAPI-Key": JUDGE0_API_KEY,
                    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
                }
                response = requests.post(
                    f"{JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true",
                    json=submission_data,
                    headers=headers
                )
                result = response.json()
            else:
                # Mock result for development
                result = {
                    "stdout": base64.b64encode(b"Code executed successfully").decode(),
                    "stderr": None,
                    "status": {"description": "Accepted"},
                    "time": "0.001"
                }
            
            output = base64.b64decode(result.get('stdout', '')).decode() if result.get('stdout') else ""
            error = base64.b64decode(result.get('stderr', '')).decode() if result.get('stderr') else ""
            
            return {
                "results": [{
                    "status": "passed" if result.get('status', {}).get('description') == "Accepted" else "failed",
                    "output": output,
                    "error": error,
                    "time": result.get('time')
                }],
                "summary": {
                    "total": 1,
                    "passed": 1 if result.get('status', {}).get('description') == "Accepted" else 0,
                    "failed": 0 if result.get('status', {}).get('description') == "Accepted" else 1
                }
            }
        
        # Run code against each test case
        passed_count = 0
        for idx, test_case in enumerate(test_cases):
            stdin = test_case.get('input', '')
            expected_output = test_case.get('expected_output', '').strip()
            
            submission_data = {
                "source_code": base64.b64encode(request.code.encode()).decode(),
                "language_id": language_id,
                "stdin": base64.b64encode(stdin.encode()).decode()
            }
            
            if JUDGE0_API_KEY:
                headers = {
                    "content-type": "application/json",
                    "X-RapidAPI-Key": JUDGE0_API_KEY,
                    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
                }
                response = requests.post(
                    f"{JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true",
                    json=submission_data,
                    headers=headers
                )
                result = response.json()
            else:
                # Mock result
                result = {
                    "stdout": base64.b64encode(expected_output.encode()).decode(),
                    "stderr": None,
                    "status": {"description": "Accepted"},
                    "time": "0.001"
                }
            
            output = base64.b64decode(result.get('stdout', '')).decode() if result.get('stdout') else ""
            error = base64.b64decode(result.get('stderr', '')).decode() if result.get('stderr') else ""
            
            passed = output.strip() == expected_output
            if passed:
                passed_count += 1
            
            results.append({
                "test_case": idx + 1,
                "description": test_case.get('description', f"Test case {idx + 1}"),
                "status": "passed" if passed else "failed",
                "input": stdin,
                "expected_output": expected_output,
                "stdout": output,
                "stderr": error,
                "time": result.get('time')
            })
        
        return {
            "results": results,
            "summary": {
                "total": len(test_cases),
                "passed": passed_count,
                "failed": len(test_cases) - passed_count
            }
        }
    except Exception as e:
        print(f"Code execution error: {str(e)}")
        raise_db_error(e)

@router.post("/lessons/{lesson_id}/complete")
def complete_lesson(lesson_id: str, user: dict = Depends(get_user), code_submission: str = None):
    """Mark a lesson as completed"""
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        # Ensure lesson exists and get its UUID
        lesson_uuid = ensure_lesson_exists(lesson_id, user_client)
        
        # Get lesson details
        lesson_res = user_client.table("lessons").select("xp_reward, title").eq("id", lesson_uuid).maybe_single().execute()
        
        if not lesson_res or not lesson_res.data:
            print(f"[learning.py:complete_lesson:L275] Lesson query returned None for ID {lesson_uuid}")
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        lesson = lesson_res.data
        xp_to_add = lesson.get('xp_reward', 50)
        
        # Check if already completed
        existing_progress = user_client.table("user_progress").select("*").eq("user_id", user_id).eq("lesson_id", lesson_uuid).execute()
        existing_data = existing_progress.data if (existing_progress and existing_progress.data) else []
        if not existing_progress or not existing_progress.data:
            print(f"[learning.py:complete_lesson:L284] User progress query returned None for user {user_id} and lesson {lesson_uuid}")
        
        completed_at = datetime.now(timezone.utc).isoformat()
        
        if existing_data:
            # Update existing progress
            try:
                user_client.table("user_progress").update({
                    "status": "completed",
                    "code_submission": code_submission,
                    "completed_at": completed_at
                }).eq("user_id", user_id).eq("lesson_id", lesson_uuid).execute()
            except Exception as e:
                if "code_submission" in str(e) or "42703" in str(e):
                    user_client.table("user_progress").update({
                        "status": "completed",
                        "completed_at": completed_at
                    }).eq("user_id", user_id).eq("lesson_id", lesson_uuid).execute()
                else:
                    raise
        else:
            # Insert new progress
            try:
                user_client.table("user_progress").insert({
                    "user_id": user_id,
                    "lesson_id": lesson_uuid,
                    "status": "completed",
                    "code_submission": code_submission,
                    "completed_at": completed_at
                }).execute()
            except Exception as e:
                if "code_submission" in str(e) or "42703" in str(e):
                    user_client.table("user_progress").insert({
                        "user_id": user_id,
                        "lesson_id": lesson_uuid,
                        "status": "completed",
                        "completed_at": completed_at
                    }).execute()
                else:
                    raise
        
        
        # Update user XP (authoritative column: xp_points)
        profile_res = user_client.table("profiles").select("xp_points").eq("id", user_id).maybe_single().execute()
        profile = profile_res.data if (profile_res and profile_res.data) else {}
        if not profile_res or not profile_res.data:
            print(f"[learning.py:complete_lesson:L303] Profile query returned None for user {user_id}")
        
        current_xp = profile.get('xp_points', 0) or 0
        current_level = (current_xp // 100) + 1
        new_xp = current_xp + xp_to_add
        
        # Check for level up (simple formula: level N requires N * 100 XP)
        new_level = current_level
        while new_xp >= new_level * 100:
            new_level += 1
        
        user_client.table("profiles").update({
            "xp_points": new_xp,
            "level": new_level
        }).eq("id", user_id).execute()
        
        # Create notification
        user_client.table("notifications").insert({
            "user_id": user_id,
            "title": "Lesson Completed!",
            "message": f"You completed '{lesson.get('title')}' and earned {xp_to_add} XP!",
            "type": "achievement"
        }).execute()
        
        # Check if leveled up
        if new_level > current_level:
            user_client.table("notifications").insert({
                "user_id": user_id,
                "title": f"Level Up! You're now Level {new_level}",
                "message": f"Congratulations! You've reached level {new_level}!",
                "type": "milestone"
            }).execute()
        
        return {
            "message": "Lesson completed!",
            "xp_earned": xp_to_add,
            "total_xp": new_xp,
            "level": new_level,
            "leveled_up": new_level > current_level
        }
    except Exception as e:
        print(f"Complete lesson error: {str(e)}")
        raise_db_error(e)
