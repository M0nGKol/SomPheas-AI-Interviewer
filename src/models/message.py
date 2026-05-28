from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func

from src.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    sender_type = Column(String(20), nullable=False)  # CANDIDATE, INTERVIEWER, AI, SYSTEM
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)