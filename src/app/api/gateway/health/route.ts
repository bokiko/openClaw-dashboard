/**
 * GET /api/gateway/health
 *
 * Health check — pings gateway HTTP health port + RPC.
 */

import { NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';

export async function GET() {
  try {
    const gw = getGatewayClient();

    const [httpOk, rpcOk] = await Promise.all([
      gw.healthCheck(),
      gw.call('status', {}).then(() => true).catch(() => false),
    ]);

    return NextResponse.json({
      healthy: httpOk || rpcOk,
      http: httpOk,
      rpc: rpcOk,
    });
  } catch {
    return NextResponse.json({ healthy: false, http: false, rpc: false });
  }
}
