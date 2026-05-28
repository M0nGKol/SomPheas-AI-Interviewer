"""WebSocket connection manager — tracks clients per interview room."""

import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # interview_id -> set of connected WebSockets
        self._rooms: dict[int, set[WebSocket]] = defaultdict(set)

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
        """Broadcast to all clients in a room except the sender."""
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


manager = ConnectionManager()
