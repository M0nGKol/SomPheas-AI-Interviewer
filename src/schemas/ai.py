"""AI-related Pydantic schemas."""

from typing import Optional, List, Any
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessageRequest(BaseModel):
    content: str
    current_code: Optional[str] = None
    language: Optional[str] = None
    execution_result: Optional[dict] = None


class MessageResponse(BaseModel):
    id: int
    interview_id: int
    sender_id: Optional[int] = None
    sender_type: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    user_message: MessageResponse
    ai_message: MessageResponse


class CodeReviewRequest(BaseModel):
    code: str
    language: Optional[str] = None
    execution_result: Optional[dict] = None


class CodeReviewResponse(BaseModel):
    review: str
    message: MessageResponse


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class EvaluationResponse(BaseModel):
    id: int
    interview_id: int
    technical_score: Optional[int] = None
    code_quality_score: Optional[int] = None
    communication_score: Optional[int] = None
    problem_solving_score: Optional[int] = None
    overall_score: Optional[int] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    feedback_summary: Optional[str] = None
    raw_evaluation: Optional[Any] = None
    created_at: str

    class Config:
        from_attributes = True
