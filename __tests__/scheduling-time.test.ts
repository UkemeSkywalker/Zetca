/**
 * @jest-environment node
 */

import { zonedToUtcSlot, isValidTimeZone } from '@/lib/scheduling/time';

describe('zonedToUtcSlot', () => {
  it('converts a fixed-offset zone', () => {
    expect(zonedToUtcSlot('2026-10-13', '09:00', 'Africa/Lagos')).toEqual({ date: '2026-10-13', time: '08:00' });
  });

  it('crosses midnight into the previous UTC day', () => {
    expect(zonedToUtcSlot('2026-10-13', '00:30', 'Africa/Lagos')).toEqual({ date: '2026-10-12', time: '23:30' });
  });

  it('follows daylight saving time', () => {
    // New York is UTC-4 in October and UTC-5 in December
    expect(zonedToUtcSlot('2026-10-13', '09:00', 'America/New_York')).toEqual({ date: '2026-10-13', time: '13:00' });
    expect(zonedToUtcSlot('2026-12-13', '09:00', 'America/New_York')).toEqual({ date: '2026-12-13', time: '14:00' });
  });

  it('leaves UTC alone', () => {
    expect(zonedToUtcSlot('2026-10-13', '09:00', 'UTC')).toEqual({ date: '2026-10-13', time: '09:00' });
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects junk', () => {
    expect(isValidTimeZone('Africa/Lagos')).toBe(true);
    expect(isValidTimeZone('Not/A_Zone')).toBe(false);
  });
});
