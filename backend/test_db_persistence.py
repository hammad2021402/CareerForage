import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== Persistence and Database Fixes Tests ===")
    
    # 1. Test Registration
    email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"
    full_name = "Test User"
    
    print("\n[1] Testing Registration...")
    reg_payload = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "goals": ["web_development"],
        "learning_style": "practical"
    }
    
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if res.status_code != 200:
            print(f"FAIL: Registration failed with status {res.status_code}: {res.text}")
            return False
        
        reg_data = res.json()
        token = reg_data["access_token"]
        user_id = reg_data["user"]["id"]
        print(f"PASS: Registered successfully. User ID: {user_id}")
    except Exception as e:
        print(f"FAIL: Registration exception: {e}")
        return False

    # 2. Test Login
    print("\n[2] Testing Login...")
    login_payload = {
        "email": email,
        "password": password
    }
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if res.status_code != 200:
            print(f"FAIL: Login failed with status {res.status_code}: {res.text}")
            return False
        
        login_data = res.json()
        token = login_data["access_token"]
        print("PASS: Logged in successfully.")
    except Exception as e:
        print(f"FAIL: Login exception: {e}")
        return False

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Verify Profile and user_preferences were created successfully
    print("\n[3] Verifying Profile and Preferences creation...")
    try:
        # Check /auth/me
        res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if res.status_code != 200:
            print(f"FAIL: /auth/me status {res.status_code}: {res.text}")
            return False
        
        me_data = res.json()
        print(f"Me data: {me_data}")
        if me_data.get("full_name") != full_name:
            print(f"FAIL: Full name mismatch. Expected: {full_name}, Got: {me_data.get('full_name')}")
            return False
        
        # Check /gamification/status
        res = requests.get(f"{BASE_URL}/gamification/status", headers=headers)
        if res.status_code != 200:
            print(f"FAIL: /gamification/status status {res.status_code}: {res.text}")
            return False
        
        status_data = res.json()
        print(f"Gamification status: {status_data}")
        if status_data.get("xp") != 0 or status_data.get("level") != 1:
            print(f"FAIL: Initial XP or Level incorrect. Got XP: {status_data.get('xp')}, Level: {status_data.get('level')}")
            return False
            
        print("PASS: Profile and preferences verified successfully.")
    except Exception as e:
        print(f"FAIL: Profile verification exception: {e}")
        return False

    # 4. Test Lesson Completion
    lesson_id = "test-lesson-state-management"
    print(f"\n[4] Testing Lesson Completion for lesson '{lesson_id}'...")
    try:
        res = requests.post(f"{BASE_URL}/learning/lessons/{lesson_id}/complete", headers=headers)
        if res.status_code != 200:
            print(f"FAIL: Lesson completion failed with status {res.status_code}: {res.text}")
            return False
        
        complete_data = res.json()
        print(f"Lesson completion response: {complete_data}")
        # Expected XP from a newly created default lesson is 250 XP
        if complete_data.get("xp_earned") != 250:
            print(f"FAIL: XP earned mismatch. Expected: 250, Got: {complete_data.get('xp_earned')}")
            return False
            
        print("PASS: Lesson completed in database and XP awarded.")
    except Exception as e:
        print(f"FAIL: Lesson completion exception: {e}")
        return False

    # 5. Test Quiz/XP Rewards (Direct Award API)
    print("\n[5] Testing Quiz XP Reward Claim...")
    try:
        res = requests.post(
            f"{BASE_URL}/gamification/award-xp",
            headers=headers,
            json={"amount": 50, "reason": "Quiz: State Management with Hooks"}
        )
        if res.status_code != 200:
            print(f"FAIL: Award XP failed with status {res.status_code}: {res.text}")
            return False
        
        award_data = res.json()
        print(f"Award response: {award_data}")
        if award_data.get("awarded_xp") != 50:
            print(f"FAIL: Awarded XP mismatch. Expected: 50, Got: {award_data.get('awarded_xp')}")
            return False
            
        print("PASS: Quiz XP reward claimed successfully.")
    except Exception as e:
        print(f"FAIL: Quiz XP claim exception: {e}")
        return False

    # 6. Test Dashboard Sync and Page Refresh Persistence
    print("\n[6] Testing Sync and Persistence (Page Refresh Simulation)...")
    try:
        # Check completed lessons
        res = requests.get(f"{BASE_URL}/learning/completed-lessons", headers=headers)
        if res.status_code != 200:
            print(f"FAIL: /learning/completed-lessons failed with status {res.status_code}: {res.text}")
            return False
        
        completed_list = res.json()
        print(f"Completed lessons list: {completed_list}")
        # Expecting at least one entry with our lesson title/id
        matched = False
        for c in completed_list:
            if c.get("title") == lesson_id:
                matched = True
                break
        if not matched:
            print(f"FAIL: Completed lesson '{lesson_id}' not found in database progress list.")
            return False
            
        # Check total XP (should be 250 + 50 = 300 XP, level = 300 // 100 + 1 = 4)
        res = requests.get(f"{BASE_URL}/gamification/status", headers=headers)
        if res.status_code != 200:
            print(f"FAIL: Status refresh failed with status {res.status_code}: {res.text}")
            return False
        
        final_status = res.json()
        print(f"Final Gamification Status: {final_status}")
        if final_status.get("xp") != 300 or final_status.get("level") != 4:
            print(f"FAIL: Total XP or Level incorrect after reload. Expected XP: 300, Level: 4. Got XP: {final_status.get('xp')}, Level: {final_status.get('level')}")
            return False
            
        print("PASS: Sync and persistence verified. Total XP: 300, Level: 4, 1 completed lesson.")
    except Exception as e:
        print(f"FAIL: Sync/Persistence exception: {e}")
        return False

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
