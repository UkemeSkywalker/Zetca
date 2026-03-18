"""
Mock Scheduler Agent for testing and development.

Returns realistic scheduling assignments without calling external AI services.
Follows the same interface as the real SchedulerAgent so they can be
swapped via the USE_MOCK_AGENT flag.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List

from models.scheduler import AutoScheduleOutput, PostAssignment


# Time slots spread across the day for realistic scheduling
_TIME_SLOTS = [
    "08:00", "09:00", "09:30", "10:00", "11:00",
    "12:00", "13:00", "14:00", "14:30", "15:00",
    "16:00", "17:00", "18:00", "19:00", "20:00",
]


class MockSchedulerAgent:
    """
    Mock implementation of the Scheduler Agent.

    Returns realistic scheduling assignments with dates spread across
    the upcoming 2-4 weeks. Generates PostAssignment for each copy with
    varied times and no duplicate platform+date+time combinations.
    Includes a simulated delay to mimic real agent behavior.
    """

    async def auto_schedule(
        self, strategy_data: dict, copies_data: List[dict]
    ) -> AutoScheduleOutput:
        """
        Generate mock scheduling assignments for the provided copies.

        Args:
            strategy_data: Dict representation of a StrategyRecord containing
                           posting_schedule, platform_recommendations, etc.
            copies_data: List of dict representations of CopyRecords to schedule.

        Returns:
            AutoScheduleOutput with one PostAssignment per copy, spread across
            the next 2-4 weeks with no duplicate (platform, date, time) combos.
        """
        # Simulate processing delay
        await asyncio.sleep(2)

        assignments: List[PostAssignment] = []
        used_slots: set = set()  # Track (platform, date, time) to avoid duplicates
        base_date = datetime.now().date() + timedelta(days=1)

        for i, copy in enumerate(copies_data):
            copy_id = copy.get("id", copy.get("copy_id", f"copy-{i}"))
            platform = copy.get("platform", "instagram")

            # Spread across upcoming days (cycle through 2-4 weeks)
            day_offset = (i * 2) % 28 + 1  # 1 to 28 days out
            scheduled_date = (base_date + timedelta(days=day_offset)).isoformat()

            # Pick a time slot, avoiding duplicates
            time_idx = i % len(_TIME_SLOTS)
            scheduled_time = _TIME_SLOTS[time_idx]

            # Resolve duplicates by trying next time slot
            slot_key = (platform, scheduled_date, scheduled_time)
            attempts = 0
            while slot_key in used_slots and attempts < len(_TIME_SLOTS):
                time_idx = (time_idx + 1) % len(_TIME_SLOTS)
                scheduled_time = _TIME_SLOTS[time_idx]
                slot_key = (platform, scheduled_date, scheduled_time)
                attempts += 1

            used_slots.add(slot_key)

            assignments.append(
                PostAssignment(
                    copy_id=copy_id,
                    scheduled_date=scheduled_date,
                    scheduled_time=scheduled_time,
                    platform=platform,
                )
            )

        # Fallback if no copies provided (shouldn't happen, but be safe)
        if not assignments:
            assignments.append(
                PostAssignment(
                    copy_id="fallback-copy",
                    scheduled_date=(base_date + timedelta(days=1)).isoformat(),
                    scheduled_time="10:00",
                    platform="instagram",
                )
            )

        return AutoScheduleOutput(posts=assignments)
