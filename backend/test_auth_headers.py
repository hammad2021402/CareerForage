import os
import uuid
from dotenv import load_dotenv
from supabase import create_client
from postgrest.types import ReturnMethod

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

def test_headers():
    email = f"headertest_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123!"
    
    # 1. Sign up user to get token
    sb = create_client(url, key)
    res = sb.auth.sign_up({"email": email, "password": password})
    token = res.session.access_token
    user_id = res.user.id
    print(f"User ID: {user_id}")
    
    client = create_client(url, key)
    client.postgrest.headers["Authorization"] = f"Bearer {token}"
    client.postgrest.session.headers["Authorization"] = f"Bearer {token}"
    
    # Try inserting profile with only ID
    profile_data = {
        "id": user_id
    }
    
    print("\nAttempting insert profile with ONLY ID...")
    try:
        ins_res = client.table("profiles").insert(profile_data, returning=ReturnMethod.minimal).execute()
        print("Success profile:", ins_res.data)
    except Exception as e:
        print("Failed profile:", e)

if __name__ == "__main__":
    test_headers()
