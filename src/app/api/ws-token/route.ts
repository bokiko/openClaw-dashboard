import { NextResponse } from 'next/server';
import { isAuthEnabled, createWsToken, validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  // If auth is not enabled, return a simple flag
  if (!isAuthEnabled()) {
    return NextResponse.json({ token: null, wsUrl: getWsUrl() });
  }

  // Defense-in-depth: validate session cookie even though middleware already checks.
  // Protects against middleware bypass (e.g., custom server, static export).
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('oc_session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { valid } = await validateSession(sessionToken);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await createWsToken();
  return NextResponse.json({ token, wsUrl: getWsUrl() });
}

function getWsUrl(): string {
  const port = process.env.PORT || '3000';
  const host = process.env.WS_HOST || `localhost:${port}`;
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  return `${protocol}://${host}/ws`;
}
