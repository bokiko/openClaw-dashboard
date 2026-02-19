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
import { loadSettings } from '@/lib/settings';
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

    // Parallel calls to gateway — cron methods are non-fatal (not all gateways support them)
    const [sessionsRes, cronJobsRes, cronRunsRes] = await Promise.allSettled([
      gw.call<{ sessions: GatewaySession[] }>('sessions.list', { limit: 50 }),
      gw.call<{ jobs: GatewayCronJob[] }>('cron.list', {}),
      gw.call<{ runs: GatewayCronRun[] }>('cron.runs', { limit: 50 }),
    ]);

    if (sessionsRes.status === 'rejected') {
      throw sessionsRes.reason;
    }

    const sessions = sessionsRes.value?.sessions || [];
    const cronJobs = cronJobsRes.status === 'fulfilled' ? cronJobsRes.value?.jobs || [] : [];
    const cronRuns = cronRunsRes.status === 'fulfilled' ? cronRunsRes.value?.runs || [] : [];

    const data = buildDashboardData(sessions, cronRuns, cronJobs);

    // Include refreshInterval from settings
    const settings = loadSettings();
    const responseData = { ...data, refreshInterval: settings.refreshInterval };

    // Cache the result
    cache = { data: responseData, ts: Date.now() };

    return NextResponse.json(responseData);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    console.error('[gateway/dashboard]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
