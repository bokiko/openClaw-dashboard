/**
 * WS Token Endpoint
 *
 * Returns a short-lived HMAC token for WebSocket authentication.
 * Only accessible to authenticated users (middleware.ts validates cookie).
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Gateway mode: no browser-side WebSocket — use HTTP polling instead.
  // Return wsUrl: null to signal the WebSocketProvider to skip connecting.
  return NextResponse.json({
    token: null,
    wsUrl: null,
    expiresIn: 0,
  });
}
