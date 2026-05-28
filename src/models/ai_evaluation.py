from sqlalchemy import Column, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func

from src.core.database import Base


class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"

    id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    technical_score = Column(Integer, nullable=True)
    code_quality_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    problem_solving_score = Column(Integer, nullable=True)
    overall_score = Column(Integer, nullable=True)

    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    raw_evaluation = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)