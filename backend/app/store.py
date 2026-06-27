from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, raise_db_error, get_user_client
from app.auth import get_user
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/inventory")
def get_inventory(user: dict = Depends(get_user)):
    """Get store inventory with user's XP balance"""
    try:
        user_id = user['id']
        
        # Get user's XP balance
        user_client = get_user_client(user["token"])
        profile_res = user_client.table("profiles").select("xp_points").eq("id", user_id).maybe_single().execute()
        balance = profile_res.data.get('xp_points', 0) if (profile_res and profile_res.data) else 0
        if not profile_res or not profile_res.data:
            print(f"[store.py:get_inventory:L17] Profile query returned None for user {user_id}")
        
        # Get available rewards (placeholder data)
        rewards = [
            {
                "id": "reward_1",
                "name": "Code Review Session",
                "description": "30-minute code review with a senior developer",
                "cost": 500,
                "category": "mentorship",
                "in_stock": True,
                "stock": 10
            },
            {
                "id": "reward_2",
                "name": "Career Coaching Call",
                "description": "1-hour career guidance session",
                "cost": 1000,
                "category": "career",
                "in_stock": True,
                "stock": 5
            },
            {
                "id": "reward_3",
                "name": "Premium Course Access",
                "description": "Access to advanced course materials for 1 month",
                "cost": 750,
                "category": "education",
                "in_stock": True,
                "stock": 20
            },
            {
                "id": "reward_4",
                "name": "Tech Book Bundle",
                "description": "Collection of popular programming books",
                "cost": 300,
                "category": "resources",
                "in_stock": True,
                "stock": 15
            }
        ]
        
        return {"balance": balance, "rewards": rewards}
    except Exception as e:
        raise_db_error(e)

@router.get("/transactions")
def get_transactions(user: dict = Depends(get_user)):
    """Get user's transaction history"""
    try:
        user_id = user['id']
        
        # Placeholder transaction data
        # In a real app, this would come from a transactions table
        transactions = [
            {
                "id": "txn_1",
                "reward_id": "reward_1",
                "reward_name": "Code Review Session",
                "amount": -500,
                "status": "completed",
                "created_at": datetime.now().isoformat(),
            }
        ]
        
        return {"transactions": transactions}
    except Exception as e:
        raise_db_error(e)

@router.post("/redeem")
def redeem_reward(payload: Dict[str, Any], user: dict = Depends(get_user)):
    """Redeem a reward using XP"""
    try:
        user_id = user['id']
        reward_id = payload.get('reward_id')
        
        if not reward_id:
            raise HTTPException(status_code=400, detail="reward_id is required")
        
        # Get reward cost (placeholder)
        reward_costs = {
            "reward_1": 500,
            "reward_2": 1000,
            "reward_3": 750,
            "reward_4": 300
        }
        
        cost = reward_costs.get(reward_id)
        if not cost:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        # Get user's current XP
        user_client = get_user_client(user["token"])
        profile_res = user_client.table("profiles").select("xp_points").eq("id", user_id).maybe_single().execute()
        current_xp = profile_res.data.get('xp_points', 0) if (profile_res and profile_res.data) else 0
        if not profile_res or not profile_res.data:
            print(f"[store.py:redeem_reward:L110] Profile query returned None for user {user_id}")
        
        if current_xp < cost:
            raise HTTPException(status_code=400, detail="Insufficient XP")
        
        # Deduct XP
        new_xp = current_xp - cost
        user_client.table("profiles").update({"xp_points": new_xp}).eq("id", user_id).execute()
        
        # Create transaction record
        transaction = {
            "id": f"txn_{datetime.now().timestamp()}",
            "reward_id": reward_id,
            "reward_name": "Redeemed Item",
            "amount": -cost,
            "status": "completed",
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "balance": new_xp,
            "transaction": transaction,
            "message": "Reward redeemed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise_db_error(e)

@router.get("/items")
def get_items(user: dict = Depends(get_user)):
    try:
        user_client = get_user_client(user["token"])
        items_res = user_client.table("redemption_items").select("*").execute()
        return items_res.data if (items_res and items_res.data) else []
    except Exception as e:
        raise_db_error(e)

@router.get("/user-xp")
def get_user_xp(user: dict = Depends(get_user)):
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        profile_res = user_client.table("profiles").select("xp_points").eq("id", user_id).maybe_single().execute()
        return {"xp": profile_res.data.get('xp_points', 0) if (profile_res and profile_res.data) else 0}
    except Exception as e:
        raise_db_error(e)

@router.post("/redeem/{item_id}")
def redeem_item(item_id: int, user: dict = Depends(get_user)):
    try:
        user_id = user['id']
        user_client = get_user_client(user["token"])
        
        # Again, this should be a transaction in a real app (DB function)
        item_res = user_client.table("redemption_items").select("xp_cost").eq("id", item_id).maybe_single().execute()
        item_cost = item_res.data.get('xp_cost') if (item_res and item_res.data) else None
        if not item_res or not item_res.data:
            print(f"[store.py:redeem_item:L163] redemption_items query returned None for item ID {item_id}")

        if not item_cost:
            raise HTTPException(status_code=404, detail="Item not found")

        profile_res = user_client.table("profiles").select("xp_points").eq("id", user_id).maybe_single().execute()
        user_xp = profile_res.data.get('xp_points', 0) if (profile_res and profile_res.data) else 0
        if not profile_res or not profile_res.data:
            print(f"[store.py:redeem_item:L169] Profile query returned None for user {user_id}")

        if user_xp < item_cost:
            raise HTTPException(status_code=400, detail="Not enough XP")

        # Deduct XP and log redemption
        new_xp = user_xp - item_cost
        user_client.table("profiles").update({"xp_points": new_xp}).eq("id", user_id).execute()
        user_client.table("user_redemptions").insert({"user_id": user_id, "item_id": item_id}).execute()

        return {"message": "Item redeemed successfully"}
    except Exception as e:
        raise_db_error(e)
