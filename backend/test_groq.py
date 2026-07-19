import os
from dotenv import load_dotenv
load_dotenv('/Users/mohammedhammadyousuf/miniproject/miniproject/backend/.env')

key = os.getenv('GROQ_API_KEY', '')
model = os.getenv('GROQ_MODEL', '')
print(f'KEY: {key[:10]}...{key[-4:]}' if key else 'KEY: MISSING')
print(f'MODEL: {model}')

from groq import Groq
client = Groq(api_key=key)
try:
    resp = client.chat.completions.create(
        model=model,
        messages=[{'role': 'user', 'content': 'Say hello in one word'}],
        temperature=0.1,
        max_tokens=20,
    )
    print(f'Response: {resp.choices[0].message.content}')
    print('GROQ IS WORKING')
except Exception as e:
    print(f'GROQ FAILED: {e}')
