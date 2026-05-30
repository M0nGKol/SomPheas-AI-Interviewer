# API Reference

**Base URL:** `https://your-api.onrender.com/api/v1`

**Authentication:** `Authorization: Bearer <token>` on all protected routes.

Interactive docs available at `/docs` (Swagger UI) and `/redoc`.

---

## Auth

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "Jane Doe",
  "role": "CANDIDATE"   // CANDIDATE | INTERVIEWER | ADMIN
}
```

### Login
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=secret
```
**Response:** `{ "access_token": "...", "token_type": "bearer" }`

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

---

## Interviews

### List Interviews
```http
GET /interviews
Authorization: Bearer <token>
```

### Create Interview
```http
POST /interviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Backend Engineer",
  "problem_id": 1,          // optional
  "resume_id": 2,           // optional
  "job_description": "..."  // optional
}
```

### Get Interview
```http
GET /interviews/{id}
Authorization: Bearer <token>
```

### Get by Room Code
```http
GET /interviews/code/{room_code}
Authorization: Bearer <token>
```

### Start Interview
```http
POST /interviews/{id}/start
Authorization: Bearer <token>
```

### End Interview
```http
POST /interviews/{id}/end
Authorization: Bearer <token>
```

### Generate Invite Link
```http
POST /interviews/{id}/invite
Authorization: Bearer <token>
```
**Response:** `{ "invite_token": "abc123", "invite_url": "https://..." }`

### Get LiveKit Token
```http
POST /interviews/{id}/livekit-token
Authorization: Bearer <token>
```
**Response:** `{ "token": "...", "url": "wss://..." }`

---

## Problems

### List Problems
```http
GET /problems
Authorization: Bearer <token>
```

### Create Problem
```http
POST /problems
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Two Sum",
  "description": "Given an array...",
  "difficulty": "EASY",    // EASY | MEDIUM | HARD
  "language": "python",
  "starter_code": "def two_sum(nums, target):\n    pass"
}
```

### AI Generate Problem
```http
POST /problems/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "A graph traversal problem, medium difficulty, Python"
}
```

---

## AI

### Chat (Streaming SSE)
```http
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "interview_id": 1,
  "message": "Can you give me a hint?"
}
```
**Response:** `text/event-stream` — streams tokens as `data: <chunk>\n\n`

### Trigger Evaluation
```http
POST /ai/evaluate
Authorization: Bearer <token>
Content-Type: application/json

{
  "interview_id": 1
}
```
**Response:** `202 Accepted` — evaluation queued as Celery background task.

---

## Analytics

### Overview
```http
GET /analytics/overview
Authorization: Bearer <token>
```

### Interview Evaluation
```http
GET /analytics/interviews/{id}
Authorization: Bearer <token>
```
**Response:**
```json
{
  "technical_score": 82,
  "code_quality_score": 75,
  "communication_score": 90,
  "problem_solving_score": 78,
  "overall_score": 81,
  "strengths": ["Clear communication", "Efficient algorithm"],
  "weaknesses": ["Edge case handling"],
  "feedback_summary": "..."
}
```

---

## Code Execution

### Execute Code
```http
POST /code/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "print('hello')",
  "language": "python",    // python | javascript | java | go | cpp
  "interview_id": 1
}
```
**Response:**
```json
{
  "stdout": "hello\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 142
}
```

---

## Resumes

### Upload Resume
```http
POST /resumes
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<pdf>
```

### List Resumes
```http
GET /resumes
Authorization: Bearer <token>
```

### Get Resume
```http
GET /resumes/{id}
Authorization: Bearer <token>
```

---

## System (Admin only)

### Get Active Nodes
```http
GET /system/nodes
Authorization: Bearer <admin-token>
```
**Response:**
```json
[
  {
    "node_id": "api-a1b2c3",
    "status": "healthy",
    "request_count": 142,
    "cpu_usage": 23.4,
    "memory_usage": 41.2,
    "last_seen": "2026-05-30T10:00:00Z"
  }
]
```

### Kill Node (simulate failure)
```http
POST /system/nodes/{node_id}/kill
Authorization: Bearer <admin-token>
```

---

## WebSocket

### Connect to Interview Room
```
WS /ws/{interview_id}?token=<jwt>
```

**Message types (JSON):**

| type | Direction | Description |
|------|-----------|-------------|
| `yjs_update` | both | Binary Yjs document update (base64) |
| `cursor` | both | Live cursor position `{ user, line, col }` |
| `chat` | both | AI chat message |
| `code_run` | client→server | Trigger code execution |
| `code_result` | server→client | Execution output |
| `cheating_alert` | server→client | Suspicious activity detected |
| `participant_joined` | server→client | User joined the room |
| `participant_left` | server→client | User left the room |

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Validation error — check request body |
| `401` | Missing or invalid token |
| `403` | Insufficient role permissions |
| `404` | Resource not found |
| `422` | Unprocessable entity (Pydantic validation) |
| `500` | Internal server error |
