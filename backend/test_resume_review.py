import requests
import uuid

BASE_URL = "http://localhost:8000"

def test_resume_review():
    # Register & Login
    email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Test User"
    }
    
    res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    if res.status_code != 200:
        print("Registration failed:", res.text)
        return
        
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Resume 1: Frontend Developer
    resume1 = """
    Jane Doe
    jane@example.com
    Web Developer
    Skills: HTML, CSS, JavaScript, React, Redux, TailwindCSS, Git
    Experience:
    Frontend Engineer at Tech Corp (2022 - Present)
    - Built responsive web apps using React.js and TailwindCSS.
    - Managed state with Redux.
    - Worked with REST APIs.
    """
    
    payload1 = {
        "resume": resume1,
        "role": "Frontend Developer",
        "company": "Swiggy",
        "requirements": "React, TypeScript, Redux, TailwindCSS, REST APIs",
        "mode": "analyze"
    }
    
    print("\nCalling resume-review for Resume 1 (Frontend developer)...")
    res1 = requests.post(f"{BASE_URL}/career/resume-review", headers=headers, json=payload1)
    print("Status code:", res1.status_code)
    if res1.status_code == 200:
        data1 = res1.json()
        print("Resume 1 ATS score:", data1.get("ats_score"))
        print("Resume 1 highlights:", data1.get("highlights"))
        print("Resume 1 improvements:", data1.get("improvements"))
    else:
        print("Error details:", res1.text)
        
    # Resume 2: Python Backend Developer
    resume2 = """
    Bob Smith
    bob@example.com
    Backend Developer
    Skills: Python, FastAPI, Flask, SQL, PostgreSQL, Docker, Redis
    Experience:
    Software Engineer at Data Systems (2021 - Present)
    - Developed backend services and REST APIs with Python and FastAPI.
    - Handled PostgreSQL databases and SQL queries.
    - Containerized applications using Docker.
    """
    
    payload2 = {
        "resume": resume2,
        "role": "Frontend Developer", # Target role same or different
        "company": "Swiggy",
        "requirements": "React, TypeScript, Redux, TailwindCSS, REST APIs",
        "mode": "analyze"
    }
    
    print("\nCalling resume-review for Resume 2 (Backend developer applying for Frontend role)...")
    res2 = requests.post(f"{BASE_URL}/career/resume-review", headers=headers, json=payload2)
    print("Status code:", res2.status_code)
    if res2.status_code == 200:
        data2 = res2.json()
        print("Resume 2 ATS score:", data2.get("ats_score"))
        print("Resume 2 highlights:", data2.get("highlights"))
        print("Resume 2 improvements:", data2.get("improvements"))
    else:
        print("Error details:", res2.text)

if __name__ == "__main__":
    test_resume_review()
