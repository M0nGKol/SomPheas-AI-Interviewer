"""AI evaluation service for completed interviews."""

import json
import logging
from typing import Optional, List

from src.services.ai.ai_service import get_ai_completion
from src.services.ai.prompt_builder import build_evaluation_prompt

logger = logging.getLogger(__name__)


async def generate_evaluation(
    problem_title: str,
    problem_description: Optional[str],
    final_code: Optional[str],
    language: str,
    code_results: List[dict],
    messages: List[dict],
    session_events: List[dict],
) -> dict:
    """Generate AI evaluation. Falls back to heuristic scoring if AI unavailable."""
    prompt = build_evaluation_prompt(
        problem_title, problem_description, final_code,
        language, code_results, messages, session_events,
    )

    raw_text = await get_ai_completion(prompt)

    if raw_text:
        try:
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned
            data = json.loads(cleaned)
            _validate_evaluation(data)
            return data
        except Exception as e:
            logger.warning(f"Failed to parse AI evaluation JSON: {e}. Raw: {raw_text[:200]}")

    return _fallback_evaluation(final_code, code_results, messages)


def _validate_evaluation(data: dict) -> None:
    required = ["technical_score", "code_quality_score", "communication_score",
                "problem_solving_score", "overall_score", "strengths", "weaknesses",
                "feedback_summary"]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing key: {key}")
    for score_key in ["technical_score", "code_quality_score", "communication_score",
                      "problem_solving_score", "overall_score"]:
        val = data[score_key]
        if not isinstance(val, (int, float)):
            raise ValueError(f"{score_key} must be numeric")
        data[score_key] = max(0, min(100, int(val)))


def _fallback_evaluation(
    final_code: Optional[str],
    code_results: List[dict],
    messages: List[dict],
) -> dict:
    has_code = bool(final_code and final_code.strip())
    passed_runs = sum(1 for r in code_results if r.get("status") == "SUCCESS")
    total_runs = len(code_results)
    message_count = len([m for m in messages if m.get("sender_type") == "CANDIDATE"])

    code_score = 60
    if has_code:
        code_score = 65
        if total_runs > 0:
            code_score = 55 + int((passed_runs / total_runs) * 35)

    comm_score = min(80, 40 + message_count * 5)
    tech_score = code_score
    prob_score = 55 if has_code else 40
    overall = int((tech_score + code_score + comm_score + prob_score) / 4)

    strengths = []
    weaknesses = []
    if has_code:
        strengths.append("Submitted a code solution")
    if passed_runs > 0:
        strengths.append(f"Code ran successfully ({passed_runs}/{total_runs} runs passed)")
    if message_count > 2:
        strengths.append("Engaged actively in conversation")

    if not has_code:
        weaknesses.append("No code was submitted")
    if total_runs == 0:
        weaknesses.append("Code was not tested")
    if message_count < 2:
        weaknesses.append("Limited communication during the session")

    return {
        "technical_score": tech_score,
        "code_quality_score": code_score,
        "communication_score": comm_score,
        "problem_solving_score": prob_score,
        "overall_score": overall,
        "strengths": strengths or ["Participated in the interview session"],
        "weaknesses": weaknesses or ["More practice recommended"],
        "feedback_summary": (
            "This evaluation was generated using available session data. "
            "Connect a Gemini API key for detailed AI-powered feedback."
        ),
    }
