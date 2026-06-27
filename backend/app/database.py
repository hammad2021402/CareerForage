import os
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def get_user_client(token: str) -> Client:
    client = create_client(url, key)
    client.postgrest.headers["Authorization"] = f"Bearer {token}"
    client.postgrest.session.headers["Authorization"] = f"Bearer {token}"
    return client



def raise_db_error(e: Exception, status_code: int = 500):
    if isinstance(e, HTTPException):
        raise e
        
    err_str = str(e)
    # Check for authorization/token errors
    if any(term in err_str.lower() for term in ["jwt", "expired", "invalid token", "credential", "auth"]):
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
        
    # Check for not found
    if "PGRST116" in err_str or "not found" in err_str.lower():
        raise HTTPException(status_code=404, detail="The requested resource could not be found.")
        
    # Check for database errors
    if "duplicate key" in err_str or "23505" in err_str:
        raise HTTPException(status_code=400, detail="This record already exists.")
        
    if "foreign key" in err_str or "23503" in err_str:
        raise HTTPException(status_code=400, detail="A dependency error occurred. Related resource not found.")
        
    if any(term in err_str for term in ["PGRST", "Postgrest", "database", "SQL"]):
        raise HTTPException(status_code=500, detail="A database error occurred. Please try again later.")
        
    raise HTTPException(status_code=status_code, detail=err_str)

