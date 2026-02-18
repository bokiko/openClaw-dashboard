/**
 * POST /api/gateway/routines/[id]/trigger
 *
 * Trigger a cron job immediately via gateway.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import { cronJobToRoutine } from '@/lib/gateway-mappers';
import type { GatewayCronJob } from '@/types';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gw = getGatewayClient();
    const res = await gw.call<{ job: GatewayCronJob; runId?: string }>('cron.run', { id });
    const routine = res?.job ? cronJobToRoutine(res.job) : null;

    return NextResponse.json({ routine, runId: res?.runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
