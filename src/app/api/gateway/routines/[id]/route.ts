/**
 * /api/gateway/routines/[id]
 *
 * PATCH  — Update or enable/disable a cron job
 * DELETE — Remove a cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import { cronJobToRoutine } from '@/lib/gateway-mappers';
import type { GatewayCronJob } from '@/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const gw = getGatewayClient();

    // If body has only 'enabled', treat as toggle
    if (Object.keys(body).length === 1 && 'enabled' in body) {
      const res = await gw.call<{ job: GatewayCronJob }>('cron.update', {
        id,
        enabled: body.enabled,
      });
      const routine = res?.job ? cronJobToRoutine(res.job) : null;
      return NextResponse.json({ routine });
    }

    // Full update
    const updateParams: Record<string, unknown> = { id };
    if (body.name) updateParams.name = body.name;
    if (body.schedule) {
      updateParams.schedule = {
        kind: 'cron',
        expr: buildCronExpr(body.schedule),
        tz: body.schedule.timezone || 'UTC',
      };
    }
    if (body.prompt) {
      updateParams.payload = {
        kind: 'prompt',
        text: body.prompt,
        model: 'claude-sonnet-4-5-20250929',
      };
    }

    const res = await gw.call<{ job: GatewayCronJob }>('cron.update', updateParams);
    const routine = res?.job ? cronJobToRoutine(res.job) : null;

    return NextResponse.json({ routine });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gw = getGatewayClient();
    await gw.call('cron.remove', { id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function buildCronExpr(schedule: { hour?: number; minute?: number; daysOfWeek?: number[] }): string {
  const minute = schedule?.minute ?? 0;
  const hour = schedule?.hour ?? 9;
  const dow = schedule?.daysOfWeek?.join(',') || '*';
  return `${minute} ${hour} * * ${dow}`;
}
