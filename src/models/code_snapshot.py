from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.sql import func

from src.core.database import Base


class CodeSnapshot(Base):
    __tablename__ = "code_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)