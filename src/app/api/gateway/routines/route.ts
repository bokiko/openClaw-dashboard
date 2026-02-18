/**
 * /api/gateway/routines
 *
 * GET  — List cron jobs from gateway, mapped to Routine[]
 * POST — Create a new cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';
import { cronJobToRoutine } from '@/lib/gateway-mappers';
import type { GatewayCronJob } from '@/types';

export async function GET() {
  try {
    const gw = getGatewayClient();
    const res = await gw.call<{ jobs: GatewayCronJob[] }>('cron.list', {});
    const routines = (res?.jobs || []).map(cronJobToRoutine);
    return NextResponse.json({ routines });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gw = getGatewayClient();

    // Map RoutineFormData to gateway cron.add params
    const params: Record<string, unknown> = {
      name: body.name,
      schedule: {
        kind: 'cron',
        expr: buildCronExpr(body.schedule),
        tz: body.schedule?.timezone || 'UTC',
      },
      payload: {
        kind: 'prompt',
        text: body.prompt,
        model: 'claude-sonnet-4-5-20250929',
      },
      enabled: true,
    };

    const res = await gw.call<{ job: GatewayCronJob }>('cron.add', params);
    const routine = res?.job ? cronJobToRoutine(res.job) : null;

    return NextResponse.json({ routine }, { status: 201 });
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
