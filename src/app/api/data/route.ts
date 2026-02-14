import { NextResponse } from 'next/server';
import { loadTasks, generateFeed, getStats, getAgents, getTokenStats, getDashboardConfig, getClientSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Optional API Key Auth ─────────────────────────────────────────────
const API_KEY = process.env.OPENCLAW_API_KEY;

// ── Rate Limiting ─────────────────────────────────────────────────────
const rateLimit = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];
  const recent = timestamps.filter(t => t > now - WINDOW_MS);
  recent.push(now);
  rateLimit.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export async function GET(request: Request) {
  // Auth check
  if (API_KEY) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Rate limit check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const tasks = loadTasks();
    const feed = generateFeed(tasks);
    const stats = getStats(tasks);

    return NextResponse.json({
      agents: getAgents(tasks),
      tasks,
      feed,
      stats,
      tokenStats: getTokenStats(tasks),
      config: getDashboardConfig(),
      settings: getClientSettings(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error loading data:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
