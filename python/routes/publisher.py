"""
Publisher API Routes

This module defines the REST API endpoints for publisher operations including
listing publish logs and triggering on-demand manual publishing to LinkedIn.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/publisher", tags=["publisher"])

# Endpoints will be implemented in Task 10
