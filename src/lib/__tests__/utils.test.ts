import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeAgo, formatNumber, formatTokens, formatUTC, cn } from '@/lib/utils';

// ── cn (classnames merge) ─────────────────────────────────────────────

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates tailwind classes (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn(undefined, null, 'valid')).toBe('valid');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────

describe('timeAgo', () => {
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 60 seconds ago', () => {
    expect(timeAgo(now - 30_000)).toBe('just now');
    expect(timeAgo(now)).toBe('just now');
    expect(timeAgo(now - 59_000)).toBe('just now');
  });

  it('returns minutes for 1-59 minutes ago', () => {
    expect(timeAgo(now - 60_000)).toBe('1m ago');
    expect(timeAgo(now - 5 * 60_000)).toBe('5m ago');
    expect(timeAgo(now - 59 * 60_000)).toBe('59m ago');
  });

  it('returns hours for 1-23 hours ago', () => {
    expect(timeAgo(now - 60 * 60_000)).toBe('1h ago');
    expect(timeAgo(now - 3 * 60 * 60_000)).toBe('3h ago');
    expect(timeAgo(now - 23 * 60 * 60_000)).toBe('23h ago');
  });

  it('returns days for >= 24 hours ago', () => {
    expect(timeAgo(now - 24 * 60 * 60_000)).toBe('1d ago');
    expect(timeAgo(now - 7 * 24 * 60 * 60_000)).toBe('7d ago');
    expect(timeAgo(now - 30 * 24 * 60 * 60_000)).toBe('30d ago');
  });

  it('handles future timestamps (returns "just now")', () => {
    // Future timestamps clamp to 0 diff via Math.max
    expect(timeAgo(now + 10_000)).toBe('just now');
  });
});

// ── formatNumber ──────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small integers without separator', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with locale separator', () => {
    // Intl.NumberFormat uses commas in en-US (Node default)
    const result = formatNumber(1000);
    expect(result).toMatch(/1[,.]000/); // flexible for locale
  });

  it('formats large numbers', () => {
    const result = formatNumber(1_234_567);
    expect(result).toMatch(/1[,.]234[,.]567/);
  });

  it('formats negative numbers', () => {
    const result = formatNumber(-500);
    expect(result).toContain('500');
  });
});

// ── formatTokens ──────────────────────────────────────────────────────

describe('formatTokens', () => {
  it('formats small counts as plain numbers', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands as K with one decimal', () => {
    expect(formatTokens(1_000)).toBe('1.0K');
    expect(formatTokens(1_500)).toBe('1.5K');
    expect(formatTokens(999_999)).toBe('1000.0K');
  });

  it('formats millions as M with one decimal', () => {
    expect(formatTokens(1_000_000)).toBe('1.0M');
    expect(formatTokens(1_500_000)).toBe('1.5M');
    expect(formatTokens(2_750_000)).toBe('2.8M');
  });

  it('prefers M over K for values >= 1M', () => {
    const result = formatTokens(1_000_000);
    expect(result).toContain('M');
    expect(result).not.toContain('K');
  });
});

// ── formatUTC ─────────────────────────────────────────────────────────

describe('formatUTC', () => {
  it('formats a known UTC timestamp correctly', () => {
    // 2026-03-17T18:30:00Z
    const epochMs = new Date('2026-03-17T18:30:00Z').getTime();
    expect(formatUTC(epochMs)).toBe('2026-03-17 18:30 UTC');
  });

  it('pads single-digit month and day', () => {
    // 2026-01-05T09:05:00Z
    const epochMs = new Date('2026-01-05T09:05:00Z').getTime();
    expect(formatUTC(epochMs)).toBe('2026-01-05 09:05 UTC');
  });

  it('handles midnight correctly', () => {
    const epochMs = new Date('2026-06-01T00:00:00Z').getTime();
    expect(formatUTC(epochMs)).toBe('2026-06-01 00:00 UTC');
  });

  it('handles end-of-day correctly', () => {
    const epochMs = new Date('2026-12-31T23:59:00Z').getTime();
    expect(formatUTC(epochMs)).toBe('2026-12-31 23:59 UTC');
  });

  it('always uses UTC regardless of local timezone', () => {
    // 2026-03-17T00:30:00Z — local time (UTC+3) would be 2026-03-17 03:30
    // but UTC output should be 2026-03-17 00:30
    const epochMs = new Date('2026-03-17T00:30:00Z').getTime();
    expect(formatUTC(epochMs)).toBe('2026-03-17 00:30 UTC');
  });
});
