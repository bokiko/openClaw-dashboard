import { SignJWT, jwtVerify } from 'jose';
import { compareSync } from 'bcryptjs';
import { isDbAvailable } from '@/lib/db';

const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

function getSecret(): Uint8Array {
  // JWT_SECRET takes precedence; fall back to DASHBOARD_SECRET for backwards compat
  const secret = process.env.JWT_SECRET || process.env.DASHBOARD_SECRET;
  if (!secret) throw new Error('JWT_SECRET (or DASHBOARD_SECRET) is not set');
  return new TextEncoder().encode(secret);
}

export function isAuthEnabled(): boolean {
  return !!(process.env.DASHBOARD_PASSWORD || process.env.DASHBOARD_SECRET);
}

/**
 * Verify the login password.
 *
 * Supports two modes:
 *  1. DASHBOARD_PASSWORD is a bcrypt hash → use bcrypt compare (recommended).
 *  2. Legacy fallback: plain DASHBOARD_SECRET constant-time comparison.
 */
export function verifyPassword(plain: string): boolean {
  const hashed = process.env.DASHBOARD_PASSWORD;
  if (hashed) {
    // bcrypt hash starts with $2a$ / $2b$ / $2y$
    if (hashed.startsWith('$2')) {
      return compareSync(plain, hashed);
    }
    // Plain-text DASHBOARD_PASSWORD — constant-time compare
    return constantTimeEqual(plain, hashed);
  }

  // Legacy: fall back to DASHBOARD_SECRET as password
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) return false;
  return constantTimeEqual(plain, secret);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}

export async function createSession(ip?: string): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  const token = await new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  // Persist to DB if available
  if (isDbAvailable()) {
    try {
      const { query } = await import('@/lib/db');
      await query(
        `INSERT INTO operator_sessions (id, expires_at, ip_address) VALUES ($1, $2, $3)`,
        [sessionId, expiresAt, ip ?? null],
      );
    } catch {
      // DB session tracking is optional — JWT is self-contained
    }
  }

  return { token, sessionId, expiresAt };
}

export async function validateSession(token: string): Promise<{ valid: boolean; sessionId?: string }> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sessionId = payload.sid as string;
    if (!sessionId) return { valid: false };
    return { valid: true, sessionId };
  } catch {
    return { valid: false };
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  if (isDbAvailable()) {
    try {
      const { query } = await import('@/lib/db');
      await query(`DELETE FROM operator_sessions WHERE id = $1`, [sessionId]);
    } catch {
      // Best-effort cleanup
    }
  }
}

export async function createWsToken(): Promise<string> {
  // Short-lived token (30s) for WebSocket handshake
  return new SignJWT({ type: 'ws' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30s')
    .sign(getSecret());
}

export async function validateWsToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.type === 'ws';
  } catch {
    return false;
  }
}
