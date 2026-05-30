"""WebSocket endpoint for real-time interview session sync."""

import base64
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.core.security import decode_access_token
from src.models.user import User
from src.models.interview import Interview
from src.services.websocket.connection_manager import manager
from src.services.websocket.session_sync_service import log_session_event

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_user_from_token(token: str, db: AsyncSession) -> User | None:
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = int(payload.get("sub", 0))
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.websocket("/ws/interviews/{interview_id}")
async def interview_websocket(
    interview_id: int,
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    # Authenticate via query param token
    token = websocket.query_params.get("token")
    user: User | None = None
    if token:
        user = await _get_user_from_token(token, db)

    # Load interview
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalar_one_or_none()
    if not interview:
        await websocket.close(code=4004)
        return

    # Access check: candidate can only join their own interview
    if user and user.role == "CANDIDATE" and interview.user_id != user.id:
        await websocket.close(code=4003)
        return

    await manager.connect(interview_id, websocket)

    try:
        # Send welcome event
        await manager.send_personal(websocket, {
            "event": "session:connected",
            "interview_id": interview_id,
            "room_size": manager.room_size(interview_id),
        })

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_personal(websocket, {"event": "error", "message": "Invalid JSON"})
                continue

            event = data.get("event", "")
            user_id = user.id if user else None

            # ---------------------------------------------------------------
            if event == "session:join":
                await log_session_event(db, interview_id, user_id, "SESSION_JOINED")
                await manager.broadcast(interview_id, {
                    "event": "session:join",
                    "user_id": user_id,
                    "room_size": manager.room_size(interview_id),
                }, exclude=websocket)
                join_resp: dict = {
                    "event": "session:join",
                    "status": interview.status,
                    "language": interview.language,
                    "current_code": interview.current_code,
                }
                if interview.yjs_state:
                    join_resp["yjs_state"] = base64.b64encode(interview.yjs_state).decode()
                await manager.send_personal(websocket, join_resp)

            # ---------------------------------------------------------------
            elif event == "session:leave":
                await log_session_event(db, interview_id, user_id, "SESSION_LEFT")
                await manager.broadcast(interview_id, {
                    "event": "session:leave",
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "code:update":
                code = data.get("code", "")
                language = data.get("language", interview.language)
                # Update interview code in DB
                interview.current_code = code
                interview.language = language
                await db.commit()
                # Broadcast to others
                await manager.broadcast(interview_id, {
                    "event": "code:sync",
                    "code": code,
                    "language": language,
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "chat:message":
                content = data.get("content", "")
                await manager.broadcast(interview_id, {
                    "event": "chat:message",
                    "content": content,
                    "sender_type": data.get("sender_type", "CANDIDATE"),
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "code:result":
                await manager.broadcast(interview_id, {
                    "event": "code:result",
                    "result": data.get("result"),
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "session:status":
                await manager.broadcast(interview_id, {
                    "event": "session:status",
                    "status": data.get("status"),
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "cursor:update":
                # Ephemeral — broadcast only, no DB write
                await manager.broadcast(interview_id, {
                    "event": "cursor:update",
                    "line": data.get("line", 1),
                    "column": data.get("column", 1),
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "session:flag":
                flag_type = data.get("flag_type", "UNKNOWN")
                meta = data.get("meta", {})
                await log_session_event(
                    db, interview_id, user_id,
                    "PASTE_DETECTED" if flag_type == "LARGE_PASTE" else "SUSPICIOUS_ACTIVITY",
                    {"flag_type": flag_type, **meta},
                )
                # Notify the interviewer in the room
                await manager.broadcast(interview_id, {
                    "event": "session:flag",
                    "flag_type": flag_type,
                    "meta": meta,
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "session:submit":
                await log_session_event(db, interview_id, user_id, "SESSION_SUBMITTED_WS")
                await manager.broadcast(interview_id, {
                    "event": "session:submit",
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "yjs:update":
                raw_update = data.get("update", "")
                try:
                    update_bytes = base64.b64decode(raw_update)
                    # Merge into stored state (simple append — Yjs handles dedup)
                    existing = interview.yjs_state or b""
                    interview.yjs_state = existing + update_bytes
                    await db.commit()
                except Exception:
                    pass  # malformed update — ignore
                # Fan out to everyone in the room (including sender — Yjs deduplicates)
                await manager.broadcast(interview_id, {
                    "event": "yjs:update",
                    "update": raw_update,
                    "user_id": user_id,
                }, exclude=websocket)

            # ---------------------------------------------------------------
            elif event == "session:reconnect":
                # Send back Yjs state snapshot if available, else fall back to current_code
                response: dict = {
                    "event": "session:reconnect",
                    "status": interview.status,
                    "current_code": interview.current_code,
                }
                if interview.yjs_state:
                    response["yjs_state"] = base64.b64encode(interview.yjs_state).decode()
                await manager.send_personal(websocket, response)

            else:
                await manager.send_personal(websocket, {
                    "event": "error",
                    "message": f"Unknown event: {event}",
                })

    except WebSocketDisconnect:
        manager.disconnect(interview_id, websocket)
        try:
            await log_session_event(db, interview_id, user.id if user else None, "SESSION_DISCONNECTED")
        except Exception:
            pass
        await manager.broadcast(interview_id, {
            "event": "session:leave",
            "user_id": user.id if user else None,
        })
    except Exception as e:
        logger.error(f"WebSocket error interview={interview_id}: {e}")
        manager.disconnect(interview_id, websocket)
