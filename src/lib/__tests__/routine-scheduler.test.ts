import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateNextRun } from '@/lib/routine-scheduler';
import type { RoutineSchedule } from '@/types';

// ── calculateNextRun ──────────────────────────────────────────────────

describe('calculateNextRun', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when days array is empty', () => {
    const schedule: RoutineSchedule = { days: [], time: '09:00', timezone: 'UTC' };
    expect(calculateNextRun(schedule)).toBeNull();
  });

  it('returns null when time is missing', () => {
    const schedule = { days: [1] } as unknown as RoutineSchedule;
    expect(calculateNextRun(schedule)).toBeNull();
  });

  it('returns null when time is invalid', () => {
    const schedule: RoutineSchedule = { days: [1], time: 'not-a-time', timezone: 'UTC' };
    expect(calculateNextRun(schedule)).toBeNull();
  });

  it('returns next occurrence when scheduled time has not passed today', () => {
    // Monday 2026-01-05 08:00 UTC
    vi.setSystemTime(new Date('2026-01-05T08:00:00Z'));
    // Schedule: Monday (1) at 09:00
    const schedule: RoutineSchedule = { days: [1], time: '09:00', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(1); // Monday
    expect(result!.getHours()).toBe(9);
    expect(result!.getMinutes()).toBe(0);
  });

  it('skips today when scheduled time has already passed', () => {
    // Monday 2026-01-05 10:00 UTC (after 09:00)
    vi.setSystemTime(new Date('2026-01-05T10:00:00Z'));
    // Schedule: Monday (1) at 09:00 — already passed, should jump to next Monday
    const schedule: RoutineSchedule = { days: [1], time: '09:00', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(1); // still Monday
    // Should be 7 days later (next week)
    const expectedDate = new Date('2026-01-12T09:00:00');
    expect(result!.getDate()).toBe(expectedDate.getDate());
  });

  it('finds next matching day when today is not scheduled', () => {
    // Sunday 2026-01-04 08:00 UTC
    vi.setSystemTime(new Date('2026-01-04T08:00:00Z'));
    // Schedule: Monday (1) and Wednesday (3)
    const schedule: RoutineSchedule = { days: [1, 3], time: '09:00', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(1); // Monday
  });

  it('handles multiple days and returns the nearest one', () => {
    // Wednesday 2026-01-07 10:00 UTC (after 09:00)
    vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));
    // Schedule: Monday (1), Wednesday (3), Friday (5) at 09:00
    const schedule: RoutineSchedule = { days: [1, 3, 5], time: '09:00', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    // Wednesday 09:00 passed, next is Friday
    expect(result!.getDay()).toBe(5);
  });

  it('handles minutes in time string', () => {
    // Monday 2026-01-05 08:00 UTC
    vi.setSystemTime(new Date('2026-01-05T08:00:00Z'));
    const schedule: RoutineSchedule = { days: [1], time: '08:30', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(8);
    expect(result!.getMinutes()).toBe(30);
  });

  it('wraps around the week (Saturday schedule found from Wednesday)', () => {
    // Wednesday 2026-01-07 10:00 UTC
    vi.setSystemTime(new Date('2026-01-07T10:00:00Z'));
    // Schedule: Saturday (6) only
    const schedule: RoutineSchedule = { days: [6], time: '09:00', timezone: 'UTC' };
    const result = calculateNextRun(schedule);

    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(6); // Saturday
  });
});
