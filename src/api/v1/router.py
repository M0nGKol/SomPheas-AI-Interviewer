from fastapi import APIRouter

from src.api.v1.endpoints import auth, problems, interviews

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(problems.router, prefix="/problems", tags=["problems"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
