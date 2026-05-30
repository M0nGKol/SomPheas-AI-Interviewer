"""AI chat and evaluation endpoints."""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.models.user import User
from src.models.interview import Interview
from src.models.message import Message
from src.models.ai_evaluation import AIEvaluation
from src.models.problem import Problem
from src.models.code_submission import CodeSubmission
from src.models.session_event import SessionEvent
from src.schemas.ai import (
    ChatMessageRequest, MessageResponse, ChatResponse,
    CodeReviewRequest, CodeReviewResponse, EvaluationResponse,
)
from src.api.v1.dependencies import get_current_user
from src.services.ai.ai_service import get_ai_chat_response, get_ai_stream_response, get_fallback_chat_response
from src.services.ai.prompt_builder import build_chat_system_prompt, build_chat_user_prompt
from src.services.ai.code_review_service import review_code
from src.services.ai.evaluation_service import generate_evaluation

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /ai/generate-problem
# ---------------------------------------------------------------------------

@router.post("/generate-problem")
async def generate_problem(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Use Gemini to generate a coding problem. Returns title, description, difficulty, starter_code."""
    if current_user.role not in ("INTERVIEWER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only interviewers can generate problems")

    body = await request.json()
    topic = body.get("topic", "data structures and algorithms")
    difficulty = body.get("difficulty", "MEDIUM")

    prompt = f"""Generate a coding interview problem about {topic} at {difficulty} difficulty.
Return a JSON object with these exact fields:
{{
  "title": "Problem title (short, clear)",
  "description": "Full problem description with examples and constraints (markdown supported)",
  "difficulty": "{difficulty}",
  "starter_code": "Python starter code with function signature and docstring"
}}
Return ONLY valid JSON, no extra text."""

    from src.services.ai.ai_service import get_ai_completion
    result_text = await get_ai_completion(prompt)
    if not result_text:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service unavailable")

    try:
        import re
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\n?|```$", "", result_text.strip(), flags=re.MULTILINE).strip()
        import json as _json
        data = _json.loads(cleaned)
        return data
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to parse AI response")


def _msg_to_response(msg: Message) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        interview_id=msg.interview_id,
        sender_id=msg.sender_id,
        sender_type=msg.sender_type,
        content=msg.content,
        created_at=msg.created_at.isoformat(),
    )


async def _get_interview_or_404(interview_id: int, db: AsyncSession) -> Interview:
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


async def _assert_candidate_access(interview: Interview, user: User) -> None:
    if user.role == "CANDIDATE" and interview.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


# ---------------------------------------------------------------------------
# POST /ai/interviews/{interview_id}/message
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/message", response_model=ChatResponse)
async def send_message(
    interview_id: int,
    body: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_candidate_access(interview, current_user)

    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Fetch problem if assigned
    problem = None
    if interview.problem_id:
        p_result = await db.execute(select(Problem).where(Problem.id == interview.problem_id))
        problem = p_result.scalar_one_or_none()

    # Fetch recent message history
    hist_result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    history_msgs = list(reversed(hist_result.scalars().all()))
    history = [{"sender_type": m.sender_type, "content": m.content} for m in history_msgs]

    # Save candidate message
    candidate_msg = Message(
        interview_id=interview_id,
        sender_id=current_user.id,
        sender_type="CANDIDATE",
        content=body.content,
    )
    db.add(candidate_msg)
    await db.flush()

    # Build prompts
    system_prompt = build_chat_system_prompt(
        interview.title,
        problem.description if problem else None,
    )
    user_prompt = build_chat_user_prompt(
        candidate_message=body.content,
        current_code=body.current_code or interview.current_code,
        language=body.language or interview.language,
        execution_result=body.execution_result,
        history=history,
    )

    # Get AI response
    ai_text = await get_ai_chat_response(system_prompt, user_prompt)
    if not ai_text:
        ai_text = get_fallback_chat_response()

    ai_msg = Message(
        interview_id=interview_id,
        sender_id=None,
        sender_type="AI",
        content=ai_text,
    )
    db.add(ai_msg)
    await db.commit()
    await db.refresh(candidate_msg)
    await db.refresh(ai_msg)

    return ChatResponse(
        user_message=_msg_to_response(candidate_msg),
        ai_message=_msg_to_response(ai_msg),
    )


# ---------------------------------------------------------------------------
# POST /ai/interviews/{interview_id}/stream-message  (SSE streaming)
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/stream-message")
async def stream_message(
    interview_id: int,
    body: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream AI response as Server-Sent Events. Each SSE event contains a text chunk."""
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_candidate_access(interview, current_user)

    problem = None
    if interview.problem_id:
        p_result = await db.execute(select(Problem).where(Problem.id == interview.problem_id))
        problem = p_result.scalar_one_or_none()

    hist_result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    history = [{"sender_type": m.sender_type, "content": m.content} for m in reversed(hist_result.scalars().all())]

    # Persist candidate message immediately
    candidate_msg = Message(
        interview_id=interview_id,
        sender_id=current_user.id,
        sender_type="CANDIDATE",
        content=body.content,
    )
    db.add(candidate_msg)
    await db.commit()
    await db.refresh(candidate_msg)

    system_prompt = build_chat_system_prompt(interview.title, problem.description if problem else None)
    user_prompt = build_chat_user_prompt(
        candidate_message=body.content,
        current_code=body.current_code or interview.current_code,
        language=body.language or interview.language,
        execution_result=body.execution_result,
        history=history,
    )

    async def event_generator():
        full_text = []
        # Send the saved user message id first so the client knows it
        yield f"data: {json.dumps({'type': 'user_message_id', 'id': candidate_msg.id})}\n\n"

        async for chunk in get_ai_stream_response(system_prompt, user_prompt):
            full_text.append(chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        # Persist complete AI message
        complete_text = "".join(full_text)
        ai_msg = Message(
            interview_id=interview_id,
            sender_id=None,
            sender_type="AI",
            content=complete_text,
        )
        db.add(ai_msg)
        await db.commit()
        await db.refresh(ai_msg)

        yield f"data: {json.dumps({'type': 'done', 'ai_message': {'id': ai_msg.id, 'content': complete_text, 'sender_type': 'AI', 'created_at': ai_msg.created_at.isoformat()}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# GET /ai/interviews/{interview_id}/messages
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_candidate_access(interview, current_user)

    result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at.asc())
    )
    return [_msg_to_response(m) for m in result.scalars().all()]


# ---------------------------------------------------------------------------
# POST /ai/interviews/{interview_id}/review-code
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/review-code", response_model=CodeReviewResponse)
async def review_interview_code(
    interview_id: int,
    body: CodeReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_candidate_access(interview, current_user)

    problem = None
    if interview.problem_id:
        p_result = await db.execute(select(Problem).where(Problem.id == interview.problem_id))
        problem = p_result.scalar_one_or_none()

    review_text = await review_code(
        code=body.code,
        language=body.language or interview.language,
        problem_description=problem.description if problem else None,
        execution_result=body.execution_result,
    )

    msg = Message(
        interview_id=interview_id,
        sender_id=None,
        sender_type="AI",
        content=f"**Code Review:**\n\n{review_text}",
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return CodeReviewResponse(review=review_text, message=_msg_to_response(msg))


# ---------------------------------------------------------------------------
# POST /ai/interviews/{interview_id}/evaluate
# ---------------------------------------------------------------------------

class EvaluateJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


@router.post("/interviews/{interview_id}/evaluate")
async def evaluate_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dispatch AI evaluation to a background Celery worker.
    Returns 202 Accepted with a job_id immediately.
    The frontend polls GET /evaluation to check when results are ready.
    Falls back to synchronous evaluation if Celery is unavailable.
    """
    interview = await _get_interview_or_404(interview_id, db)

    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if interview.status not in ("SUBMITTED", "EVALUATING", "COMPLETED", "IN_PROGRESS"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot evaluate interview with status '{interview.status}'",
        )

    # Return existing evaluation immediately
    existing = await db.execute(
        select(AIEvaluation).where(AIEvaluation.interview_id == interview_id)
    )
    if existing_eval := existing.scalar_one_or_none():
        return _eval_to_response(existing_eval)

    # Try to dispatch to Celery worker
    try:
        from src.workers.tasks import evaluate_interview_task
        task = evaluate_interview_task.delay(interview_id)
        logger.info("Dispatched evaluate_interview_task for interview %d, job=%s", interview_id, task.id)
        # Mark as EVALUATING so the frontend knows work has started
        if interview.status not in ("COMPLETED",):
            interview.status = "EVALUATING"
            await db.commit()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=202,
            content={
                "job_id": task.id,
                "status": "queued",
                "message": "Evaluation queued. Poll GET /evaluation to check progress.",
            },
        )
    except Exception as celery_err:
        logger.warning("Celery unavailable (%s), falling back to synchronous evaluation", celery_err)

    # ---- Synchronous fallback (no Celery) ----
    if interview.status != "COMPLETED":
        interview.status = "EVALUATING"
        await db.flush()

    problem = None
    if interview.problem_id:
        p_result = await db.execute(select(Problem).where(Problem.id == interview.problem_id))
        problem = p_result.scalar_one_or_none()

    submissions_result = await db.execute(
        select(CodeSubmission)
        .where(CodeSubmission.interview_id == interview_id)
        .order_by(CodeSubmission.created_at.desc())
        .limit(10)
    )
    code_results = [
        {"status": s.status, "stdout": s.stdout, "stderr": s.stderr, "runtime_ms": s.runtime_ms}
        for s in submissions_result.scalars().all()
    ]

    messages_result = await db.execute(
        select(Message)
        .where(Message.interview_id == interview_id)
        .order_by(Message.created_at.asc())
    )
    messages = [
        {"sender_type": m.sender_type, "content": m.content}
        for m in messages_result.scalars().all()
    ]

    events_result = await db.execute(
        select(SessionEvent)
        .where(SessionEvent.interview_id == interview_id)
        .order_by(SessionEvent.created_at.asc())
    )
    events = [
        {
            "event_type": e.event_type,
            "event_metadata": e.event_metadata,
            "created_at": e.created_at.isoformat(),
        }
        for e in events_result.scalars().all()
    ]

    eval_data = await generate_evaluation(
        problem_title=problem.title if problem else interview.title,
        problem_description=problem.description if problem else None,
        final_code=interview.current_code,
        language=interview.language,
        code_results=code_results,
        messages=messages,
        session_events=events,
    )

    evaluation = AIEvaluation(
        interview_id=interview_id,
        technical_score=eval_data.get("technical_score"),
        code_quality_score=eval_data.get("code_quality_score"),
        communication_score=eval_data.get("communication_score"),
        problem_solving_score=eval_data.get("problem_solving_score"),
        overall_score=eval_data.get("overall_score"),
        strengths=eval_data.get("strengths"),
        weaknesses=eval_data.get("weaknesses"),
        feedback_summary=eval_data.get("feedback_summary"),
        raw_evaluation=eval_data,
    )
    db.add(evaluation)
    interview.status = "COMPLETED"
    if not interview.completed_at:
        interview.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(evaluation)
    return _eval_to_response(evaluation)


# ---------------------------------------------------------------------------
# GET /ai/interviews/{interview_id}/evaluation
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}/evaluation", response_model=EvaluationResponse)
async def get_evaluation(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(AIEvaluation).where(AIEvaluation.interview_id == interview_id)
    )
    evaluation = result.scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    return _eval_to_response(evaluation)


def _eval_to_response(e: AIEvaluation) -> EvaluationResponse:
    return EvaluationResponse(
        id=e.id,
        interview_id=e.interview_id,
        technical_score=e.technical_score,
        code_quality_score=e.code_quality_score,
        communication_score=e.communication_score,
        problem_solving_score=e.problem_solving_score,
        overall_score=e.overall_score,
        strengths=e.strengths,
        weaknesses=e.weaknesses,
        feedback_summary=e.feedback_summary,
        raw_evaluation=e.raw_evaluation,
        created_at=e.created_at.isoformat(),
    )
