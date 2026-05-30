# Troubleshooting Guide

Common issues when running **InterviewLab** (SomPheas) locally or in production. For database-specific setup and schema details, see [DATABASE.md](DATABASE.md).

---

## Diagnostic checklist

Run these first to narrow down the problem:

| Check | Command / URL | Expected |
|-------|---------------|----------|
| API alive | `curl http://localhost:8000/health` | `{"status":"healthy",...}` |
| API docs | `http://localhost:8000/docs` | Swagger UI loads |
| Postgres (Docker) | `docker compose ps db` | `healthy` |
| Redis (Docker) | `docker compose ps redis` | `healthy` |
| Migrations | `alembic current` | Shows head revision `d4e5f6a7b8c9` |
| Sandbox (optional) | `GET /api/v1/sandbox/health` | `healthy` or `degraded` |

**Docker Compose ports (this repo):**

| Service | Host port |
|---------|-----------|
| API | `8003` → container `8000` |
| PostgreSQL | `5434` → `5432` |
| Redis | `6381` → `6379` |

If you run `uvicorn` locally (not Docker), the API is usually `http://localhost:8000`.

---

## Environment and configuration

### Missing or invalid `.env`

**Symptoms:** App crashes on start with Pydantic validation errors (`DATABASE_URL`, `SECRET_KEY` required).

**Fix:**

```bash
cp .env.example .env
```

Fill in at least:

```env
DATABASE_URL=postgresql://sompheas:sompheas_dev@localhost:5434/sompheas
REDIS_URL=redis://localhost:6381/0
SECRET_KEY=dev-secret-key-change-in-production
GEMINI_API_KEY=your-key-here
ENVIRONMENT=development
```

Restart the API after changes.

### Frontend cannot reach the API

**Symptoms:** Login fails, network errors in browser console, CORS-like failures.

**Fix:** In `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Use `http://localhost:8003` and `ws://localhost:8003` if the API runs **only** via Docker Compose.

Restart `npm run dev` after changing env vars (Next.js bakes `NEXT_PUBLIC_*` at build/dev start).

### Wrong ports after reading older docs

Some docs mention Postgres on `5432` and Redis on `6379`. This project's **Docker Compose** maps non-default host ports to avoid conflicts. Match `.env.example` or [DATABASE.md](DATABASE.md).

---

## Database

### `asyncpg` / connection refused

**Symptoms:**

```
ConnectionRefusedError
asyncpg.exceptions.ConnectionDoesNotExistError
```

**Causes & fixes:**

| Cause | Fix |
|-------|-----|
| Postgres not running | `docker compose up -d db` or start local Postgres |
| Wrong host/port | Docker: `localhost:5434`. Inside compose network: `db:5432` |
| Wrong credentials | Match `sompheas` / `sompheas_dev` / `sompheas` from `docker-compose.yml` |
| Firewall / VPN | Allow local connections to the port |

Verify:

```bash
docker compose exec db pg_isready -U sompheas
```

### `alembic upgrade head` fails

**Symptoms:** Migration errors, duplicate table, or cannot connect.

**Fixes:**

1. Confirm `DATABASE_URL` in `.env` targets the same database you intend to use.
2. Both `postgresql://` and `postgresql+asyncpg://` work; Alembic rewrites as needed.
3. If tables were created manually and migrations conflict, either:
   - Reset dev DB: `docker compose down -v && docker compose up -d db && alembic upgrade head`, or
   - Stamp current state (advanced): `alembic stamp head` only if you are sure schema matches models.

See [DATABASE.md](DATABASE.md) for the full migration chain.

### Tables missing but API starts

**Symptoms:** 500 errors on endpoints referencing columns that do not exist.

**Cause:** Migrations never applied; relying only on partial `create_all`.

**Fix:**

```bash
alembic upgrade head
```

### SSL errors with hosted Postgres (Neon, Render, etc.)

**Symptoms:** SSL handshake or `sslmode` errors with asyncpg.

**Fix:** Use the provider connection string. The app rewrites `sslmode=require` → `ssl=require` in `alembic/env.py`. For Alembic CLI, ensure `.env` uses the same URL as production.

### Interview stuck in `EVALUATING`

**Symptoms:** Dashboard shows evaluating forever; no `ai_evaluations` row.

**Causes:**

| Cause | Fix |
|-------|-----|
| Celery worker not running | Start: `celery -A src.workers.celery_app worker --loglevel=info` |
| Redis down | Start Redis; check `REDIS_URL` |
| `GEMINI_API_KEY` missing/invalid | Set key in `.env`; check worker logs |
| Task failed after retries | Worker logs show error; status may revert to `SUBMITTED` |

Check worker logs for `evaluate_interview_task`. You can re-trigger evaluation from the API if the interview is in `SUBMITTED` or `COMPLETED` per `src/api/v1/endpoints/ai.py`.

---

## Redis and Celery

### Celery cannot connect to broker

**Symptoms:**

```
Error: Cannot connect to redis://...
kombu.exceptions.OperationalError
```

**Fix:**

| Setup | `REDIS_URL` |
|-------|-------------|
| Docker Compose (host) | `redis://localhost:6381/0` |
| Docker Compose (worker container) | `redis://redis:6379/0` |
| Local Redis default | `redis://localhost:6379/0` |

```bash
docker compose up -d redis
redis-cli -p 6381 ping   # expect PONG when using compose ports
```

### Evaluation never runs but interview ends OK

**Symptoms:** Interview moves to `SUBMITTED` but never `COMPLETED` with scores.

**Fix:** Run the Celery worker in a **separate terminal** (not optional for background evaluation):

```bash
celery -A src.workers.celery_app worker --loglevel=info
```

With Docker Compose, the `worker` service should start automatically — check `docker compose logs worker`.

### WebSocket sync broken across multiple API instances

**Symptoms:** Two users on different replicas do not see each other's cursors/updates.

**Cause:** In-memory WebSocket manager only works for a single process.

**Fix:** Set `REDIS_URL` so `RedisConnectionManager` is used (`src/services/websocket/connection_manager.py`). Required for load-balanced or multi-replica deployments.

---

## Code execution (Docker sandbox)

### Code run returns 500 / "Docker not available"

**Symptoms:** Run Code fails; `/api/v1/sandbox/health` returns `degraded` or `unhealthy`.

**Causes & fixes:**

| Cause | Fix |
|-------|-----|
| Docker Desktop not running | Start Docker |
| API not mounting Docker socket | Use `docker compose` `api` service (mounts `/var/run/docker.sock`) or run API on host with Docker installed |
| `docker` Python package missing | `pip install docker` |
| Linux permission denied | Add user to `docker` group or run API with socket access (compose uses `user: "0:0"` for dev) |

Pull images on first run (can be slow):

- `python:3.11-slim`
- `node:20-slim`

### Sandbox works in Docker but not local uvicorn

**Symptoms:** Fallback execution or warnings in logs: `Failed to initialize Docker client`.

**Fix:** Install Docker Desktop and ensure `docker ps` works from the same environment where you run uvicorn.

### Execution timeout

**Symptoms:** Run stops with timeout error.

**Fix:** Adjust in `.env`:

```env
SANDBOX_TIMEOUT_SECONDS=30
SANDBOX_MEMORY_LIMIT=128m
SANDBOX_CPU_LIMIT=0.5
```

---

## WebSocket and real-time editor

### WebSocket disconnects immediately (code 4003)

**Symptoms:** Editor never syncs; close code `4003` in browser devtools.

**Cause:** Candidate tried to connect to another user's interview.

**Fix:** Log in as the assigned candidate, or use the correct interview ID.

### WebSocket close code 4004

**Cause:** Interview ID does not exist.

**Fix:** Confirm URL `/interview/{id}` matches a real interview.

### WebSocket keeps reconnecting

**Symptoms:** Toast "Connection lost — reconnecting…"

**Checks:**

| Check | Action |
|-------|--------|
| `NEXT_PUBLIC_WS_URL` | Must match API host (`ws://` locally, `wss://` in production) |
| API running | Hit `/health` |
| Auth token | Log in again — token passed as `?token=` query param |
| Proxy / Render sleep | Production API cold start; wait and refresh |

Path format:

```
{WS_BASE}/api/v1/ws/interviews/{interviewId}?token={jwt}
```

### Editor empty for late joiner

**Cause:** `yjs_state` not loaded or WebSocket connected before auth.

**Fix:** Ensure WebSocket connects with valid JWT; server sends `yjs:state` on join/reconnect. Check `interviews.yjs_state` in DB (see [DATABASE.md](DATABASE.md)).

---

## Authentication and API errors

### 401 Unauthorized on all requests

**Fix:**

- Log in again (token in `localStorage` as `auth_token`).
- Confirm `SECRET_KEY` has not changed between login and request (invalidates existing tokens).
- Check `Authorization: Bearer <token>` is sent (Axios client in `frontend/lib/api/client.ts`).

### 403 Forbidden

**Cause:** Role mismatch (e.g. candidate accessing interviewer-only routes).

**Fix:** Use an account with the correct role (`CANDIDATE`, `INTERVIEWER`, `ADMIN`).

---

## AI (Gemini)

### AI chat does not stream / returns error

**Symptoms:** Empty assistant messages or 500 from `/api/v1/ai/...`.

**Fix:**

```env
GEMINI_API_KEY=your-valid-key
GEMINI_MODEL=gemini-2.5-flash
```

Verify quota and API enablement in Google AI Studio. Check API logs for Gemini SDK errors.

### Resume upload analysis stuck on `pending`

**Cause:** Background processing failed or never started.

**Fix:** Check API logs; re-upload resume. Inspect `resumes.analysis_status` and `analysis_error` in the database.

---

## LiveKit (voice and video)

### Voice/video panel disconnected locally

**Expected:** LiveKit is optional for local dev.

**Fix (optional):** Set in `.env`:

```env
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

Create a project at [cloud.livekit.io](https://cloud.livekit.io). Without these, the UI should degrade gracefully.

### Cannot publish screen share

**Cause:** Browsers require secure context.

**Fix:** Use `https://` or `http://localhost` (not raw IP over HTTP). Screen share works on `localhost:3000`.

### Token errors when joining room

**Fix:** Ensure all three LiveKit env vars match the same LiveKit project. Frontend requests tokens from `POST /api/v1/interviews/{id}/livekit-token`.

---

## Docker Compose

### `api` container exits or never becomes healthy

**Checks:**

```bash
docker compose logs api
docker compose ps
```

| Issue | Fix |
|-------|-----|
| DB not healthy | Wait for `db` healthcheck; `docker compose up -d db redis` first |
| Migration failure | Read `alembic` errors in logs; fix `DATABASE_URL` inside compose |
| Port in use | Change host port in `docker-compose.yml` or stop conflicting service |

### `agent` service fails (optional)

The `agent` service runs the LiveKit interview agent. It requires valid LiveKit credentials and is not needed for basic editor/API testing. Check `docker compose logs agent` if you enable it.

---

## Frontend (Next.js)

### `npm run build` fails

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

Fix TypeScript and ESLint errors reported before deploying to Vercel.

### Hydration or auth flash on load

**Cause:** Token read from `localStorage` only on client.

**Fix:** Usually cosmetic; ensure login completed. Clear `localStorage` and log in again if state is corrupt.

---

## Deployment (Render + Vercel)

### Render deploy fails at migration step

**Symptoms:** Build OK but service crashes; logs show Alembic error.

**Fix:**

- Set `DATABASE_URL` from Render Postgres attachment.
- Run `alembic upgrade head` locally against a copy of prod schema to reproduce.
- See [DEPLOYMENT.md](DEPLOYMENT.md).

### Vercel frontend talks to wrong API

**Fix:** Vercel environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-api.onrender.com
```

Redeploy after changing. No trailing slash on the API URL.

### Health check failing on Render

**Fix:** Health path is `/health` (not under `/api/v1`). Confirm start command includes migrations and uvicorn binding to `$PORT`.

### CI passes but production broken

GitHub Actions runs tests with secrets; production needs the same `GEMINI_API_KEY`, `DATABASE_URL`, and `REDIS_URL` on Render. Celery worker is a **separate** Render background worker service.

---

## Logs and where to look

| Component | Where |
|-----------|--------|
| FastAPI | Terminal / `docker compose logs api` |
| Celery | `docker compose logs worker` or worker terminal |
| Postgres | `docker compose logs db` |
| Browser WS | DevTools → Network → WS |
| Browser API | DevTools → Network → Fetch/XHR |

Enable verbose SQL in development with `ENVIRONMENT=development` (engine echo in `database.py`).

---

## Still stuck?

1. Reproduce with minimal steps (API only vs full stack).
2. Capture the **first** error in API or worker logs (stack trace beats UI message).
3. Confirm versions: Python 3.11+, Node 20+, Docker 20+.
4. Cross-check [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) and [DATABASE.md](DATABASE.md).

For architecture context, see [ARCHITECTURE.md](ARCHITECTURE.md).
