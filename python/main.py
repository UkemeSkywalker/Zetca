"""
Strategist Agent Backend - Main Application Entry Point

This FastAPI application provides AI-powered social media strategy generation
using the Strands Agents Python SDK with Amazon Bedrock (Claude 4 Sonnet).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Initialize FastAPI app
app = FastAPI(
    title="Strategist Agent API",
    description="AI-powered social media strategy generation service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "strategist-agent"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Strategist Agent API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", "8000")),
        reload=True
    )
