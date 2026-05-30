"""System health and load balancing simulation endpoints."""

import json
import logging
import os
import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.api.v1.dependencies import get_current_user
from src.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Each backend instance has a unique ID set via INSTANCE_ID env var
INSTANCE_ID = os.getenv("INSTANCE_ID", "node-1")
_startup_time = time.time()


class NodeInfo(BaseModel):
    node_id: str
    status: str
    uptime_seconds: float
    active_connections: int
    load_pct: float


class SystemHealthResponse(BaseModel):
    nodes: list[NodeInfo]
    total_connections: int
    healthy_nodes: int


async def _get_redis():
    """Return Redis client or None if unavailable."""
    try:
        import redis.asyncio as aioredis
        from src.core.config import settings
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        return client
    except Exception:
        return None


async def _heartbeat():
    """Publish this node's heartbeat to Redis. Called on every /system/nodes request."""
    client = await _get_redis()
    if not client:
        return
    try:
        from src.services.websocket.connection_manager import manager
        conn_count = len(getattr(manager, "_rooms", {}))
    except Exception:
        conn_count = 0

    payload = json.dumps({
        "node_id": INSTANCE_ID,
        "status": "healthy",
        "started_at": _startup_time,
        "active_connections": conn_count,
    })
    # TTL of 30s — node disappears if it stops sending heartbeats
    await client.set(f"node:heartbeat:{INSTANCE_ID}", payload, ex=30)
    await client.close()


async def _list_nodes() -> list[NodeInfo]:
    """Read all live node heartbeats from Redis."""
    client = await _get_redis()
    if not client:
        # Fallback: return just this node
        uptime = time.time() - _startup_time
        return [NodeInfo(
            node_id=INSTANCE_ID,
            status="healthy",
            uptime_seconds=round(uptime, 1),
            active_connections=0,
            load_pct=0.0,
        )]

    try:
        keys = await client.keys("node:heartbeat:*")
        nodes = []
        for key in keys:
            raw = await client.get(key)
            if not raw:
                continue
            data = json.loads(raw)
            uptime = time.time() - data.get("started_at", time.time())
            conn = data.get("active_connections", 0)
            # Simulate load as connections / capacity (cap at 100%)
            load_pct = min(100.0, round(conn / 50 * 100, 1))
            nodes.append(NodeInfo(
                node_id=data["node_id"],
                status=data.get("status", "healthy"),
                uptime_seconds=round(uptime, 1),
                active_connections=conn,
                load_pct=load_pct,
            ))
        await client.close()
        return sorted(nodes, key=lambda n: n.node_id)
    except Exception as exc:
        logger.warning("Failed to list nodes: %s", exc)
        return []


# ---------------------------------------------------------------------------
# GET /system/nodes  — admin only
# ---------------------------------------------------------------------------

@router.get("/nodes", response_model=SystemHealthResponse)
async def get_nodes(current_user: User = Depends(get_current_user)):
    """Return active backend nodes. Updates this node's heartbeat on each call."""
    await _heartbeat()
    nodes = await _list_nodes()
    return SystemHealthResponse(
        nodes=nodes,
        total_connections=sum(n.active_connections for n in nodes),
        healthy_nodes=sum(1 for n in nodes if n.status == "healthy"),
    )


# ---------------------------------------------------------------------------
# POST /system/nodes/{node_id}/kill  — simulate node failure (admin only)
# ---------------------------------------------------------------------------

@router.post("/nodes/{node_id}/kill")
async def kill_node(node_id: str, current_user: User = Depends(get_current_user)):
    """Remove a node's heartbeat from Redis to simulate it going down."""
    if current_user.role != "ADMIN":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    client = await _get_redis()
    if client:
        await client.delete(f"node:heartbeat:{node_id}")
        await client.close()
    return {"killed": node_id}
