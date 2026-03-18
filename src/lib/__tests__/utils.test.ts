import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, timeAgo, formatNumber, formatTokens, formatUTC } from '@/lib/utils';

// ── cn ───────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    // twMerge: p-4 overrides p-2
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});

// ── timeAgo ─────────────────────────────────────────────────────────

describe('timeAgo', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for timestamps within the last minute', () => {
    expect(timeAgo(now - 30_000)).toBe('just now');
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes for 1-59 minutes ago', () => {
    expect(timeAgo(now - 60_000)).toBe('1m ago');
    expect(timeAgo(now - 5 * 60_000)).toBe('5m ago');
    expect(timeAgo(now - 59 * 60_000)).toBe('59m ago');
  });

  it('returns hours for 1-23 hours ago', () => {
    expect(timeAgo(now - 60 * 60_000)).toBe('1h ago');
    expect(timeAgo(now - 6 * 60 * 60_000)).toBe('6h ago');
    expect(timeAgo(now - 23 * 60 * 60_000)).toBe('23h ago');
  });

  it('returns days for 24+ hours ago', () => {
    expect(timeAgo(now - 24 * 60 * 60_000)).toBe('1d ago');
    expect(timeAgo(now - 7 * 24 * 60 * 60_000)).toBe('7d ago');
  });

  it('handles future timestamps gracefully (diff clamped to 0)', () => {
    expect(timeAgo(now + 10_000)).toBe('just now');
  });
});

// ── formatNumber ─────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats numbers with locale separators', () => {
    // Intl.NumberFormat defaults vary by locale — just check it returns a string
    expect(typeof formatNumber(1234567)).toBe('string');
    expect(formatNumber(1234567)).toContain('234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small numbers without separators', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

// ── formatTokens ─────────────────────────────────────────────────────

describe('formatTokens', () => {
  it('returns raw count for numbers under 1000', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatTokens(1_000)).toBe('1.0K');
    expect(formatTokens(1_500)).toBe('1.5K');
    expect(formatTokens(999_999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M');
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});

// ── formatUTC ────────────────────────────────────────────────────────

describe('formatUTC', () => {
  it('formats epoch ms as YYYY-MM-DD HH:MM UTC', () => {
    // 2026-01-15T09:05:00Z
    const epoch = Date.UTC(2026, 0, 15, 9, 5, 0);
    expect(formatUTC(epoch)).toBe('2026-01-15 09:05 UTC');
  });

  it('zero-pads month, day, hours, minutes', () => {
    // 2026-03-01T01:01:00Z
    const epoch = Date.UTC(2026, 2, 1, 1, 1, 0);
    expect(formatUTC(epoch)).toBe('2026-03-01 01:01 UTC');
  });

  it('handles midnight correctly', () => {
    const epoch = Date.UTC(2026, 5, 15, 0, 0, 0);
    expect(formatUTC(epoch)).toBe('2026-06-15 00:00 UTC');
  });

  it('handles end-of-day correctly', () => {
    const epoch = Date.UTC(2026, 11, 31, 23, 59, 0);
    expect(formatUTC(epoch)).toBe('2026-12-31 23:59 UTC');
  });
});
