# Environment Variables Reference

This document describes every environment variable used by InterviewLab. Copy `.env.example` to `.env` and fill in the required values before running the app.

```bash
cp .env.example .env
```

---

## Backend (`.env`)

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Must use the `postgresql+asyncpg://` scheme for async support. |

**Examples:**
```env
# Local
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/interviewlab

# Docker Compose
DATABASE_URL=postgresql+asyncpg://sompheas:sompheas_dev@db:5432/sompheas

# Render (production)
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
```

> The `.env.example` uses `postgresql://` (no driver prefix). Add `+asyncpg` or Alembic will fail on async sessions.

---

### Redis

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis connection URL. Used for pub-sub, Celery broker, and heartbeat cache. |

**Examples:**
```env
# Local
REDIS_URL=redis://localhost:6379/0

# Docker Compose
REDIS_URL=redis://redis:6381/0

# Test (use a different DB index to avoid collisions)
REDIS_URL=redis://localhost:6379/1
```

---

### Security

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | Yes | — | Secret used to sign JWT tokens. Must be long and random in production. |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm. Do not change unless you know what you're doing. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | How long access tokens stay valid (in minutes). |

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### Gemini AI

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes (for AI features) | `""` | Google Gemini API key. Without this, chat and evaluation endpoints will fail. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model to use for all AI interactions. |

Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

```env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
```

> You can leave `GEMINI_API_KEY` empty for local development if you don't need AI features.

---

### LiveKit (Voice & Video)

| Variable | Required | Default | Description |
|---|---|---|---|
| `LIVEKIT_API_KEY` | No* | `""` | LiveKit project API key. |
| `LIVEKIT_API_SECRET` | No* | `""` | LiveKit project API secret. |
| `LIVEKIT_URL` | No* | `""` | HTTPS URL of your LiveKit instance. |
| `LIVEKIT_WS_URL` | No | `""` | WebSocket URL for agent connection. Auto-detected from `LIVEKIT_URL` if not set. |

*Required only if voice/video features are needed. Leave empty locally — the app handles missing LiveKit gracefully (video panel shows a disconnected state).

Get credentials from [LiveKit Cloud](https://cloud.livekit.io) or self-host.

```env
LIVEKIT_API_KEY=APIxxxxxxxxxxx
LIVEKIT_API_SECRET=your-livekit-secret
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
```

---

### File Uploads

| Variable | Required | Default | Description |
|---|---|---|---|
| `UPLOAD_DIR` | No | `./uploads` | Local directory where uploaded files (e.g., resumes) are stored. |
| `MAX_UPLOAD_SIZE` | No | `10485760` | Maximum allowed upload size in bytes. Default is 10 MB. |

```env
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760   # 10 MB
```

> In production, consider pointing `UPLOAD_DIR` to a mounted volume or replacing the file storage with object storage (S3, GCS).

---

### Code Execution Sandbox

| Variable | Required | Default | Description |
|---|---|---|---|
| `SANDBOX_TIMEOUT_SECONDS` | No | `30` | Maximum runtime for a sandboxed code execution before it is killed. |
| `SANDBOX_MEMORY_LIMIT` | No | `128m` | Docker container memory limit per execution. |
| `SANDBOX_CPU_LIMIT` | No | `0.5` | Docker container CPU share (fraction of one core). |

```env
SANDBOX_TIMEOUT_SECONDS=30
SANDBOX_MEMORY_LIMIT=128m
SANDBOX_CPU_LIMIT=0.5
```

> Requires Docker daemon running locally. The sandbox service pulls per-language images on first use.

---

### Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `ENVIRONMENT` | No | `development` | Runtime environment. Set to `production` on live deployments. Affects logging and error detail. |
| `LOG_LEVEL` | No | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `CORS_ORIGINS` | No | `["*"]` | Comma-separated list of allowed CORS origins. Lock this down in production. |

```env
ENVIRONMENT=development
LOG_LEVEL=INFO
```

---

## Frontend (`.env.local`)

Create `frontend/.env.local` (copy from `frontend/.env.local.example` if it exists):

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | — | Base URL of the FastAPI backend, used for REST calls. |
| `NEXT_PUBLIC_WS_URL` | Yes | — | WebSocket base URL of the backend, used for real-time collaboration. |

**Local development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Production:**
```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-api.onrender.com
```

---

## Environment Profiles

| Variable | Development | Test | Production |
|---|---|---|---|
| `DATABASE_URL` | local Postgres | separate test DB | Render/managed Postgres |
| `REDIS_URL` | `redis://localhost:6379/0` | `redis://localhost:6379/1` | Render Redis |
| `SECRET_KEY` | any string | any string | long random hex |
| `ENVIRONMENT` | `development` | `test` | `production` |
| `GEMINI_API_KEY` | optional | empty (mocked) | required |
| `LIVEKIT_*` | optional | empty (mocked) | required |

---

## Security Checklist for Production

- [ ] `SECRET_KEY` is at least 32 random bytes and stored as a secret, not in source control
- [ ] `CORS_ORIGINS` is set to your exact frontend domain, not `["*"]`
- [ ] `GEMINI_API_KEY` and `LIVEKIT_API_SECRET` are stored in your platform's secret manager (Render: Environment > Secret Files / Secret Variables)
- [ ] `DATABASE_URL` uses SSL (`?ssl=require`) if your provider requires it
- [ ] `ENVIRONMENT=production` is set so debug error details are suppressed in responses
- [ ] `.env` is listed in `.gitignore` and never committed
