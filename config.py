import os

# Ollama runs locally — no API key needed.
# Pull models first: `ollama pull llama3.1` (or whichever you want below)
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

# One model per task — swap freely, e.g. use a bigger model for scoring.
MODEL_SKILLS = "llama3.1"
MODEL_SCORING = "llama3.1"
MODEL_RECOMMENDATIONS = "llama3.1"

MAX_TOKENS = 1500