# Database Guide

InterviewLab (SomPheas) uses **PostgreSQL** with **SQLAlchemy 2.x (async)** and **Alembic** for schema migrations. Redis is separate (caching, pub-sub, Celery) and is not covered here.

---

## Quick reference

| Context | `DATABASE_URL` example |
|---------|----------------------|
| Docker Compose (host machine) | `postgresql://sompheas:sompheas_dev@localhost:5434/sompheas` |
| Docker Compose (inside `api` container) | `postgresql://sompheas:sompheas_dev@db:5432/sompheas` |
| Local PostgreSQL (no Docker) | `postgresql://user:pass@localhost:5432/your_db` |
| Render / managed Postgres | Use the connection string from the dashboard |

**Ports (Docker Compose):** Postgres is exposed on host port **5434** (container `5432`).

The app accepts both `postgresql://` and `postgresql+asyncpg://`. At runtime, `src/core/database.py` and `alembic/env.py` automatically rewrite `postgresql://` → `postgresql+asyncpg://`.

---

## Connection and pool settings

Configuration lives in:

- `src/core/config.py` — reads `DATABASE_URL` from `.env`
- `src/core/database.py` — async engine and session factory

Engine defaults:

| Setting | Value |
|---------|-------|
| `pool_pre_ping` | `true` |
| `pool_size` | `10` |
| `max_overflow` | `20` |
| SQL echo | Enabled when `ENVIRONMENT=development` |

### SSL (Neon, Supabase, Render, etc.)

`alembic/env.py` normalizes hosted Postgres URLs for asyncpg:

- `sslmode=require` → `ssl=require`
- Strips `channel_binding=require` query params

If you connect manually with `psql`, use the provider’s documented SSL flags instead.

---

## Schema overview

```mermaid
erDiagram
    users ||--o{ resumes : uploads
    users ||--o{ interviews : "candidate (user_id)"
    users ||--o{ interviews : "interviewer (interviewer_id)"
    users ||--o{ problems : creates
    resumes ||--o{ interviews : referenced_by
    problems ||--o{ interviews : assigned_to
    interviews ||--o{ messages : contains
    interviews ||--o{ code_snapshots : tracks
    interviews ||--o{ code_submissions : runs
    interviews ||--o{ ai_evaluations : scored_by
    interviews ||--o{ session_events : logs
    interviews ||--o{ sandbox_sessions : executes_in
    users ||--o{ sandbox_sessions : owns
```

### Tables

| Table | Model | Purpose |
|-------|-------|---------|
| `users` | `User` | Auth, roles (`CANDIDATE`, `INTERVIEWER`, `ADMIN`) |
| `resumes` | `Resume` | Uploaded PDFs + extracted JSON + analysis status |
| `problems` | `Problem` | Coding problem library |
| `interviews` | `Interview` | Live session state, code, Yjs blob, invites |
| `messages` | `Message` | Chat / AI / system messages per interview |
| `code_snapshots` | `CodeSnapshot` | Point-in-time editor saves |
| `code_submissions` | `CodeSubmission` | Sandbox run results (stdout, status, timing) |
| `ai_evaluations` | `AIEvaluation` | Post-interview AI scores and feedback |
| `session_events` | `SessionEvent` | Activity log (tab switch, paste, join, etc.) |
| `sandbox_sessions` | `SandboxSession` | Per-user code execution session UUID |

Model source: `src/models/`.

---

## Key columns by table

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `email` | string | Unique, indexed |
| `hashed_password` | string | bcrypt |
| `role` | string | Default `CANDIDATE` |
| `is_active`, `is_verified` | bool | Account flags |

### `interviews`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | FK → users | Candidate |
| `interviewer_id` | FK → users | Nullable |
| `problem_id` | FK → problems | Nullable, `ON DELETE SET NULL` |
| `resume_id` | FK → resumes | Optional context |
| `status` | string | See lifecycle below |
| `language` | string | Default `python` |
| `current_code` | text | Latest editor content |
| `yjs_state` | bytea | Full Yjs document for late joiners |
| `invite_token` | string | Unique invite link token |
| `room_code` | string | 6-char join code |
| `conversation_history` | JSON | AI/orchestrator history |
| `resume_context`, `feedback` | JSON | Optional metadata |

### `ai_evaluations`

Scores (integers, nullable until filled): `technical_score`, `code_quality_score`, `communication_score`, `problem_solving_score`, `overall_score`.

JSON/text: `strengths`, `weaknesses`, `feedback_summary`, `raw_evaluation`.

Cascade: deleting an interview deletes its evaluations (`ondelete=CASCADE`).

### `session_events`

| Column | Notes |
|--------|-------|
| `event_type` | e.g. `SESSION_JOINED`, paste/tab flags |
| `metadata` | JSON column; ORM attribute is `event_metadata` (SQLAlchemy reserves `metadata`) |

---

## Interview status lifecycle

Defined in `src/schemas/interview.py`:

```
CREATED → WAITING → IN_PROGRESS → SUBMITTED → EVALUATING → COMPLETED
                                              ↘ CANCELLED (from several states)
```

| Status | Meaning |
|--------|---------|
| `CREATED` | Scheduled, not started |
| `WAITING` | Candidate invited, waiting to join |
| `IN_PROGRESS` | Live session |
| `SUBMITTED` | Ended, evaluation queued or failed mid-run |
| `EVALUATING` | Celery worker processing AI evaluation |
| `COMPLETED` | Evaluation saved (or manually completed) |
| `CANCELLED` | Session cancelled |

The Celery task `evaluate_interview` transitions: `SUBMITTED`/`IN_PROGRESS` → `EVALUATING` → `COMPLETED`. On failure it rolls back to `SUBMITTED` and retries (up to 3 times).

---

## Migrations (Alembic)

Migration scripts: `alembic/versions/`.

### Revision chain (oldest → newest)

| Revision | Description |
|----------|-------------|
| `f90fce24d92b` | Initial `users`, `resumes`, `interviews` |
| `da9b79413c2a` | Add `role` to `users` |
| `cd594ccab40f` | Interview AI assignment tables (`problems`, `messages`, etc.) |
| `e1a2b3c4d5e6` | Interview code fields |
| `1af3e796db89` | AI realtime / analytics features |
| `a1b2c3d4e5f6` | `sandbox_sessions` |
| `b2c3d4e5f6a7` | `yjs_state` on `interviews` |
| `c3d4e5f6a7b8` | `invite_token` on `interviews` |
| `d4e5f6a7b8c9` | `room_code` on `interviews` **(head)** |

### Common commands

From the project root with `.env` loaded:

```bash
# Apply all pending migrations
alembic upgrade head

# Show current revision
alembic current

# Show migration history
alembic history --verbose

# Roll back one revision
alembic downgrade -1

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"
```

Alembic uses the async engine via `alembic/env.py`. Ensure `DATABASE_URL` in `.env` points at a running database before running commands.

### Production / Docker startup

The production `Dockerfile` and `render.yaml` run migrations before starting the API:

```bash
alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

---

## Startup `create_all` vs migrations

On API startup (`src/main.py` lifespan), the app also runs:

```python
await conn.run_sync(Base.metadata.create_all)
```

This creates **missing** tables from current SQLAlchemy models but does **not** alter existing columns. For production:

1. Prefer **Alembic** as the source of truth for schema changes.
2. Treat `create_all` as a dev convenience, not a replacement for migrations.

---

## Local database setup

### Option A — Docker Compose (recommended)

```bash
docker compose up -d db
```

Use the URL from `.env.example`:

```env
DATABASE_URL=postgresql://sompheas:sompheas_dev@localhost:5434/sompheas
```

Then:

```bash
alembic upgrade head
```

### Option B — Existing PostgreSQL

```bash
createdb sompheas   # or via pgAdmin
```

Set `DATABASE_URL` in `.env`, then `alembic upgrade head`.

### Reset local data (Docker volume)

```bash
docker compose down -v
docker compose up -d db
alembic upgrade head
```

This wipes all local Postgres data in the `postgres_data` volume.

---

## Useful SQL queries

Connect with `psql` or any GUI using your `DATABASE_URL` (use `postgresql://`, not `+asyncpg`).

```sql
-- List tables
\dt

-- Recent interviews
SELECT id, title, status, user_id, interviewer_id, created_at
FROM interviews
ORDER BY created_at DESC
LIMIT 20;

-- Evaluations for an interview
SELECT * FROM ai_evaluations WHERE interview_id = 1;

-- Users by role
SELECT id, email, role, is_active FROM users ORDER BY id;

-- Alembic version (if alembic_version table exists)
SELECT * FROM alembic_version;
```

---

## Adding or changing schema

1. Edit the SQLAlchemy model in `src/models/`.
2. Import the model in `alembic/env.py` if it is new (existing imports are listed there).
3. Run `alembic revision --autogenerate -m "your message"`.
4. Review the generated script in `alembic/versions/` — autogenerate is not perfect.
5. Apply with `alembic upgrade head`.

---

## Related documentation

| Doc | Topic |
|-----|-------|
| [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) | Full dev setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data flow and system design |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Connection and migration errors |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Render Postgres configuration |
