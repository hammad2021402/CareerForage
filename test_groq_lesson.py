import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY", os.getenv("GROQ_API_KEY"))

system_prompt = """You are an expert curriculum designer. Generate a fully comprehensive, interactive lesson module on the given topic. You MUST return ONLY valid JSON matching this schema:
{
  "title": "Module Title",
  "moduleTitle": "Sub Title",
  "xpReward": 150,
  "watch": {
    "url": "",
    "duration": "10:00",
    "transcript": [{"timestamp": "0:00", "line": "hello"}],
    "resources": [{"label": "doc", "href": "url"}]
  },
  "read": {
    "sections": [{
      "id": "intro",
      "title": "Introduction",
      "paragraphs": ["text"],
      "codeSample": null,
      "callout": null
    }],
    "relatedConcepts": [{"title": "concept", "description": "desc", "resource": "url"}]
  },
  "practice": {
    "instructions": "Do this",
    "starterCode": "console.log()",
    "solution": "console.log('hello')",
    "languages": [{"id": "javascript", "label": "JavaScript", "runtime": "Node 18 + Jest", "monacoLanguage": "javascript"}],
    "tests": [{"id": "t1", "description": "test 1", "hint": "hint", "input": "render", "expected_output": "val"}]
  }
}"""

user_prompt = """Generate a lesson for: "React Hooks"
Description: How to use useState and useEffect
Level: intermediate

Requirements:
- 3-4 read sections with real code examples relevant to React Hooks
- 4-5 transcript entries for the watch section (the video will be fetched separately)
- 2-3 related concepts
- A practice exercise with starter code, solution, and 4 test cases
- XP reward between 150-400 based on difficulty
- All code examples must be in JavaScript/TypeScript and directly related to React Hooks"""

print("Requesting...")
res = requests.post(
    'https://api.groq.com/openai/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {GROQ_API_KEY}'
    },
    json={
        'model': 'openai/gpt-oss-20b',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.7,
        'max_tokens': 4096,
    }
)
data = res.json()
# Save raw response and also extract text content
with open("groq_resp.json", "w") as f:
    json.dump(data, f, indent=2)
text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
print(f"Response text length: {len(text)}")
print("Saved to groq_resp.json")
