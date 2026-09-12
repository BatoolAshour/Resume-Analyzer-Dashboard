import os

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# NOTE: gpt-oss-20b is NOT free — $0.075/1M input, $0.30/1M output tokens.
# Cheap, but not $0 like allam-2-7b was.
MODEL_SKILLS = "openai/gpt-oss-20b"
MODEL_SCORING = "openai/gpt-oss-20b"
MODEL_RECOMMENDATIONS = "openai/gpt-oss-20b"
MODEL_ATS_CHECK = "openai/gpt-oss-20b"  # standalone resume-only ATS check

MAX_TOKENS = 2500