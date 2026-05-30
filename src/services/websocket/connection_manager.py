"""WebSocket connection manager — tracks clients per interview room.

Uses RedisConnectionManager when REDIS_URL is configured (production /
multi-replica deployments), falls back to in-memory for local dev.
"""

import logging
import os
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """In-memory manager — works for single-process deployments."""

    def __init__(self) -> None:
        self._rooms: dict[int, set[WebSocket]] = defaultdict(set)

    async def startup(self) -> None:
        pass

    async def shutdown(self) -> None:
        pass

    async def connect(self, interview_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms[interview_id].add(ws)
        logger.debug(f"WS connected: interview={interview_id}, total={len(self._rooms[interview_id])}")

    def disconnect(self, interview_id: int, ws: WebSocket) -> None:
        self._rooms[interview_id].discard(ws)
        if not self._rooms[interview_id]:
            del self._rooms[interview_id]
        logger.debug(f"WS disconnected: interview={interview_id}")

    async def send_personal(self, ws: WebSocket, data: dict) -> None:
        try:
            await ws.send_json(data)
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")

    async def broadcast(self, interview_id: int, data: dict, exclude: WebSocket | None = None) -> None:
        dead: set[WebSocket] = set()
        for ws in list(self._rooms.get(interview_id, [])):
            if ws is exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(interview_id, ws)

    def room_size(self, interview_id: int) -> int:
        return len(self._rooms.get(interview_id, set()))


def _create_manager() -> ConnectionManager:
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        try:
            from src.services.websocket.redis_connection_manager import RedisConnectionManager
            logger.info(f"Using RedisConnectionManager ({redis_url})")
            return RedisConnectionManager(redis_url)  # type: ignore[return-value]
        except Exception as e:
            logger.warning(f"Failed to init RedisConnectionManager, falling back to in-memory: {e}")
    logger.info("Using in-memory ConnectionManager (single-process mode)")
    return ConnectionManager()


manager = _create_manager()
