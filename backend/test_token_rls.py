import os
import uuid
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def test_rls():
    email = f"rlstest_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"
    
    print("Signing up user...")
    res = supabase.auth.sign_up({"email": email, "password": password})
    user = res.user
    session = res.session
    if not session:
        print("No session, signing in...")
        res_login = supabase.auth.sign_in_with_password({"email": email, "password": password})
        session = res_login.session
        user = res_login.user
        
    token = session.access_token
    user_id = user.id
    print(f"User ID: {user_id}")
    print(f"Token (first 30 chars): {token[:30]}...")
    
    # Try inserting profile using user_client
    from app.database import get_user_client
    user_client = get_user_client(token)
    
    profile_data = {
        "id": user_id,
        "full_name": "RLS Test User",
    }
    
    print("\nAttempting insert profile...")
    try:
        ins_res = user_client.table("profiles").insert(profile_data).execute()
        print("Insert profile success:", ins_res.data)
    except Exception as e:
        print("Insert profile failed:", e)
        print("Type:", type(e))
        
    print("\nAttempting select profile...")
    try:
        sel_res = user_client.table("profiles").select("*").eq("id", user_id).execute()
        print("Select profile success:", sel_res.data)
    except Exception as e:
        print("Select profile failed:", e)

if __name__ == "__main__":
    test_rls()
