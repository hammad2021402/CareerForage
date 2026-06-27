import os
import sys
from dotenv import load_dotenv

# Load backend environment
load_dotenv()

print("GEMINI_API_KEY length:", len(os.getenv("GEMINI_API_KEY", "")))
print("GROQ_API_KEY length:", len(os.getenv("GROQ_API_KEY", "")))

import google.generativeai as genai
from openai import OpenAI

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

print("Using Gemini model:", GEMINI_MODEL)

try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        resp = model.generate_content("Hello, respond with 'Gemini OK' and nothing else.")
        print("Gemini response:", resp.text.strip())
    else:
        print("No GEMINI_API_KEY")
except Exception as e:
    print("Gemini Error:", e)

try:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    if GROQ_API_KEY:
        client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": "Hello, respond with 'Groq OK' and nothing else."}],
            max_tokens=10
        )
        print("Groq response:", resp.choices[0].message.content.strip())
    else:
        print("No GROQ_API_KEY")
except Exception as e:
    print("Groq Error:", e)
