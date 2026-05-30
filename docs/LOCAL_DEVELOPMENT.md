# Local Development

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Python** | 3.11+ | Use pyenv or system install |
| **Node.js** | 20+ | Required for Next.js 16 |
| **PostgreSQL** | 15+ | Or use Docker |
| **Redis** | 7+ | Or use Docker |
| **Docker** | 20+ | Required for code execution sandbox |

---

## 1. Clone

```bash
git clone https://github.com/M0nGKol/SomPheas-AI-Interviewer
cd InterviewLab
```

---

## 2. Backend Setup

```bash
# Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
```

### Required `.env` values

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/interviewlab
REDIS_URL=redis://localhost:6379
SECRET_KEY=dev-secret-key-change-in-production
GEMINI_API_KEY=your_gemini_api_key_here

# LiveKit (optional for local dev — voice/video won't work without it)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

ENVIRONMENT=development
```

### Run migrations

```bash
alembic upgrade head
```

### Start the API

```bash
uvicorn src.main:app --reload --port 8000
```

API available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Start the Celery worker (separate terminal)

```bash
celery -A src.workers.celery_app worker --loglevel=info
```

The worker processes AI evaluation tasks queued after interviews end.

---

## 3. Frontend Setup

```bash
cd frontend

npm install

# Copy environment file
cp .env.local.example .env.local
```

### `.env.local` values

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Start the dev server

```bash
npm run dev
```

Frontend available at `http://localhost:3000`

---

## 4. Docker (All-in-one)

Run everything with Docker Compose:

```bash
docker-compose up
```

Services started:
- `api` — FastAPI on port 8000
- `worker` — Celery worker
- `db` — PostgreSQL on port 5432
- `redis` — Redis on port 6379

For load balancing simulation (2 API replicas + nginx):

```bash
docker-compose -f docker-compose.yml -f docker-compose.lb.yml up
```

---

## 5. Running Tests

```bash
# Backend
pytest tests/ -v --tb=short

# Frontend type-check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint
```

---

## 6. Common Issues

| Problem | Fix |
|---------|-----|
| `asyncpg` connection refused | Make sure PostgreSQL is running and `DATABASE_URL` is correct |
| Celery can't connect | Make sure Redis is running on port 6379 |
| `alembic upgrade head` fails | Check `DATABASE_URL` — must use `postgresql+asyncpg://` scheme |
| Screen sharing not working | Requires HTTPS or localhost — works on `localhost:3000` |
| LiveKit errors | Leave `LIVEKIT_*` vars empty locally — voice/video panel shows disconnected state gracefully |
