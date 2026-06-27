import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

columns = ["id", "full_name", "xp_points", "current_streak", "longest_streak", "level"]

for col in columns:
    try:
        res = supabase.table("profiles").select(col).limit(1).execute()
        print(f"Column '{col}': EXISTS")
    except Exception as e:
        print(f"Column '{col}': FAILED: {e}")
