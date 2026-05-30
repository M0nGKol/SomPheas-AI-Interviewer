"""Build prompts for AI chat and evaluation."""

from typing import Optional, List


def build_chat_system_prompt(interview_title: str, problem_description: Optional[str]) -> str:
    problem_section = f"\nProblem:\n{problem_description}" if problem_description else ""
    return f"""You are an AI technical interviewer assistant for the interview: "{interview_title}".{problem_section}

Your role:
- Guide the candidate through the coding problem
- Ask clarifying questions when needed
- Give hints without revealing the full solution
- Provide constructive feedback on their approach
- Keep responses concise and focused

Respond in plain text. Be encouraging but technically rigorous."""


def build_chat_user_prompt(
    candidate_message: str,
    current_code: Optional[str],
    language: Optional[str],
    execution_result: Optional[dict],
    history: List[dict],
) -> str:
    parts = []

    if history:
        parts.append("Conversation so far:")
        for msg in history[-10:]:
            role = msg.get("sender_type", "USER")
            content = msg.get("content", "")
            parts.append(f"[{role}]: {content}")
        parts.append("")

    if current_code:
        lang = language or "code"
        parts.append(f"Current {lang} code:\n```{lang}\n{current_code}\n```")

    if execution_result:
        status = execution_result.get("status", "")
        stdout = execution_result.get("stdout", "")
        stderr = execution_result.get("stderr", "")
        if stdout or stderr:
            parts.append(f"Execution result ({status}):")
            if stdout:
                parts.append(f"Output: {stdout[:500]}")
            if stderr:
                parts.append(f"Error: {stderr[:500]}")

    parts.append(f"Candidate: {candidate_message}")
    return "\n".join(parts)


def build_code_review_prompt(
    code: str,
    language: str,
    problem_description: Optional[str],
    execution_result: Optional[dict],
) -> str:
    problem_section = f"Problem:\n{problem_description}\n\n" if problem_description else ""
    exec_section = ""
    if execution_result:
        status = execution_result.get("status", "")
        stdout = execution_result.get("stdout", "")
        stderr = execution_result.get("stderr", "")
        exec_section = f"\nExecution result ({status}):\n"
        if stdout:
            exec_section += f"Output: {stdout[:500]}\n"
        if stderr:
            exec_section += f"Error: {stderr[:500]}\n"

    return f"""{problem_section}Review this {language} code submission:

```{language}
{code}
```{exec_section}
Provide a concise code review covering:
1. Correctness and logic
2. Time/space complexity
3. Code quality and style
4. Specific improvement suggestions

Be constructive and technical."""


def build_evaluation_prompt(
    problem_title: str,
    problem_description: Optional[str],
    final_code: Optional[str],
    language: str,
    code_results: List[dict],
    messages: List[dict],
    session_events: List[dict],
) -> str:
    problem_section = f"Problem: {problem_title}\n{problem_description or ''}\n\n"

    code_section = ""
    if final_code:
        code_section = f"Final Code ({language}):\n```{language}\n{final_code[:3000]}\n```\n\n"

    results_section = ""
    if code_results:
        results_section = "Code Execution Results:\n"
        for r in code_results[-3:]:
            results_section += f"- Status: {r.get('status')}, Runtime: {r.get('runtime_ms')}ms\n"
            if r.get("stdout"):
                results_section += f"  Output: {r['stdout'][:200]}\n"
            if r.get("stderr"):
                results_section += f"  Error: {r['stderr'][:200]}\n"
        results_section += "\n"

    chat_section = ""
    if messages:
        chat_section = "Conversation History:\n"
        for m in messages[-20:]:
            chat_section += f"[{m.get('sender_type', 'USER')}]: {m.get('content', '')[:300]}\n"
        chat_section += "\n"

    # Surface integrity flags so AI can mention them in feedback
    integrity_section = ""
    flag_events = [
        e for e in session_events
        if e.get("event_type") in ("PASTE_DETECTED", "SUSPICIOUS_ACTIVITY")
    ]
    if flag_events:
        integrity_section = "⚠️ Integrity Flags (detected automatically):\n"
        for fe in flag_events:
            meta = fe.get("event_metadata") or {}
            chars = meta.get("chars_added", "?")
            integrity_section += (
                f"- {fe['event_type']}: {chars} characters inserted at once\n"
            )
        integrity_section += (
            "Note: these may indicate copy-paste from external sources. "
            "Factor this into your assessment if relevant.\n\n"
        )

    return f"""{problem_section}{code_section}{results_section}{chat_section}{integrity_section}
Evaluate this technical interview and respond with ONLY a JSON object (no markdown, no explanation):

{{
  "technical_score": <0-100>,
  "code_quality_score": <0-100>,
  "communication_score": <0-100>,
  "problem_solving_score": <0-100>,
  "overall_score": <0-100>,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "feedback_summary": "2-3 sentence summary"
}}

Score criteria: 90-100=Excellent, 70-89=Good, 50-69=Average, below 50=Needs improvement."""
