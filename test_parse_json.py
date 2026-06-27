import json
import traceback

with open("groq_resp.json", "r") as f:
    data = json.load(f)

text = data.get("output_text", "")
print(f"Total output_text length: {len(text)}")
cleaned = text.replace("```json", "").replace("```", "").strip()
print(f"Cleaned output_text length: {len(cleaned)}")

try:
    parsed = json.loads(cleaned)
    print("Successfully parsed JSON!")
    print(list(parsed.keys()))
except Exception as e:
    print(f"JSON Parse Error: {e}")
    # Print the last few hundred characters to see if it's truncated or malformed
    print("End of cleaned text:")
    print(repr(cleaned[-500:]))
