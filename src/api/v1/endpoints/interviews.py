"""Interview session endpoints."""

import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
from src.core.config import settings

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
        room_code=interview.room_code,
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
    # Interviewers/admins can assign a session to a specific candidate
    if current_user.role in ("INTERVIEWER", "ADMIN") and data.assigned_to_user_id:
        # Verify candidate exists
        candidate_result = await db.execute(
            select(User).where(User.id == data.assigned_to_user_id, User.role == "CANDIDATE")
        )
        if not candidate_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found",
            )
        owner_id = data.assigned_to_user_id
        interviewer_id = current_user.id
    else:
        owner_id = current_user.id
        interviewer_id = None

    interview = Interview(
        user_id=owner_id,
        interviewer_id=interviewer_id,
        title=data.title,
        problem_id=data.problem_id,
        language=data.language,
        status="CREATED",
        conversation_history=[],
        turn_count=0,
        room_code=_generate_room_code(),
    )
    db.add(interview)
    await db.flush()
    await _log_event(db, interview.id, current_user.id, "SESSION_CREATED")
    await db.commit()
    await db.refresh(interview)
    return _to_response(interview)


# ---------------------------------------------------------------------------
# GET /interviews/candidates  (interviewers only — list all candidates)
# ---------------------------------------------------------------------------
@router.get("/candidates", response_model=list[dict])
async def list_candidates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("INTERVIEWER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    result = await db.execute(
        select(User).where(User.role == "CANDIDATE", User.is_active).order_by(User.full_name)
    )
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name}
        for u in result.scalars().all()
    ]


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


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/invite   — generate shareable invite link
# ---------------------------------------------------------------------------

class InviteResponse(BaseModel):
    invite_token: str
    join_url: str


@router.post("/{interview_id}/invite", response_model=InviteResponse)
async def create_invite(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    # Only interviewer/admin or the interview owner can create an invite
    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not interview.invite_token:
        interview.invite_token = secrets.token_urlsafe(24)
        await db.commit()
        await db.refresh(interview)

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return InviteResponse(
        invite_token=interview.invite_token,
        join_url=f"{frontend_url}/join/{interview.invite_token}",
    )


# ---------------------------------------------------------------------------
# GET /interviews/join/{token}   — public: get interview info from invite token
# ---------------------------------------------------------------------------

class JoinInfoResponse(BaseModel):
    interview_id: int
    title: str
    status: str
    language: str


@router.get("/join/{token}", response_model=JoinInfoResponse)
async def get_join_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview).where(Interview.invite_token == token)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invite link")

    return JoinInfoResponse(
        interview_id=interview.id,
        title=interview.title,
        status=interview.status,
        language=interview.language,
    )


# ---------------------------------------------------------------------------
# POST /interviews/join/{token}/livekit-token   — public: join via invite
# ---------------------------------------------------------------------------

class GuestJoinRequest(BaseModel):
    name: str


class LiveKitTokenResponse(BaseModel):
    livekit_token: str
    livekit_url: str
    interview_id: int
    room_name: str


@router.post("/join/{token}/livekit-token", response_model=LiveKitTokenResponse)
async def guest_livekit_token(
    token: str,
    body: GuestJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview).where(Interview.invite_token == token)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invite link")

    room_name = f"interview-{interview.id}"
    livekit_token = _make_livekit_token(
        room_name=room_name,
        identity=f"guest-{secrets.token_hex(4)}",
        name=body.name,
        can_publish=True,
        can_subscribe=True,
    )
    return LiveKitTokenResponse(
        livekit_token=livekit_token,
        livekit_url=settings.LIVEKIT_URL,
        interview_id=interview.id,
        room_name=room_name,
    )


# ---------------------------------------------------------------------------
# POST /interviews/{interview_id}/livekit-token   — authenticated user token
# ---------------------------------------------------------------------------

@router.post("/{interview_id}/livekit-token", response_model=LiveKitTokenResponse)
async def get_livekit_token(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = await _get_interview_or_404(interview_id, db)
    await _assert_access(interview, current_user)

    room_name = f"interview-{interview.id}"
    identity = f"user-{current_user.id}"
    display_name = current_user.full_name or current_user.email

    livekit_token = _make_livekit_token(
        room_name=room_name,
        identity=identity,
        name=display_name,
        can_publish=True,
        can_subscribe=True,
    )
    return LiveKitTokenResponse(
        livekit_token=livekit_token,
        livekit_url=settings.LIVEKIT_URL,
        interview_id=interview.id,
        room_name=room_name,
    )


# ---------------------------------------------------------------------------
# Helper: generate a LiveKit access token
# ---------------------------------------------------------------------------

def _make_livekit_token(
    room_name: str,
    identity: str,
    name: str,
    can_publish: bool = True,
    can_subscribe: bool = True,
) -> str:
    try:
        from livekit.api import AccessToken, VideoGrants
        token = (
            AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(identity)
            .with_name(name)
            .with_grants(VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
            ))
        )
        return token.to_jwt()
    except Exception as exc:
        logger.error("LiveKit token generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video service unavailable. Check LIVEKIT_API_KEY / LIVEKIT_API_SECRET.",
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_room_code() -> str:
    """Generate a short human-readable room code like XK9-4F2."""
    import random
    import string
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choices(chars, k=3))
    part2 = ''.join(random.choices(chars, k=3))
    return f"{part1}-{part2}"


# ---------------------------------------------------------------------------
# GET /interviews/code/{room_code}  — candidate joins by room code
# ---------------------------------------------------------------------------

class RoomCodeJoinResponse(BaseModel):
    interview_id: int
    title: str
    status: str
    language: str
    room_code: str


@router.get("/code/{room_code}", response_model=RoomCodeJoinResponse)
async def join_by_room_code(
    room_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview).where(Interview.room_code == room_code.upper())
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room code not found")

    if interview.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This interview is already {interview.status.lower()}",
        )

    # If candidate is not the assigned user, assign them now
    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        # Only allow if interview has no assigned candidate yet (interviewer-created open room)
        interviewer_result = await db.execute(select(User).where(User.id == interview.user_id))
        owner = interviewer_result.scalar_one_or_none()
        if owner and owner.role in ("INTERVIEWER", "ADMIN"):
            interview.user_id = current_user.id
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This room belongs to another candidate")

    # Auto-start if still in CREATED state
    if interview.status == "CREATED":
        interview.status = "IN_PROGRESS"
        interview.started_at = datetime.now(timezone.utc)
        if not interview.interviewer_id and current_user.role in ("INTERVIEWER", "ADMIN"):
            interview.interviewer_id = current_user.id
        await _log_event(db, interview.id, current_user.id, "SESSION_STARTED")
        await db.commit()
        await db.refresh(interview)

    return RoomCodeJoinResponse(
        interview_id=interview.id,
        title=interview.title,
        status=interview.status,
        language=interview.language,
        room_code=interview.room_code or room_code,
    )
