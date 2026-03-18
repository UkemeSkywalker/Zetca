"""
Scheduler API Routes

This module defines the REST API endpoints for scheduler operations including
auto-scheduling, manual scheduling, and scheduled post CRUD. Full implementation
will be added in Phase 2.
"""

from fastapi import APIRouter

# Create router
router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])
