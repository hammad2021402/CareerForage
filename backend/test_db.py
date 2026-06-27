import os
from app.database import supabase
from dotenv import load_dotenv

load_dotenv()

# We query a non-existent UUID in the profiles table to see what maybe_single returns
try:
    print("Testing maybe_single query for non-existent profile:")
    res = supabase.table("profiles").select("*").eq("id", "00000000-0000-0000-0000-000000000000").maybe_single().execute()
    print("Type of result:", type(res))
    print("Result object:", res)
    print("Result data:", getattr(res, 'data', 'NO DATA ATTR'))
except Exception as e:
    print("Error occurred during maybe_single query:")
    import traceback
    traceback.print_exc()

# Let's also check a normal query
try:
    print("\nTesting regular execute:")
    res2 = supabase.table("profiles").select("*").eq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Type of result 2:", type(res2))
    print("Result 2 object:", res2)
    print("Result 2 data:", getattr(res2, 'data', 'NO DATA ATTR'))
except Exception as e:
    print("Error occurred during regular query:")
    import traceback
    traceback.print_exc()
