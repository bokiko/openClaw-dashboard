/**
 * PATCH /api/gateway/cron/[id]
 *
 * Toggle enabled state of a cron job via gateway.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import type { GatewayCronJob } from '@/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const gw = getGatewayClient();

    const res = await gw.call<{ job: GatewayCronJob }>('cron.update', {
      id,
      enabled: body.enabled,
    });

    return NextResponse.json({ ok: true, job: res?.job });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
