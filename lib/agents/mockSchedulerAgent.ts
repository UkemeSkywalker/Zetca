/**
 * Mock Scheduler Agent for testing and development.
 *
 * Returns realistic scheduling assignments without calling Bedrock.
 * Follows the same interface as SchedulerAgent so they can be swapped
 * via the useMockAgent config flag.
 */

import { AutoScheduleOutput, PostAssignment } from '../models/scheduler';

const TIME_SLOTS = [
  '08:00', '09:00', '09:30', '10:00', '11:00',
  '12:00', '13:00', '14:00', '14:30', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class MockSchedulerAgent {
  /**
   * Generate mock scheduling assignments, spread across the upcoming 2-4
   * weeks with no duplicate (platform, date, time) combinations.
   */
  async autoSchedule(
    _strategyData: Record<string, any>,
    copiesData: Record<string, any>[]
  ): Promise<AutoScheduleOutput> {
    await sleep(2000);

    const assignments: PostAssignment[] = [];
    const usedSlots = new Set<string>();
    const baseDate = addDays(new Date(), 1);

    copiesData.forEach((copy, i) => {
      const copyId = copy.id ?? copy.copy_id ?? `copy-${i}`;
      const platform = copy.platform ?? 'instagram';

      const dayOffset = ((i * 2) % 28) + 1;
      const scheduledDate = toDateString(addDays(baseDate, dayOffset));

      let timeIdx = i % TIME_SLOTS.length;
      let scheduledTime = TIME_SLOTS[timeIdx];
      let slotKey = `${platform}|${scheduledDate}|${scheduledTime}`;
      let attempts = 0;
      while (usedSlots.has(slotKey) && attempts < TIME_SLOTS.length) {
        timeIdx = (timeIdx + 1) % TIME_SLOTS.length;
        scheduledTime = TIME_SLOTS[timeIdx];
        slotKey = `${platform}|${scheduledDate}|${scheduledTime}`;
        attempts += 1;
      }
      usedSlots.add(slotKey);

      assignments.push({ copy_id: copyId, scheduled_date: scheduledDate, scheduled_time: scheduledTime, platform });
    });

    if (assignments.length === 0) {
      assignments.push({
        copy_id: 'fallback-copy',
        scheduled_date: toDateString(addDays(baseDate, 1)),
        scheduled_time: '10:00',
        platform: 'instagram',
      });
    }

    return { posts: assignments };
  }
}
