"""Redis pub-sub backed ConnectionManager.

Replaces the in-memory ConnectionManager so WebSocket events fan out
correctly across multiple API replicas.

Architecture:
  - Each server process keeps a local dict of WebSocket connections.
  - On broadcast(), the message is published to a Redis channel
    `ws:interview:{interview_id}` instead of being sent directly.
  - A single background asyncio task per process subscribes to all
    active channels and forwards messages to local WebSockets.
  - This means every replica receives the publish and delivers it to
    its own connected clients — giving full fan-out.
"""

import asyncio
import json
import logging
from collections import defaultdict

import redis.asyncio as aioredis
from fastapi import WebSocket

logger = logging.getLogger(__name__)

CHANNEL_PREFIX = "ws:interview:"


class RedisConnectionManager:
    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        # Local connections only (this process)
        self._rooms: dict[int, set[WebSocket]] = defaultdict(set)
        # Redis clients
        self._pub: aioredis.Redis | None = None   # publisher
        self._sub: aioredis.client.PubSub | None = None  # subscriber
        self._listener_task: asyncio.Task | None = None

    # -----------------------------------------------------------------------
    # Lifecycle — call from FastAPI lifespan
    # -----------------------------------------------------------------------

    async def startup(self) -> None:
        """Connect to Redis and start the listener task."""
        client = aioredis.from_url(self._redis_url, decode_responses=True)
        self._pub = client
        self._sub = client.pubsub()
        self._listener_task = asyncio.create_task(self._listen(), name="redis-ws-listener")
        logger.info("RedisConnectionManager started")

    async def shutdown(self) -> None:
        """Clean up Redis connections."""
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._sub:
            await self._sub.aclose()
        if self._pub:
            await self._pub.aclose()
        logger.info("RedisConnectionManager shut down")

    # -----------------------------------------------------------------------
    # Connection management
    # -----------------------------------------------------------------------

    async def connect(self, interview_id: int, ws: WebSocket) -> None:
        await ws.accept()
        was_empty = len(self._rooms[interview_id]) == 0
        self._rooms[interview_id].add(ws)
        if was_empty and self._sub:
            await self._sub.subscribe(f"{CHANNEL_PREFIX}{interview_id}")
        logger.debug(f"WS connected: interview={interview_id}, local={len(self._rooms[interview_id])}")

    def disconnect(self, interview_id: int, ws: WebSocket) -> None:
        self._rooms[interview_id].discard(ws)
        if not self._rooms[interview_id]:
            del self._rooms[interview_id]
            # Unsubscribe lazily — the listener will ignore channels with no local clients
        logger.debug(f"WS disconnected: interview={interview_id}")

    # -----------------------------------------------------------------------
    # Messaging
    # -----------------------------------------------------------------------

    async def send_personal(self, ws: WebSocket, data: dict) -> None:
        try:
            await ws.send_json(data)
        except Exception as e:
            logger.warning(f"Failed personal send: {e}")

    async def broadcast(self, interview_id: int, data: dict, exclude: WebSocket | None = None) -> None:
        """Publish to Redis — all replicas (including this one) will fan out."""
        if not self._pub:
            # Fallback: direct local send if Redis not ready
            await self._local_send(interview_id, data, exclude)
            return
        payload = json.dumps({"interview_id": interview_id, "data": data,
                               "exclude_local": id(exclude) if exclude else None})
        await self._pub.publish(f"{CHANNEL_PREFIX}{interview_id}", payload)

    def room_size(self, interview_id: int) -> int:
        return len(self._rooms.get(interview_id, set()))

    # -----------------------------------------------------------------------
    # Internal
    # -----------------------------------------------------------------------

    async def _local_send(self, interview_id: int, data: dict, exclude: WebSocket | None) -> None:
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

    async def _listen(self) -> None:
        """Background task: relay Redis messages to local WebSockets."""
        if not self._sub:
            return
        try:
            async for message in self._sub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                    interview_id: int = payload["interview_id"]
                    data: dict = payload["data"]
                    # exclude_local is the Python id() of the sender's WS on *that* process.
                    # On other processes it won't match anything, which is correct —
                    # we want all local clients to receive it.
                    exclude_id: int | None = payload.get("exclude_local")
                    dead: set[WebSocket] = set()
                    for ws in list(self._rooms.get(interview_id, [])):
                        if exclude_id and id(ws) == exclude_id:
                            continue
                        try:
                            await ws.send_json(data)
                        except Exception:
                            dead.add(ws)
                    for ws in dead:
                        self.disconnect(interview_id, ws)
                except Exception as e:
                    logger.warning(f"Redis listener parse error: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listener crashed: {e}", exc_info=True)
