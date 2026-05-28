"""Code snapshot and execution endpoints."""

import asyncio
import logging
import os
import tempfile
import time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.models.user import User
from src.models.interview import Interview
from src.models.code_snapshot import CodeSnapshot
from src.models.code_submission import CodeSubmission
from src.api.v1.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_OUTPUT_BYTES = 8192
EXECUTION_TIMEOUT = 5


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CodeSaveRequest(BaseModel):
    language: str = "python"
    code: str


class CodeSaveResponse(BaseModel):
    id: int
    interview_id: int
    language: str
    code: str
    saved_at: str


class CodeRunRequest(BaseModel):
    language: str = "python"
    code: str
    stdin: str = ""


class CodeRunResponse(BaseModel):
    stdout: str
    stderr: str
    status: str
    runtime_ms: int


class CodeSubmitRequest(BaseModel):
    language: str = "python"
    code: str
    stdin: str = ""


class CodeSubmissionResponse(BaseModel):
    id: int
    interview_id: int
    language: str
    code: str
    stdin: str | None
    stdout: str | None
    stderr: str | None
    status: str
    runtime_ms: int | None
    passed: bool
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_interview_for_code(interview_id: int, user: User, db: AsyncSession) -> Interview:
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if user.role == "CANDIDATE" and interview.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return interview


async def _execute_code(language: str, code: str, stdin: str = "") -> dict:
    """Safe subprocess code execution with timeout and output limits."""
    t0 = time.monotonic()
    suffix_map = {"python": ".py", "javascript": ".js", "typescript": ".ts"}
    suffix = suffix_map.get(language.lower(), ".py")

    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
            f.write(code)
            tmpfile = f.name

        if language.lower() == "python":
            cmd = ["python3", tmpfile]
        elif language.lower() in ("javascript", "typescript"):
            cmd = ["node", tmpfile]
        else:
            return {
                "stdout": "",
                "stderr": f"Unsupported language: {language}",
                "status": "ERROR",
                "runtime_ms": 0,
            }

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE if stdin else asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(stdin.encode() if stdin else None),
                timeout=EXECUTION_TIMEOUT,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            runtime_ms = int((time.monotonic() - t0) * 1000)
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {EXECUTION_TIMEOUT} seconds",
                "status": "TIMEOUT",
                "runtime_ms": runtime_ms,
            }

        runtime_ms = int((time.monotonic() - t0) * 1000)
        stdout = stdout_bytes.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES]
        stderr = stderr_bytes.decode("utf-8", errors="replace")[:MAX_OUTPUT_BYTES]
        exec_status = "SUCCESS" if proc.returncode == 0 else "RUNTIME_ERROR"

        return {
            "stdout": stdout,
            "stderr": stderr,
            "status": exec_status,
            "runtime_ms": runtime_ms,
        }

    except FileNotFoundError:
        runtime_ms = int((time.monotonic() - t0) * 1000)
        return {
            "stdout": "",
            "stderr": f"Runtime not found for language: {language}",
            "status": "ERROR",
            "runtime_ms": runtime_ms,
        }
    except Exception as e:
        runtime_ms = int((time.monotonic() - t0) * 1000)
        return {
            "stdout": "",
            "stderr": str(e),
            "status": "ERROR",
            "runtime_ms": runtime_ms,
        }
    finally:
        try:
            os.unlink(tmpfile)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# POST /code/interviews/{interview_id}/save
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/save", response_model=CodeSaveResponse, status_code=status.HTTP_201_CREATED)
async def save_code(
    interview_id: int,
    body: CodeSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a code snapshot. Also updates interview.current_code."""
    interview = await _get_interview_for_code(interview_id, current_user, db)

    if current_user.role == "CANDIDATE" and interview.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    snapshot = CodeSnapshot(
        interview_id=interview_id,
        language=body.language,
        code=body.code,
    )
    db.add(snapshot)

    interview.current_code = body.code
    interview.language = body.language

    await db.commit()
    await db.refresh(snapshot)

    return CodeSaveResponse(
        id=snapshot.id,
        interview_id=snapshot.interview_id,
        language=snapshot.language,
        code=snapshot.code,
        saved_at=snapshot.saved_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /code/interviews/{interview_id}/latest
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}/latest", response_model=CodeSaveResponse | None)
async def get_latest_code(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent saved code snapshot for an interview."""
    await _get_interview_for_code(interview_id, current_user, db)

    result = await db.execute(
        select(CodeSnapshot)
        .where(CodeSnapshot.interview_id == interview_id)
        .order_by(CodeSnapshot.saved_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        return None

    return CodeSaveResponse(
        id=snapshot.id,
        interview_id=snapshot.interview_id,
        language=snapshot.language,
        code=snapshot.code,
        saved_at=snapshot.saved_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# POST /code/interviews/{interview_id}/run
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/run", response_model=CodeRunResponse)
async def run_code(
    interview_id: int,
    body: CodeRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute code and return output. Does not save a submission record."""
    await _get_interview_for_code(interview_id, current_user, db)

    result = await _execute_code(body.language, body.code, body.stdin)
    return CodeRunResponse(
        stdout=result["stdout"],
        stderr=result["stderr"],
        status=result["status"],
        runtime_ms=result["runtime_ms"],
    )


# ---------------------------------------------------------------------------
# POST /code/interviews/{interview_id}/submit
# ---------------------------------------------------------------------------

@router.post("/interviews/{interview_id}/submit", response_model=CodeSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_code(
    interview_id: int,
    body: CodeSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute code and persist as a formal submission."""
    interview = await _get_interview_for_code(interview_id, current_user, db)

    exec_result = await _execute_code(body.language, body.code, body.stdin)

    passed = exec_result["status"] == "SUCCESS"

    submission = CodeSubmission(
        interview_id=interview_id,
        language=body.language,
        code=body.code,
        stdin=body.stdin or None,
        stdout=exec_result["stdout"] or None,
        stderr=exec_result["stderr"] or None,
        status=exec_result["status"],
        runtime_ms=exec_result["runtime_ms"],
        passed=passed,
    )
    db.add(submission)

    interview.current_code = body.code
    interview.language = body.language

    await db.commit()
    await db.refresh(submission)

    return CodeSubmissionResponse(
        id=submission.id,
        interview_id=submission.interview_id,
        language=submission.language,
        code=submission.code,
        stdin=submission.stdin,
        stdout=submission.stdout,
        stderr=submission.stderr,
        status=submission.status,
        runtime_ms=submission.runtime_ms,
        passed=submission.passed,
        created_at=submission.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# GET /code/interviews/{interview_id}/submissions
# ---------------------------------------------------------------------------

@router.get("/interviews/{interview_id}/submissions", response_model=list[CodeSubmissionResponse])
async def list_submissions(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all code submissions for an interview."""
    await _get_interview_for_code(interview_id, current_user, db)

    result = await db.execute(
        select(CodeSubmission)
        .where(CodeSubmission.interview_id == interview_id)
        .order_by(CodeSubmission.created_at.desc())
    )
    submissions = result.scalars().all()

    return [
        CodeSubmissionResponse(
            id=s.id,
            interview_id=s.interview_id,
            language=s.language,
            code=s.code,
            stdin=s.stdin,
            stdout=s.stdout,
            stderr=s.stderr,
            status=s.status,
            runtime_ms=s.runtime_ms,
            passed=s.passed,
            created_at=s.created_at.isoformat(),
        )
        for s in submissions
    ]
