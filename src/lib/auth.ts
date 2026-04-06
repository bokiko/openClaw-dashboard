import { SignJWT, jwtVerify } from 'jose';
import { compareSync } from 'bcryptjs';
import { isDbAvailable } from '@/lib/db';

const SESSION_DURATION = 60 * 60; // 1 hour in seconds — limits exposure window for revoked sessions

// SEC-005: Warn when DASHBOARD_SECRET is the only configured secret.
// In this mode the raw password and the JWT signing key are the same value —
// a guessed password also compromises the ability to forge tokens.
// Recommendation: set JWT_SECRET to a separate random value.
if (
  !process.env.JWT_SECRET &&
  process.env.DASHBOARD_SECRET &&
  !process.env.DASHBOARD_PASSWORD
) {
  console.warn(
    '[auth] WARNING: DASHBOARD_SECRET is used as both the login password and the JWT signing key. ' +
    'Set JWT_SECRET to a separate random value to decouple the two.',
  );
}

function getSecret(): Uint8Array {
  // JWT_SECRET takes precedence; fall back to DASHBOARD_SECRET for backwards compat
  const secret = process.env.JWT_SECRET || process.env.DASHBOARD_SECRET;
  if (!secret) throw new Error('JWT_SECRET (or DASHBOARD_SECRET) is not set');
  return new TextEncoder().encode(secret);
}

// ── Session validation cache (PERF-003) ─────────────────────────────────────
// Short-lived TTL cache for validated session IDs.  Avoids a DB round-trip on
// every authenticated request while keeping revocation lag ≤ 30 seconds.
const SESSION_CACHE_TTL_MS = 30_000;
const _sessionCache = new Map<string, number>(); // sessionId → expiry (epoch ms)

function _sessionCacheGet(sessionId: string): boolean {
  const expiry = _sessionCache.get(sessionId);
  if (expiry === undefined) return false;
  if (Date.now() > expiry) { _sessionCache.delete(sessionId); return false; }
  return true;
}

function _sessionCacheSet(sessionId: string): void {
  _sessionCache.set(sessionId, Date.now() + SESSION_CACHE_TTL_MS);
}

function _sessionCacheDelete(sessionId: string): void {
  _sessionCache.delete(sessionId);
}

export function isAuthEnabled(): boolean {
  return !!(process.env.DASHBOARD_PASSWORD || process.env.DASHBOARD_SECRET || process.env.JWT_SECRET);
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
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length; // non-zero if lengths differ
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
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

    // When DB is available, confirm the session hasn't been revoked (e.g. via logout).
    if (isDbAvailable()) {
      // Cache hit — skip the DB query for frequently-validated sessions.
      if (!_sessionCacheGet(sessionId)) {
        try {
          const { query } = await import('@/lib/db');
          const res = await query<{ id: string }>(
            `SELECT id FROM operator_sessions WHERE id = $1`,
            [sessionId],
          );
          if (res.rows.length === 0) return { valid: false };
          _sessionCacheSet(sessionId);
        } catch {
          // DB check failed — fall through and trust the JWT signature alone
        }
      }
    }

    return { valid: true, sessionId };
  } catch {
    return { valid: false };
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  // Evict from cache immediately so the session cannot be re-validated within the TTL window.
  _sessionCacheDelete(sessionId);

  if (isDbAvailable()) {
    try {
      const { query } = await import('@/lib/db');
      await query(`DELETE FROM operator_sessions WHERE id = $1`, [sessionId]);
    } catch {
      // Best-effort cleanup
    }
  }
}

/**
 * Extract and validate the session cookie from a Route Handler request.
 * Use this in security-critical API routes as a second layer on top of
 * middleware, because middleware only verifies the JWT signature and cannot
 * check DB-level session revocation (edge runtime constraint).
 */
export async function getSessionFromRequest(request: Request): Promise<{ valid: boolean; sessionId?: string }> {
  if (!isAuthEnabled()) return { valid: true }; // open-access mode
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('oc_session='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();
  if (!token) return { valid: false };
  return validateSession(token);
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
