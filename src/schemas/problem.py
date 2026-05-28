"""Problem-related Pydantic schemas."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field

Difficulty = Literal["EASY", "MEDIUM", "HARD"]


class ProblemCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: str
    difficulty: Difficulty = "EASY"
    language: str = Field("python", max_length=50)
    starter_code: str | None = None
    test_cases: Any | None = None
    expected_solution: str | None = None


class ProblemUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    difficulty: Difficulty | None = None
    language: str | None = Field(None, max_length=50)
    starter_code: str | None = None
    test_cases: Any | None = None
    expected_solution: str | None = None


class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    language: str
    starter_code: str | None
    test_cases: Any | None
    expected_solution: str | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
