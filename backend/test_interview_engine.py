import os
import json
import sqlite3
import uuid
from app.interview_engine import (
    process_interview_turn, 
    load_session_object, 
    save_session_object,
    validate_semantic_similarity,
    ensure_sqlite_tables,
    get_followup_focus,
    DB_PATH
)

def test_engine_workflow():
    print("=== Testing Redesigned Technical Interview Engine State Machine ===")
    
    # 1. Ensure SQLite database is seeded and ready
    ensure_sqlite_tables()
    
    # 2. Verify type-specific follow-up focuses
    print("\n--- Testing Type-Specific Follow-up Focuses ---")
    focus_dsa_1 = get_followup_focus("dsa", 1)
    focus_dsa_2 = get_followup_focus("dsa", 2)
    focus_sys_1 = get_followup_focus("systemdesign", 1)
    focus_behav_1 = get_followup_focus("behavioral", 1)
    
    print(f"DSA Follow-up 1: {focus_dsa_1}")
    print(f"DSA Follow-up 2: {focus_dsa_2}")
    print(f"System Design Follow-up 1: {focus_sys_1}")
    print(f"Behavioral Follow-up 1: {focus_behav_1}")
    
    assert "time and space complexity" in focus_dsa_1
    assert "edge cases" in focus_dsa_2
    assert "scale bottlenecks" in focus_sys_1
    assert "STAR Action focus" in focus_behav_1
    
    # 3. Simulate interview session
    user_id = str(uuid.uuid4())
    interview_id = str(uuid.uuid4())
    
    payload_start = {
        "interview_id": interview_id,
        "role": "Backend Engineer",
        "seniority": "Mid-level",
        "skills": ["backend"],
        "history": []
    }
    
    print("\n--- Starting Session ---")
    res_start = process_interview_turn(user_id, payload_start)
    assert res_start["interview_id"] == interview_id
    assert not res_start["done"]
    assert res_start["question"] is not None
    print(f"Main Question: {res_start['question']}")
    
    # Verify initial state
    session = load_session_object(interview_id)
    assert session["current_question_index"] == 0
    assert session["current_question_followup_count"] == 0
    assert not session["current_question_completed"]
    assert session["current_question_main_text"] == res_start["question"]
    
    # 4. Turn 1: Weak response -> Should trigger Follow-up #1
    history = [
        {"role": "coach", "message": res_start["question"]},
        {"role": "candidate", "message": "I don't know, maybe use a database."}
    ]
    payload_t1 = payload_start.copy()
    payload_t1["history"] = history
    
    print("\n--- Processing Turn 1 (Weak Answer) ---")
    res_t1 = process_interview_turn(user_id, payload_t1)
    print(f"Follow-up 1: {res_t1['question']}")
    
    session = load_session_object(interview_id)
    assert session["current_question_index"] == 0
    assert session["current_question_followup_count"] == 1
    assert not session["current_question_completed"]
    
    # 5. Turn 2: Weak response -> Should trigger Follow-up #2
    history.append({"role": "coach", "message": res_t1["question"]})
    history.append({"role": "candidate", "message": "Still not sure."})
    payload_t2 = payload_start.copy()
    payload_t2["history"] = history
    
    print("\n--- Processing Turn 2 (Weak Answer) ---")
    res_t2 = process_interview_turn(user_id, payload_t2)
    print(f"Follow-up 2: {res_t2['question']}")
    
    session = load_session_object(interview_id)
    assert session["current_question_index"] == 0
    assert session["current_question_followup_count"] == 2
    assert not session["current_question_completed"]
    
    # 6. Turn 3: Weak response -> Should record weak score and move to NEXT topic
    history.append({"role": "coach", "message": res_t2["question"]})
    history.append({"role": "candidate", "message": "No idea."})
    payload_t3 = payload_start.copy()
    payload_t3["history"] = history
    
    print("\n--- Processing Turn 3 (Weak Answer at Limit) ---")
    res_t3 = process_interview_turn(user_id, payload_t3)
    print(f"Next Main Question: {res_t3['question']}")
    assert "[Recruiter Coaching]" in res_t3["feedback"]
    print("Coaching tip successfully delivered.")
    
    session = load_session_object(interview_id)
    # Question index should now have incremented to 1!
    assert session["current_question_index"] == 1
    # Follow-up count should have reset to 0!
    assert session["current_question_followup_count"] == 0
    assert not session["current_question_completed"]
    
    print("\n=== All Technical Tests Passed Successfully! ===")

if __name__ == "__main__":
    test_engine_workflow()
