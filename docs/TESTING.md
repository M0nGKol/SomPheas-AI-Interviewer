# Testing Guide

## Overview

InterviewLab uses **pytest** for backend testing and TypeScript/ESLint tooling for frontend validation. No external test database is spun up automatically — tests that hit the database use a separate test database configured via environment variables.

---

## Testing Stack

| Layer | Tool | Purpose |
|---|---|---|
| Backend unit/integration | `pytest` + `pytest-asyncio` | Async test support for FastAPI routes |
| HTTP client | `httpx` | Test FastAPI app without a live server |
| Type checking | `mypy` | Static type analysis |
| Linting | `ruff` | Fast Python linter |
| Formatting | `black` | Code formatter |
| Frontend type check | `tsc --noEmit` | TypeScript validation |
| Frontend linting | `eslint` | Next.js lint rules |

Install dev dependencies:

```bash
pip install -e ".[dev]"
```

---

## Running Tests

### Backend

```bash
# Run all tests
pytest tests/ -v --tb=short

# Run a specific file
pytest tests/api/test_auth.py -v

# Run a specific test
pytest tests/api/test_auth.py::test_register_success -v

# Run with coverage report
pytest tests/ --cov=src --cov-report=term-missing
```

### Frontend

```bash
cd frontend

# TypeScript type check (no emit)
npx tsc --noEmit

# ESLint
npm run lint
```

### Code Quality (Backend)

```bash
# Format check
black --check src/

# Apply formatting
black src/

# Lint
ruff check src/

# Type check
mypy src/
```

---

## Recommended Test Structure

No `tests/` directory exists yet. Use this layout when adding tests:

```
tests/
├── conftest.py              # Shared fixtures (DB session, test client, auth tokens)
├── api/
│   ├── test_auth.py         # POST /auth/register, /auth/login
│   ├── test_interviews.py   # CRUD + invite + start/end flows
│   ├── test_problems.py     # Problem library + AI generation
│   ├── test_code.py         # Code execution endpoint
│   └── test_analytics.py   # Skill scores, evaluation history
├── services/
│   ├── test_ai_service.py   # Chat + evaluation logic (mock Gemini)
│   ├── test_evaluation.py   # Scoring logic
│   └── test_resume_parser.py
└── workers/
    └── test_tasks.py        # Celery task logic (mock DB)
```

---

## Test Environment Setup

Create a `.env.test` file (never commit this):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/interviewlab_test
REDIS_URL=redis://localhost:6379/1
SECRET_KEY=test-secret-key-not-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GEMINI_API_KEY=
ENVIRONMENT=test
LOG_LEVEL=WARNING
```

> Use Redis DB `1` for tests to avoid colliding with the dev DB `0`.

Load it in `conftest.py`:

```python
import os
os.environ.setdefault("ENV_FILE", ".env.test")
```

---

## Writing Tests

### conftest.py — shared fixtures

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.main import app
from src.core.database import get_db
from src.core.config import settings

TEST_DB_URL = settings.DATABASE_URL

engine = create_async_engine(TEST_DB_URL)
TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def db():
    async with TestSession() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db):
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

### Example: Auth endpoint test

```python
import pytest

@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post("/api/v1/auth/register", json={
        "email": "dev@example.com",
        "password": "strongpassword123",
        "full_name": "Dev User",
        "role": "CANDIDATE",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "pass123", "full_name": "User", "role": "CANDIDATE"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]
```

### Example: Authenticated request

```python
@pytest_asyncio.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "interviewer@example.com",
        "password": "pass1234",
        "full_name": "Test Interviewer",
        "role": "INTERVIEWER",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "interviewer@example.com",
        "password": "pass1234",
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_interview(client, auth_headers):
    response = await client.post("/api/v1/interviews", json={
        "title": "Backend Interview",
        "language": "python",
    }, headers=auth_headers)
    assert response.status_code == 201
```

---

## Mocking External Services

Tests should never call real external APIs. Mock Gemini, LiveKit, and Docker at the service boundary.

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_ai_chat_mocked(client, auth_headers):
    with patch("src.services.ai.ai_service.AIService.stream_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = iter(["Hello ", "world"])
        response = await client.post("/api/v1/ai/chat", json={
            "interview_id": "some-uuid",
            "message": "Explain recursion",
        }, headers=auth_headers)
        assert response.status_code == 200
```

---

## Celery Tasks

Test task logic directly without a broker — call the underlying function, not `.delay()`:

```python
from src.workers.tasks import evaluate_interview_task

@pytest.mark.asyncio
async def test_evaluate_interview(db):
    # Arrange: insert a completed interview into db
    # ...
    result = await evaluate_interview_task(interview_id="some-uuid")
    assert result["status"] == "completed"
```

---

## pytest.ini / pyproject.toml Configuration

Add to `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
env_files = [".env.test"]
```

---

## What Is Not Tested Here

| Area | Reason |
|---|---|
| WebSocket real-time sync | Requires live Redis pub-sub; use integration/e2e tests |
| LiveKit voice/video | External managed service — not testable in CI without live infra |
| Docker sandbox execution | Requires Docker daemon; marked as integration tests, skipped in CI by default |
| Frontend UI interactions | No Playwright/Cypress setup yet — covered by manual QA |
