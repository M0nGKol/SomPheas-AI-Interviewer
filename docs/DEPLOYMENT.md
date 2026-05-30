# Deployment Guide

InterviewLab deploys as two services:

- **Render** — FastAPI backend + Celery worker
- **Vercel** — Next.js frontend

```mermaid
graph TB
    subgraph Vercel
        FE[Next.js Frontend]
    end
    subgraph Render
        API[FastAPI Backend]
        WORKER[Celery Worker]
        DB[PostgreSQL]
        REDIS[Redis]
    end
    subgraph External
        LK[LiveKit Cloud]
        GEMINI[Gemini API]
    end
    FE -->|HTTPS REST| API
    FE -->|WSS| API
    FE -->|WebRTC| LK
    API -->|SQL| DB
    API -->|Cache / Queue| REDIS
    WORKER -->|Queue| REDIS
    API -->|AI| GEMINI
    WORKER -->|AI| GEMINI
    API -->|Tokens| LK
```

---

## 1. Render — Backend

### Services to create on Render

| Service | Type | Build command | Start command |
|---------|------|--------------|---------------|
| Backend API | Web Service | `pip install -r requirements.txt` | `alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port $PORT` |
| Celery Worker | Background Worker | `pip install -r requirements.txt` | `celery -A src.workers.celery_app worker --loglevel=info --concurrency=2` |
| PostgreSQL | Managed DB | — | — |
| Redis | Managed Redis | — | — |

### Environment Variables (Backend & Worker)

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
REDIS_URL=redis://user:pass@host:6379
SECRET_KEY=<random-256-bit-string>
GEMINI_API_KEY=<your-gemini-key>
LIVEKIT_API_KEY=<your-livekit-key>
LIVEKIT_API_SECRET=<your-livekit-secret>
LIVEKIT_URL=https://your-project.livekit.cloud
ENVIRONMENT=production
```

### Deploy Hook

After creating the API service, get its deploy hook from:
**Render Dashboard → Service → Settings → Deploy Hook**

The URL format is:
```
https://api.render.com/deploy/srv-XXXXXXXXXX?key=YYYYYYYY
```

Set these as GitHub Actions secrets:
- `RENDER_BACKEND_SERVICE_ID` = `XXXXXXXXXX` (part after `srv-`)
- `RENDER_BACKEND_DEPLOY_KEY` = `YYYYYYYY` (the `key=` value)

---

## 2. Vercel — Frontend

Vercel deploys automatically on every push to `main`. No manual trigger needed.

### Environment Variables (Vercel Dashboard → Project → Settings → Environment Variables)

```env
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-api.onrender.com
```

### First Deploy

```bash
cd frontend
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard — it will auto-detect Next.js and deploy on every push.

---

## 3. GitHub Actions CI/CD

The pipeline at `.github/workflows/deploy.yml` runs on every push and PR to `main`:

1. **backend** job — ruff lint, pytest
2. **frontend** job — ESLint, TypeScript check, Next.js build
3. **deploy-backend** job — triggers Render deploy hook (main branch push only, after both jobs pass)

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `RENDER_BACKEND_SERVICE_ID` | Render service ID (without `srv-` prefix) |
| `RENDER_BACKEND_DEPLOY_KEY` | Render deploy hook key |
| `GEMINI_API_KEY` | Used in CI test runs |
| `NEXT_PUBLIC_API_URL` | Production API URL |
| `NEXT_PUBLIC_WS_URL` | Production WebSocket URL |

Set at: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

---

## 4. LiveKit Cloud

1. Create a project at [cloud.livekit.io](https://cloud.livekit.io)
2. Copy API Key, API Secret, and WebSocket URL
3. Add to Render environment variables

---

## 5. Load Balancing (Optional)

To run multiple backend instances locally:

```bash
docker-compose -f docker-compose.yml -f docker-compose.lb.yml up
```

This starts 2 API replicas behind an nginx round-robin load balancer. Each instance writes a Redis heartbeat, visible in the Admin → System Health dashboard.

On Render, horizontal scaling is handled by increasing the instance count in the service settings.
