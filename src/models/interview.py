"""Interview model."""

from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Integer, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.core.database import Base


class Interview(Base):
    """Interview session model."""

    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True)
    resume_id: Mapped[int | None] = mapped_column(
        ForeignKey("resumes.id"), nullable=True, index=True)
    interviewer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    problem_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="SET NULL"), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="CREATED", nullable=False
    )
    language: Mapped[str] = mapped_column(String(50), default="python", nullable=False)
    current_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    yjs_state: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    invite_token: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    room_code: Mapped[str | None] = mapped_column(String(16), nullable=True, unique=True, index=True)

    conversation_history: Mapped[list | None] = mapped_column(
        JSON, nullable=True, default=list
    )
    resume_context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    turn_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User", foreign_keys=[user_id], back_populates="interviews"
    )
    resume: Mapped["Resume | None"] = relationship("Resume", back_populates="interviews")

    def __repr__(self) -> str:
        return f"<Interview(id={self.id}, user_id={self.user_id}, status={self.status})>"
