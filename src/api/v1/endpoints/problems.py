"""Problem management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.models.problem import Problem
from src.models.user import User
from src.schemas.problem import ProblemCreate, ProblemUpdate, ProblemResponse
from src.api.v1.dependencies import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=list[ProblemResponse])
async def list_problems(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all problems. Any authenticated user can view."""
    result = await db.execute(select(Problem).order_by(Problem.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("INTERVIEWER", "ADMIN")),
):
    """Create a new problem. INTERVIEWER or ADMIN only."""
    problem = Problem(
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        language=data.language,
        starter_code=data.starter_code,
        test_cases=data.test_cases,
        expected_solution=data.expected_solution,
        created_by=current_user.id,
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get a single problem by id."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


@router.patch("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    data: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("INTERVIEWER", "ADMIN")),
):
    """Update a problem. INTERVIEWER or ADMIN only."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(problem, field, value)

    await db.commit()
    await db.refresh(problem)
    return problem


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("INTERVIEWER", "ADMIN")),
):
    """Delete a problem. INTERVIEWER or ADMIN only."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    await db.delete(problem)
    await db.commit()
