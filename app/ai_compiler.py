import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=API_KEY)


def compile_with_gemini(policy_text):
    prompt = f"""
You are Guardian, a fraud-policy compiler.

Convert the merchant's natural-language fraud policy into
ONLY valid JSON.

Allowed fields:
- amount_gt: number or null
- action: "REVIEW" or "DECLINE"

Rules:
1. Never invent fields.
2. Never use V1-V28 because they are anonymized features.
3. If no amount threshold is specified, use null.
4. For blocking, declining, stopping or rejecting use DECLINE.
5. For checking, reviewing or flagging use REVIEW.
6. Return JSON only.

Merchant policy:
{policy_text}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )

    return json.loads(response.text)