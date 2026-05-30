"""Main FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.router import api_router
from src.core.database import engine, Base
from src.core.logging import setup_logging
from src.services.websocket.connection_manager import manager as ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ws_manager.startup()   # connects Redis pub-sub if REDIS_URL is set
    yield
    # Shutdown
    await ws_manager.shutdown()


app = FastAPI(
    title="SomPheas API",
    description="Voice-based interview preparation platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - must be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "sompheas"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "SomPheas API", "version": "0.1.0"}


