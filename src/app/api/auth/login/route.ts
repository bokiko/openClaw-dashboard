import { NextResponse } from 'next/server';
import { verifyPassword, createSession, isAuthEnabled } from '@/lib/auth';

/** In-memory rate limiter for login attempts (per IP, sliding window) */
const loginAttempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  loginAttempts.set(ip, attempts);
  return attempts.length >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.password || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  if (!verifyPassword(body.password)) {
    recordAttempt(ip);
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('oc_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });

  return response;
}
