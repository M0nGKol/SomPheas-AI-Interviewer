from fastapi import APIRouter

from src.api.v1.endpoints import auth, problems, interviews, code, ai, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(problems.router, prefix="/problems", tags=["problems"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(code.router, prefix="/code", tags=["code"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(websocket.router, prefix="", tags=["websocket"])
