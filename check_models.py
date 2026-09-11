"""
Run this once to see exactly which models YOUR Groq key can access.
    python check_models.py
"""

import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

key = os.environ.get("GROQ_API_KEY")
if not key:
    print("GROQ_API_KEY not found. Check your .env file.")
    raise SystemExit(1)

print(f"Using key starting with: {key[:8]}...")

client = Groq(api_key=key)
models = client.models.list()

print("\nModels available to this key:\n")
for m in models.data:
    print(f"  {m.id}")