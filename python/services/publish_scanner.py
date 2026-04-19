"""
Publish Scanner - Background task that periodically scans for and publishes due posts.

This module runs as an asyncio background task within the FastAPI application,
scanning the scheduled-posts table at a configurable interval for posts that
are due for publishing. It maintains a processing set to prevent overlapping
scan cycles from double-publishing the same post.
"""

import asyncio
import logging
from typing import Set

from services.publisher_service import PublisherService
from config import settings

logger = logging.getLogger(__name__)


class PublishScanner:
    """Background task that periodically scans for and publishes due posts."""

    def __init__(self, publisher_service: PublisherService):
        self.publisher_service = publisher_service
        self.interval = settings.publisher_scan_interval_seconds
        self._running = False
        self._task: asyncio.Task = None
        self._processing_post_ids: Set[str] = set()

    async def start(self):
        """Start the background scan loop as an asyncio task."""
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Publish Scanner started (interval: {self.interval}s)")

    async def stop(self):
        """Gracefully stop the scanner by cancelling the background task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Publish Scanner stopped")

    async def _run_loop(self):
        """Main loop: run scan cycle, catch exceptions, sleep, repeat."""
        while self._running:
            try:
                await self.publisher_service.run_scan_cycle(self._processing_post_ids)
            except Exception as e:
                logger.error(f"Scan cycle failed: {e}", exc_info=True)
            await asyncio.sleep(self.interval)
