import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    # Query database metadata via RPC or a quick select of columns
    res = supabase.postgrest.rpc("get_columns", {}).execute()
    print("RPC result:", res.data)
except Exception as e:
    print("RPC get_columns failed:", e)

try:
    # Query system table information_schema.columns via HTTP/PostgREST if allowed
    # Note: this might fail if PostgREST doesn't expose information_schema, but worth a try
    res = supabase.table("profiles").select("*").limit(0).execute()
    print("Profiles columns via select empty:", res)
except Exception as e:
    print("Profiles empty select failed:", e)
