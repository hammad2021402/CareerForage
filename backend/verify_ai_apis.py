import os
import sys
from dotenv import load_dotenv

# Load env variables
load_dotenv("/Users/mohammedhammadyousuf/miniproject/miniproject/backend/.env")

# Keys
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")

print("--- AI API VERIFICATION START ---")

# 1. Test Groq via groq SDK
try:
    from groq import Groq
    client = Groq(api_key=GROQ_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say 'Groq SDK works!'"}]
    )
    print(f"✅ Groq SDK (llama-3.3-70b-versatile): {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ Groq SDK failed: {e}")

# 2. Test Groq via OpenAI SDK
try:
    from openai import OpenAI
    openai_client = OpenAI(
        api_key=GROQ_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
    response = openai_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say 'Groq via OpenAI SDK works!'"}]
    )
    print(f"✅ Groq via OpenAI SDK (llama-3.3-70b-versatile): {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ Groq via OpenAI SDK failed: {e}")

# 3. Test Gemini via google.generativeai
try:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content("Say 'Gemini SDK works!'")
    print(f"✅ Gemini SDK (gemini-2.5-flash): {response.text.strip()}")
except Exception as e:
    print(f"❌ Gemini SDK failed: {e}")

# 4. Test Groq via raw HTTP (like Frontend fetch)
try:
    import requests
    headers = {
        "Authorization": f"Bearer {os.getenv('VITE_GROQ_API_KEY')}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Say 'Frontend Groq Fetch works!'"}]
    }
    resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ Frontend HTTP Fetch (llama-3.3-70b-versatile): {data['choices'][0]['message']['content']}")
    else:
        print(f"❌ Frontend HTTP Fetch failed: Status {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"❌ Frontend HTTP Fetch failed: {e}")

print("--- AI API VERIFICATION COMPLETE ---")
