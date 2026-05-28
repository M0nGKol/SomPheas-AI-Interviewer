"""AI chat service using Google Gemini (google-genai SDK)."""

import logging
from typing import Optional

from src.core.config import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    key = getattr(settings, "GEMINI_API_KEY", None)
    if not key or key.strip() == "":
        return None

    try:
        from google import genai
        _client = genai.Client(api_key=key)
        return _client
    except ImportError:
        logger.warning("google-genai package not installed — pip install google-genai")
        return None
    except Exception as e:
        logger.warning(f"Failed to init Gemini client: {e}")
        return None


async def get_ai_chat_response(
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
) -> Optional[str]:
    """Call Gemini chat. Returns None if AI is unavailable."""
    client = _get_client()
    if client is None:
        return None

    model_name = model or getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
    try:
        combined = f"{system_prompt}\n\n{user_prompt}"
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=combined,
        )
        return response.text
    except Exception as e:
        logger.warning(f"Gemini chat error: {e}")
        return None


async def get_ai_completion(prompt: str, model: str | None = None) -> Optional[str]:
    """Single-turn completion. Returns None if AI is unavailable."""
    client = _get_client()
    if client is None:
        return None

    model_name = model or getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
    try:
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        return response.text
    except Exception as e:
        logger.warning(f"Gemini completion error: {e}")
        return None


FALLBACK_CHAT_RESPONSES = [
    "I'm here to help! Could you tell me more about your approach to this problem?",
    "That's a good start. Have you considered edge cases in your solution?",
    "What's the time complexity of your current approach? Can we optimize it?",
    "I see your code. Think about how you'd handle the case where the input is empty or null.",
    "Good thinking! Let's break this problem into smaller steps. What would you tackle first?",
]

_fallback_index = 0


def get_fallback_chat_response() -> str:
    global _fallback_index
    response = FALLBACK_CHAT_RESPONSES[_fallback_index % len(FALLBACK_CHAT_RESPONSES)]
    _fallback_index += 1
    return response
