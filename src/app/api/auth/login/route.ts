import { NextResponse } from 'next/server';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

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

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }

    const { password } = await req.json();

    if (!password || !verifyPassword(password)) {
      recordAttempt(ip);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await setSessionCookie();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
