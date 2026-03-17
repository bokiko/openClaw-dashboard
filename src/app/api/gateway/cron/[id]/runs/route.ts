/**
 * GET /api/gateway/cron/[id]/runs
 *
 * Fetch recent run history for a cron job via gateway.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import type { GatewayCronRun } from '@/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gw = getGatewayClient();
    const res = await gw.call<{ runs: GatewayCronRun[] }>('cron.runs', { jobId: id, limit: 10 });

    return NextResponse.json({ runs: res?.runs ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
