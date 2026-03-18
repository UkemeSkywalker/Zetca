"""
Strategist Agent Backend - Main Application Entry Point

This FastAPI application provides AI-powered social media strategy generation
using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.strategy import router as strategy_router
from routes.copy import router as copy_router
from routes.scheduler import router as scheduler_router
from config import settings

# Initialize FastAPI app
app = FastAPI(
    title="Zetca Agent API",
    description="AI-powered social media strategy, copy generation, and scheduling service",
    version="1.0.0"
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
