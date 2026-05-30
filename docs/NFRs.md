# Non-Functional Requirements (NFRs)

## Overview

This document describes how InterviewLab addresses performance, scalability, reliability, security, and maintainability requirements.

---

## Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| API response time | <200ms (p95) | Async FastAPI + asyncpg connection pooling |
| AI evaluation | Non-blocking | Celery background task — API returns 202 immediately |
| AI chat latency | First token <1s | Gemini streaming via SSE |
| Code execution | <5s (Python/JS) | Docker sandbox with timeout enforcement |
| Editor sync | <100ms | Yjs CRDT over WebSocket, Redis pub-sub fan-out |
| Page load | <2s | Next.js App Router, React Query caching |

### Key Implementations

**Async everywhere:** All database queries and external API calls use `async/await` with `asyncpg`. No blocking operations on the event loop.

**Celery background tasks:** AI evaluation is offloaded to a worker queue. The interview ends instantly; evaluation results appear when ready.

**Yjs binary state persistence:** The `yjs_state` binary column in PostgreSQL stores the full document state. Late-joining users receive the complete history in one response rather than replaying all updates.

**React Query caching:** Frontend caches API responses with configurable stale times, reducing redundant requests during active sessions.

---

## Scalability

| Concern | Approach |
|---------|----------|
| Multiple API instances | Stateless FastAPI — any instance handles any request |
| WebSocket fan-out | Redis pub-sub — messages broadcast across all instances |
| AI evaluation load | Celery workers scale independently from API instances |
| Database connections | SQLAlchemy async connection pool with configurable pool size |
| Frontend | Vercel edge network — static assets served from CDN |

### Load Balancing

The `docker-compose.lb.yml` override starts 2 API replicas behind an nginx round-robin load balancer. Each instance writes a Redis heartbeat (`SET node:heartbeat:{id} EX 30`) so the Admin dashboard shows real distribution.

---

## Reliability

| Concern | Implementation |
|---------|---------------|
| Celery unavailable | Falls back to synchronous evaluation inline |
| LiveKit disconnected | Voice/video panel shows graceful disconnected state |
| Screen share denied | Error caught silently, button resets to idle state |
| WebSocket drop | Frontend reconnect logic with exponential backoff |
| Node heartbeat expires | Node disappears from System Health automatically (TTL 30s) |
| CI gating | GitHub Actions runs lint, type-check, and build before every deploy |
| Database migrations | Alembic runs `upgrade head` on startup before accepting requests |

---

## Security

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT (HS256), 30-minute expiry, validated on every request |
| Role enforcement | CANDIDATE / INTERVIEWER / ADMIN checked per endpoint |
| Code execution | Docker container — no network access, resource limits, isolated filesystem |
| WebSocket auth | JWT token validated on connection upgrade |
| Secrets | All keys stored as environment variables / GitHub Actions secrets |
| Deploy access | Render deploy hook keys scoped per service — cannot access account or billing |

---

## Maintainability

| Concern | Implementation |
|---------|---------------|
| Type safety | TypeScript strict mode (frontend), Pydantic models (backend) |
| Linting | ruff (Python), ESLint + next/core-web-vitals (TypeScript) |
| Code style | ruff auto-format on CI |
| Documentation | Architecture, API, deployment, local dev, user guide in `/docs` |
| CI/CD | GitHub Actions — lint + build gate before every deploy |
| Modular structure | API endpoints, services, models, and workers are separate layers |
| Database versioning | Alembic migrations track all schema changes |
