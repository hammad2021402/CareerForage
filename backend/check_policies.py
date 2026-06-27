import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    # Query pg_policies using an RPC or a raw postgrest select if possible, or another table
    # Wait, we don't have direct SQL execution, but let's see if we can do something else
    # Let's query information_schema or similar system tables if postgrest has them exposed?
    # PostgREST only exposes tables in the 'public' schema by default.
    # But wait, did we run seed_data.py?
    # Let's see if there is any other way to check. Let's try to query information_schema.tables
    res = supabase.table("profiles").select("*").execute()
    print("Profiles content:", res.data)
except Exception as e:
    print("Error:", e)
