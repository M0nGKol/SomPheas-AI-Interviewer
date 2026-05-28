"""Save session events triggered from WebSocket activity."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.session_event import SessionEvent


async def log_session_event(
    db: AsyncSession,
    interview_id: int,
    user_id: int | None,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    event = SessionEvent(
        interview_id=interview_id,
        user_id=user_id,
        event_type=event_type,
        event_metadata=metadata,
    )
    db.add(event)
    await db.commit()
