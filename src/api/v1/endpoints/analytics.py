"""Analytics endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.core.database import get_db
from src.models.user import User
from src.models.interview import Interview
from src.models.message import Message
from src.models.ai_evaluation import AIEvaluation
from src.models.code_submission import CodeSubmission
from src.models.session_event import SessionEvent
from src.models.problem import Problem
from src.schemas.analytics import (
    OverviewResponse, RecentInterview,
    InterviewAnalyticsResponse, CandidateAnalyticsResponse,
    SystemActivityResponse,
)
from src.api.v1.dependencies import get_current_user, require_roles

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# GET /analytics/overview
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Scope: candidate sees only their own; admin/interviewer sees all
    if current_user.role == "CANDIDATE":
        base_filter = Interview.user_id == current_user.id
    else:
        base_filter = True

    total_result = await db.execute(
        select(func.count(Interview.id)).where(base_filter)
    )
    total = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Interview.id)).where(base_filter, Interview.status == "COMPLETED")
    )
    completed = completed_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(Interview.id)).where(base_filter, Interview.status == "IN_PROGRESS")
    )
    active = active_result.scalar() or 0

    # Average score from ai_evaluations
    score_query = (
        select(func.avg(AIEvaluation.overall_score))
        .join(Interview, AIEvaluation.interview_id == Interview.id)
        .where(base_filter, AIEvaluation.overall_score.isnot(None))
    )
    avg_score_result = await db.execute(score_query)
    avg_score = avg_score_result.scalar()

    # Total code runs
    code_runs_query = (
        select(func.count(CodeSubmission.id))
        .join(Interview, CodeSubmission.interview_id == Interview.id)
        .where(base_filter)
    )
    code_runs_result = await db.execute(code_runs_query)
    total_code_runs = code_runs_result.scalar() or 0

    # Total AI messages
    ai_msg_query = (
        select(func.count(Message.id))
        .join(Interview, Message.interview_id == Interview.id)
        .where(base_filter, Message.sender_type == "AI")
    )
    ai_msg_result = await db.execute(ai_msg_query)
    total_ai_messages = ai_msg_result.scalar() or 0

    # Recent interviews
    recent_result = await db.execute(
        select(Interview, AIEvaluation.overall_score)
        .outerjoin(AIEvaluation, AIEvaluation.interview_id == Interview.id)
        .where(base_filter)
        .order_by(Interview.created_at.desc())
        .limit(10)
    )
    recent_rows = recent_result.all()
    recent_interviews = [
        RecentInterview(
            id=row.Interview.id,
            title=row.Interview.title,
            status=row.Interview.status,
            user_id=row.Interview.user_id,
            created_at=row.Interview.created_at.isoformat(),
            completed_at=row.Interview.completed_at.isoformat() if row.Interview.completed_at else None,
            overall_score=row.overall_score,
        )
        for row in recent_rows
    ]

    # Recent session events
    events_result = await db.execute(
        select(SessionEvent)
        .join(Interview, SessionEvent.interview_id == Interview.id)
        .where(base_filter)
        .order_by(SessionEvent.created_at.desc())
        .limit(10)
    )
    recent_events = [
        {
            "id": e.id,
            "interview_id": e.interview_id,
            "event_type": e.event_type,
            "created_at": e.created_at.isoformat(),
        }
        for e in events_result.scalars().all()
    ]

    return OverviewResponse(
        total_interviews=total,
        completed_interviews=completed,
        active_interviews=active,
        average_score=round(float(avg_score), 1) if avg_score else None,
        average_duration_minutes=None,
        total_code_runs=total_code_runs,
        total_ai_messages=total_ai_messages,
        recent_interviews=recent_interviews,
        recent_session_events=recent_events,
    )


# ---------------------------------------------------------------------------
# GET /analytics/interviews/{interview_id}
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}", response_model=InterviewAnalyticsResponse)
async def get_interview_analytics(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # User
    user_result = await db.execute(select(User).where(User.id == interview.user_id))
    candidate = user_result.scalar_one_or_none()

    # Problem
    problem = None
    if interview.problem_id:
        p_result = await db.execute(select(Problem).where(Problem.id == interview.problem_id))
        problem = p_result.scalar_one_or_none()

    # Code submissions
    sub_count_result = await db.execute(
        select(func.count(CodeSubmission.id)).where(CodeSubmission.interview_id == interview_id)
    )
    sub_count = sub_count_result.scalar() or 0

    latest_sub_result = await db.execute(
        select(CodeSubmission)
        .where(CodeSubmission.interview_id == interview_id)
        .order_by(CodeSubmission.created_at.desc())
        .limit(1)
    )
    latest_sub = latest_sub_result.scalar_one_or_none()
    latest_code_result = None
    if latest_sub:
        latest_code_result = {
            "status": latest_sub.status,
            "stdout": latest_sub.stdout,
            "stderr": latest_sub.stderr,
            "runtime_ms": latest_sub.runtime_ms,
            "passed": latest_sub.passed,
        }

    # AI evaluation
    eval_result = await db.execute(
        select(AIEvaluation).where(AIEvaluation.interview_id == interview_id)
    )
    evaluation = eval_result.scalar_one_or_none()
    ai_evaluation = None
    if evaluation:
        ai_evaluation = {
            "overall_score": evaluation.overall_score,
            "technical_score": evaluation.technical_score,
            "code_quality_score": evaluation.code_quality_score,
            "communication_score": evaluation.communication_score,
            "problem_solving_score": evaluation.problem_solving_score,
            "feedback_summary": evaluation.feedback_summary,
        }

    # Session events
    events_result = await db.execute(
        select(SessionEvent)
        .where(SessionEvent.interview_id == interview_id)
        .order_by(SessionEvent.created_at.asc())
    )
    session_events = [
        {"event_type": e.event_type, "created_at": e.created_at.isoformat()}
        for e in events_result.scalars().all()
    ]

    # Message count
    msg_count_result = await db.execute(
        select(func.count(Message.id)).where(Message.interview_id == interview_id)
    )
    msg_count = msg_count_result.scalar() or 0

    return InterviewAnalyticsResponse(
        interview_id=interview.id,
        title=interview.title,
        status=interview.status,
        language=interview.language,
        user_id=interview.user_id,
        user_email=candidate.email if candidate else None,
        problem_id=interview.problem_id,
        problem_title=problem.title if problem else None,
        code_submissions_count=sub_count,
        latest_code_result=latest_code_result,
        ai_evaluation=ai_evaluation,
        session_events=session_events,
        message_count=msg_count,
        started_at=interview.started_at.isoformat() if interview.started_at else None,
        completed_at=interview.completed_at.isoformat() if interview.completed_at else None,
        created_at=interview.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /analytics/candidates/{candidate_id}
# ---------------------------------------------------------------------------

@router.get("/candidates/{candidate_id}", response_model=CandidateAnalyticsResponse)
async def get_candidate_analytics(
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "CANDIDATE" and current_user.id != candidate_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    user_result = await db.execute(select(User).where(User.id == candidate_id))
    candidate = user_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    # Interviews
    interviews_result = await db.execute(
        select(Interview).where(Interview.user_id == candidate_id)
    )
    interviews = interviews_result.scalars().all()
    total = len(interviews)
    completed = sum(1 for i in interviews if i.status == "COMPLETED")
    interview_ids = [i.id for i in interviews]

    # Scores
    avg_score = None
    best_score = None
    latest_feedback = None
    if interview_ids:
        scores_result = await db.execute(
            select(AIEvaluation.overall_score, AIEvaluation.feedback_summary)
            .where(
                AIEvaluation.interview_id.in_(interview_ids),
                AIEvaluation.overall_score.isnot(None),
            )
            .order_by(AIEvaluation.overall_score.desc())
        )
        score_rows = scores_result.all()
        if score_rows:
            scores = [r.overall_score for r in score_rows]
            avg_score = round(sum(scores) / len(scores), 1)
            best_score = max(scores)
            latest_feedback = score_rows[0].feedback_summary

    # Code runs
    code_runs = 0
    if interview_ids:
        runs_result = await db.execute(
            select(func.count(CodeSubmission.id))
            .where(CodeSubmission.interview_id.in_(interview_ids))
        )
        code_runs = runs_result.scalar() or 0

    # Messages
    total_messages = 0
    if interview_ids:
        msg_result = await db.execute(
            select(func.count(Message.id))
            .where(Message.interview_id.in_(interview_ids), Message.sender_type == "CANDIDATE")
        )
        total_messages = msg_result.scalar() or 0

    return CandidateAnalyticsResponse(
        user_id=candidate.id,
        email=candidate.email,
        full_name=candidate.full_name,
        total_interviews=total,
        completed_interviews=completed,
        average_score=avg_score,
        best_score=best_score,
        latest_feedback=latest_feedback,
        total_code_runs=code_runs,
        total_messages=total_messages,
    )


# ---------------------------------------------------------------------------
# GET /analytics/system-activity
# ---------------------------------------------------------------------------

@router.get("/system-activity", response_model=SystemActivityResponse)
async def get_system_activity(
    current_user: User = Depends(require_roles("INTERVIEWER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    events_result = await db.execute(
        select(SessionEvent).order_by(SessionEvent.created_at.desc()).limit(20)
    )
    events = [
        {
            "id": e.id,
            "interview_id": e.interview_id,
            "user_id": e.user_id,
            "event_type": e.event_type,
            "created_at": e.created_at.isoformat(),
        }
        for e in events_result.scalars().all()
    ]

    subs_result = await db.execute(
        select(CodeSubmission).order_by(CodeSubmission.created_at.desc()).limit(10)
    )
    subs = [
        {
            "id": s.id,
            "interview_id": s.interview_id,
            "language": s.language,
            "status": s.status,
            "passed": s.passed,
            "runtime_ms": s.runtime_ms,
            "created_at": s.created_at.isoformat(),
        }
        for s in subs_result.scalars().all()
    ]

    completed_result = await db.execute(
        select(Interview)
        .where(Interview.status == "COMPLETED")
        .order_by(Interview.completed_at.desc())
        .limit(10)
    )
    completed = [
        {
            "id": i.id,
            "title": i.title,
            "user_id": i.user_id,
            "completed_at": i.completed_at.isoformat() if i.completed_at else None,
        }
        for i in completed_result.scalars().all()
    ]

    return SystemActivityResponse(
        recent_session_events=events,
        recent_code_submissions=subs,
        recent_completed_interviews=completed,
    )
