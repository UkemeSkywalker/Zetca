"""
Strategist Agent Backend - Main Application Entry Point

This FastAPI application provides AI-powered social media strategy generation
using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.strategy import router as strategy_router
from routes.copy import router as copy_router
from routes.scheduler import router as scheduler_router
from routes.publisher import router as publisher_router
from config import settings
from services.linkedin_client import LinkedInClient
from services.publisher_service import PublisherService
from services.publish_scanner import PublishScanner
from repositories.publisher_repository import PublisherRepository
from repositories.scheduler_repository import SchedulerRepository
from repositories.user_repository import UserRepository
from repositories.media_repository import MediaRepository

# Publisher background task reference
publish_scanner: PublishScanner = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of background tasks."""
    global publish_scanner
    if settings.publisher_enabled:
        linkedin_client = LinkedInClient(timeout_seconds=settings.linkedin_api_timeout_seconds)
        publisher_service = PublisherService(
            linkedin_client=linkedin_client,
            publisher_repository=PublisherRepository(),
            scheduler_repository=SchedulerRepository(),
            user_repository=UserRepository(),
            media_repository=MediaRepository(),
        )
        publish_scanner = PublishScanner(publisher_service)
        await publish_scanner.start()
    yield
    if publish_scanner:
        await publish_scanner.stop()

# Initialize FastAPI app
app = FastAPI(
    title="Zetca Agent API",
    description="AI-powered social media strategy, copy generation, and scheduling service",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(strategy_router)
app.include_router(copy_router)
app.include_router(scheduler_router)
app.include_router(publisher_router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "zetca-agent"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Zetca Agent API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True
    )
