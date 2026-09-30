"""
Run this once to see exactly which models YOUR Groq key can access.
    cd backend && python -m scripts.check_models
"""

from groq import Groq

from app.config import get_settings

key = get_settings().groq_api_key
if not key:
    print("GROQ_API_KEY not found. Check your .env file.")
    raise SystemExit(1)

client = Groq(api_key=key)
models = client.models.list()

print("\nModels available to this key:\n")
for m in models.data:
    print(f"  {m.id}")
