import { NextResponse } from 'next/server';
import { verifyPassword, createSession, isAuthEnabled } from '@/lib/auth';

/**
 * In-memory rate limiter for login attempts (per IP, sliding window).
 *
 * LIMITATION: This state is stored in-process. In a multi-instance or
 * serverless deployment each instance has an independent counter, so an
 * attacker can exceed the limit by distributing requests across instances.
 * For multi-instance production deployments, replace this with a shared
 * Redis- or DB-backed rate limiter.
 */
const loginAttempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // evict fully-expired IPs every 15 minutes

// Global attempt counter — prevents bypass via rotating X-Forwarded-For values
let globalAttempts: number[] = [];
const GLOBAL_MAX = MAX_ATTEMPTS * 3; // 15 total attempts per window across all IPs

// Periodic cleanup: remove IPs whose most recent attempt is older than WINDOW_MS
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of loginAttempts) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] >= WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
  globalAttempts = globalAttempts.filter(t => now - t < WINDOW_MS);
}, CLEANUP_INTERVAL_MS).unref();

/**
 * Extract client IP with trust hierarchy:
 *  1. x-real-ip — set by Nginx, cannot be spoofed by the client
 *  2. x-forwarded-for — only trusted when TRUSTED_PROXY env var is set
 *  3. 'unknown' fallback
 */
function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  if (process.env.TRUSTED_PROXY) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
  }

  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (attempts.length === 0) {
    loginAttempts.delete(ip);
    return false;
  }
  loginAttempts.set(ip, attempts);
  return attempts.length >= MAX_ATTEMPTS;
}

function isGloballyRateLimited(): boolean {
  const now = Date.now();
  globalAttempts = globalAttempts.filter(t => now - t < WINDOW_MS);
  return globalAttempts.length >= GLOBAL_MAX;
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  // Filter out stale entries before recording the new attempt
  const fresh = (loginAttempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  fresh.push(now);
  loginAttempts.set(ip, fresh);
  globalAttempts.push(now);
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 400 });
  }

  const ip = getClientIp(request);

  if (isRateLimited(ip) || isGloballyRateLimited()) {
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
