"""Background tasks for AI evaluation and code execution."""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from src.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine in a sync Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(
    bind=True,
    name="evaluate_interview",
    max_retries=3,
    default_retry_delay=10,
)
def evaluate_interview_task(self, interview_id: int) -> dict:
    """
    Run AI evaluation for a completed interview in the background.
    Updates interview status: SUBMITTED/IN_PROGRESS → EVALUATING → COMPLETED.
    """
    return _run_async(_evaluate_interview_async(self, interview_id))


async def _evaluate_interview_async(task, interview_id: int) -> dict:
    from src.core.database import AsyncSessionLocal
    from src.models.interview import Interview
    from src.models.ai_evaluation import AIEvaluation
    from src.models.problem import Problem
    from src.models.message import Message
    from src.models.code_submission import CodeSubmission
    from src.models.session_event import SessionEvent
    from src.services.ai.evaluation_service import generate_evaluation

    async with AsyncSessionLocal() as db:
        # Load interview
        result = await db.execute(select(Interview).where(Interview.id == interview_id))
        interview = result.scalar_one_or_none()
        if not interview:
            logger.error("evaluate_interview_task: interview %d not found", interview_id)
            return {"error": "Interview not found"}

        # Skip if already evaluated
        existing = await db.execute(
            select(AIEvaluation).where(AIEvaluation.interview_id == interview_id)
        )
        if existing.scalar_one_or_none():
            logger.info("evaluate_interview_task: interview %d already evaluated", interview_id)
            return {"status": "already_evaluated"}

        # Mark as EVALUATING
        interview.status = "EVALUATING"
        await db.flush()
        await db.commit()

        try:
            # Load context
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

            # Run AI evaluation
            eval_data = await generate_evaluation(
                problem_title=problem.title if problem else interview.title,
                problem_description=problem.description if problem else None,
                final_code=interview.current_code,
                language=interview.language,
                code_results=code_results,
                messages=messages,
                session_events=events,
            )

            # Save evaluation record
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

            # Mark COMPLETED
            interview.status = "COMPLETED"
            if not interview.completed_at:
                interview.completed_at = datetime.now(timezone.utc)

            await db.commit()
            await db.refresh(evaluation)

            logger.info(
                "evaluate_interview_task: interview %d evaluated, score=%.2f",
                interview_id,
                eval_data.get("overall_score", 0),
            )
            return {
                "status": "completed",
                "interview_id": interview_id,
                "overall_score": eval_data.get("overall_score"),
            }

        except Exception as exc:
            logger.error("evaluate_interview_task: interview %d failed: %s", interview_id, exc)
            # Roll back to SUBMITTED so it can be retried
            try:
                await db.execute(
                    select(Interview).where(Interview.id == interview_id)
                )
                result2 = await db.execute(select(Interview).where(Interview.id == interview_id))
                iv = result2.scalar_one_or_none()
                if iv and iv.status == "EVALUATING":
                    iv.status = "SUBMITTED"
                    await db.commit()
            except Exception:
                pass
            raise task.retry(exc=exc)
