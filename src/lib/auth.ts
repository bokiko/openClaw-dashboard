/**
 * Server-side auth utilities
 *
 * Session cookie signing/verification using DASHBOARD_SECRET.
 * Only imported server-side.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || '';
const COOKIE_NAME = 'openclaw_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/** Create a signed session cookie value */
export function createSessionToken(): string {
  const payload = JSON.stringify({
    authenticated: true,
    iat: Date.now(),
  });
  const signature = createHmac('sha256', DASHBOARD_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64');
}

/** Verify a session cookie value */
export function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const dotIndex = decoded.lastIndexOf('.');
    if (dotIndex === -1) return false;

    const payload = decoded.slice(0, dotIndex);
    const signature = decoded.slice(dotIndex + 1);

    // Server-side expiry check: reject tokens older than COOKIE_MAX_AGE
    const parsed = JSON.parse(payload);
    if (!parsed.iat || Date.now() - parsed.iat > COOKIE_MAX_AGE * 1000) return false;

    const expected = createHmac('sha256', DASHBOARD_SECRET)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/** Verify operator password */
export function verifyPassword(input: string): boolean {
  const expected = process.env.OPERATOR_PASSWORD || '';
  if (!expected || !input) return false;

  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

/** Set the session cookie */
export async function setSessionCookie(): Promise<void> {
  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/** Clear the session cookie */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Check if current request is authenticated */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
