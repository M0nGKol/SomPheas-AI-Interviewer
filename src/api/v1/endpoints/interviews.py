"""Interview session endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from src.core.database import get_db
from src.models.user import User
from src.models.interview import Interview
from src.models.session_event import SessionEvent
from src.schemas.interview import (
    InterviewCreate,
    InterviewUpdate,
    InterviewResponse,
    InterviewStartResponse,
    InterviewSubmitRequest,
)
from src.api.v1.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_response(interview: Interview) -> InterviewResponse:
    return InterviewResponse(
        id=interview.id,
        user_id=interview.user_id,
        interviewer_id=interview.interviewer_id,
        problem_id=interview.problem_id,
        title=interview.title,
        status=interview.status,
        language=interview.language,
        current_code=interview.current_code,
        feedback=interview.feedback,
        started_at=interview.started_at.isoformat() if interview.started_at else None,
        completed_at=interview.completed_at.isoformat() if interview.completed_at else None,
        created_at=interview.created_at.isoformat(),
        updated_at=interview.updated_at.isoformat(),
    )


async def _log_event(db: AsyncSession, interview_id: int, user_id: int | None, event_type: str) -> None:
    event = SessionEvent(
        interview_id=interview_id,
        user_id=user_id,
        event_type=event_type,
    )
    db.add(event)


async def _get_interview_or_404(interview_id: int, db: AsyncSession) -> Interview:
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


async def _assert_access(interview: Interview, user: User) -> None:
    """CANDIDATE can only access their own interview. INTERVIEWER/ADMIN can access any."""
    if user.role == "CANDIDATE" and interview.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


# ---------------------------------------------------------------------------
# POST /interviews
# ---------------------------------------------------------------------------
@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    data: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = Interview(
        user_id=current_user.id,
        title=data.title,
        problem_id=data.problem_id,
        language=data.language,
        status="CREATED",
        conversation_history=[],
        turn_count=0,
    )
    db.add(interview)
    await db.flush()
    await _log_event(db, interview.id, current_user.id, "SESSION_CREATED")
    await db.commit()
    await db.refresh(interview)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# GET /interviews
# ---------------------------------------------------------------------------
@router.get("", response_model=list[InterviewResponse])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role in ("INTERVIEWER", "ADMIN"):
        result = await db.execute(select(Interview).order_by(Interview.created_at.desc()))
    else:
        result = await db.execute(
            select(Interview)
            .where(Interview.user_id == current_user.id)
            .order_by(Interview.created_at.desc())
        )
    return [_to_response(i) for i in result.scalars().all()]


# ---------------------------------------------------------------------------
# GET /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# PATCH /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.patch("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    # CANDIDATE can only update title/language/current_code on their own interview
    updates = data.model_dump(exclude_unset=True)
    if current_user.role == "CANDIDATE":
        allowed = {"title", "language", "current_code"}
        updates = {k: v for k, v in updates.items() if k in allowed}

    for field, value in updates.items():
        setattr(interview, field, value)

    await db.commit()
    await db.refresh(interview)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/start
# ---------------------------------------------------------------------------
@router.post("/{interview_id}/start", response_model=InterviewStartResponse)
async def start_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    if interview.status not in ("CREATED", "WAITING"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start interview with status '{interview.status}'",
        )

    interview.status = "IN_PROGRESS"
    interview.started_at = datetime.now(timezone.utc)
    await _log_event(db, interview.id, current_user.id, "SESSION_STARTED")
    await db.commit()
    await db.refresh(interview)
    return InterviewStartResponse(
        id=interview.id,
        status=interview.status,
        started_at=interview.started_at.isoformat() if interview.started_at else None,
    )


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/submit
# ---------------------------------------------------------------------------
@router.post("/{interview_id}/submit", response_model=InterviewResponse)
async def submit_interview(
    interview_id: int,
    body: InterviewSubmitRequest = InterviewSubmitRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    if interview.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit interview with status '{interview.status}'",
        )

    interview.status = "SUBMITTED"
    if body.code is not None:
        interview.current_code = body.code
    await _log_event(db, interview.id, current_user.id, "SESSION_SUBMITTED")
    await db.commit()
    await db.refresh(interview)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/complete
# ---------------------------------------------------------------------------
@router.post("/{interview_id}/complete", response_model=InterviewResponse)
async def complete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    if interview.status == "COMPLETED":
        return _to_response(interview)

    if interview.status not in ("IN_PROGRESS", "SUBMITTED", "EVALUATING"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete interview with status '{interview.status}'",
        )

    interview.status = "COMPLETED"
    interview.completed_at = datetime.now(timezone.utc)
    await _log_event(db, interview.id, current_user.id, "SESSION_COMPLETED")
    await db.commit()
    await db.refresh(interview)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# DELETE /interviews/{interview_id}
# ---------------------------------------------------------------------------
@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    await db.delete(interview)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
