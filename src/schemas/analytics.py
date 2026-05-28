"""Analytics Pydantic schemas."""

from typing import Optional, List, Any
from pydantic import BaseModel


class RecentInterview(BaseModel):
    id: int
    title: str
    status: str
    user_id: int
    created_at: str
    completed_at: Optional[str] = None
    overall_score: Optional[int] = None


class OverviewResponse(BaseModel):
    total_interviews: int
    completed_interviews: int
    active_interviews: int
    average_score: Optional[float] = None
    average_duration_minutes: Optional[float] = None
    total_code_runs: int
    total_ai_messages: int
    recent_interviews: List[RecentInterview] = []
    recent_session_events: List[dict] = []


class InterviewAnalyticsResponse(BaseModel):
    interview_id: int
    title: str
    status: str
    language: str
    user_id: int
    user_email: Optional[str] = None
    problem_id: Optional[int] = None
    problem_title: Optional[str] = None
    code_submissions_count: int
    latest_code_result: Optional[dict] = None
    ai_evaluation: Optional[dict] = None
    session_events: List[dict] = []
    message_count: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str


class CandidateAnalyticsResponse(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    total_interviews: int
    completed_interviews: int
    average_score: Optional[float] = None
    best_score: Optional[int] = None
    latest_feedback: Optional[str] = None
    total_code_runs: int
    total_messages: int


class SystemActivityResponse(BaseModel):
    recent_session_events: List[dict] = []
    recent_code_submissions: List[dict] = []
    recent_completed_interviews: List[dict] = []
