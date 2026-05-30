"""Interview-related Pydantic schemas."""

from typing import Optional, Any
from pydantic import BaseModel, Field


INTERVIEW_STATUSES = {"CREATED", "WAITING", "IN_PROGRESS", "SUBMITTED", "EVALUATING", "COMPLETED", "CANCELLED"}


class InterviewCreate(BaseModel):
    title: str = Field(..., max_length=255)
    problem_id: Optional[int] = None
    language: str = Field("python", max_length=50)
    # Interviewers can assign the session to a specific candidate
    assigned_to_user_id: Optional[int] = None


class InterviewUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    problem_id: Optional[int] = None
    language: Optional[str] = Field(None, max_length=50)
    current_code: Optional[str] = None
    interviewer_id: Optional[int] = None


class InterviewResponse(BaseModel):
    id: int
    user_id: int
    interviewer_id: Optional[int] = None
    problem_id: Optional[int] = None
    title: str
    status: str
    language: str
    current_code: Optional[str] = None
    feedback: Optional[Any] = None
    room_code: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InterviewStartResponse(BaseModel):
    id: int
    status: str
    started_at: Optional[str] = None


class InterviewSubmitRequest(BaseModel):
    code: Optional[str] = None
