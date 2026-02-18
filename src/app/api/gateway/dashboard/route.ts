/**
 * GET /api/gateway/dashboard
 *
 * Main aggregation endpoint. Fetches sessions, cron jobs, and cron runs
 * from the gateway, maps them to the DashboardData shape.
 * 5-second in-memory cache to avoid hammering gateway on rapid refreshes.
 */

import { NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import { buildDashboardData } from '@/lib/gateway-mappers';
import type { GatewaySession, GatewayCronJob, GatewayCronRun } from '@/types';

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5_000;

export async function GET() {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const gw = getGatewayClient();

    // Parallel calls to gateway
    const [sessionsRes, cronJobsRes, cronRunsRes] = await Promise.all([
      gw.call<{ sessions: GatewaySession[] }>('sessions.list', { limit: 50 }),
      gw.call<{ jobs: GatewayCronJob[] }>('cron.list', {}),
      gw.call<{ runs: GatewayCronRun[] }>('cron.runs', { limit: 50 }),
    ]);

    const sessions = sessionsRes?.sessions || [];
    const cronJobs = cronJobsRes?.jobs || [];
    const cronRuns = cronRunsRes?.runs || [];

    const data = buildDashboardData(sessions, cronRuns, cronJobs);

    // Cache the result
    cache = { data, ts: Date.now() };

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    console.error('[gateway/dashboard]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
