"""Code review service."""

import logging
from typing import Optional

from src.services.ai.ai_service import get_ai_completion, get_fallback_chat_response
from src.services.ai.prompt_builder import build_code_review_prompt

logger = logging.getLogger(__name__)


async def review_code(
    code: str,
    language: str,
    problem_description: Optional[str] = None,
    execution_result: Optional[dict] = None,
) -> str:
    prompt = build_code_review_prompt(code, language, problem_description, execution_result)
    result = await get_ai_completion(prompt)
    if result:
        return result

    return (
        f"Code review for your {language} submission:\n\n"
        "• Your code has been received. Please ensure it handles edge cases.\n"
        "• Consider the time and space complexity of your solution.\n"
        "• Make sure variable names are descriptive and code is readable.\n"
        "(AI review unavailable — please check your Gemini API key.)"
    )
