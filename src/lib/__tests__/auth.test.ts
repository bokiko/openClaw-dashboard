import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashSync } from 'bcryptjs';

// ── isAuthEnabled ─────────────────────────────────────────────────────

describe('isAuthEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false when no auth env vars are set', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', '');
    vi.stubEnv('DASHBOARD_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(false);
  });

  it('returns true when DASHBOARD_PASSWORD is set', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', 'mypassword');
    vi.stubEnv('DASHBOARD_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });

  it('returns true when DASHBOARD_SECRET is set', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', '');
    vi.stubEnv('DASHBOARD_SECRET', 'mysecret');
    vi.stubEnv('JWT_SECRET', '');
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });

  it('returns true when only JWT_SECRET is set', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', '');
    vi.stubEnv('DASHBOARD_SECRET', '');
    vi.stubEnv('JWT_SECRET', 'myjwtsecret');
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });
});

// ── verifyPassword ────────────────────────────────────────────────────

describe('verifyPassword', () => {
  const plainPassword = 'correct-horse-battery-staple';
  const bcryptHash = hashSync(plainPassword, 10);

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-for-auth-tests');
    vi.stubEnv('DASHBOARD_SECRET', '');
    vi.stubEnv('DASHBOARD_PASSWORD', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true for correct password against bcrypt hash', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', bcryptHash);
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword(plainPassword)).toBe(true);
  });

  it('returns false for wrong password against bcrypt hash', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', bcryptHash);
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('wrong-password')).toBe(false);
  });

  it('returns true for correct plain-text DASHBOARD_PASSWORD', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', plainPassword);
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword(plainPassword)).toBe(true);
  });

  it('returns false for wrong plain-text DASHBOARD_PASSWORD', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', plainPassword);
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('wrong')).toBe(false);
  });

  it('falls back to DASHBOARD_SECRET when DASHBOARD_PASSWORD is not set', async () => {
    vi.stubEnv('DASHBOARD_SECRET', 'my-dashboard-secret');
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('my-dashboard-secret')).toBe(true);
    expect(verifyPassword('wrong')).toBe(false);
  });

  it('returns false when neither DASHBOARD_PASSWORD nor DASHBOARD_SECRET is set', async () => {
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('anything')).toBe(false);
  });

  it('constantTimeEqual handles strings of different lengths correctly', async () => {
    vi.stubEnv('DASHBOARD_PASSWORD', 'short');
    const { verifyPassword } = await import('@/lib/auth');
    // Longer input must not bypass constant-time check
    expect(verifyPassword('short-but-longer')).toBe(false);
    // Shorter input must not bypass constant-time check
    expect(verifyPassword('sho')).toBe(false);
    // Empty string
    expect(verifyPassword('')).toBe(false);
  });
});

// ── createSession / validateSession ───────────────────────────────────

describe('createSession / validateSession', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-for-session-tests');
    vi.stubEnv('DASHBOARD_SECRET', '');
    vi.stubEnv('DATABASE_URL', ''); // disable DB to avoid connection attempts
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('createSession returns a token that validateSession accepts', async () => {
    const { createSession, validateSession } = await import('@/lib/auth');
    const { token } = await createSession();
    const result = await validateSession(token);
    expect(result.valid).toBe(true);
    expect(result.sessionId).toBeTruthy();
  });

  it('createSession includes a sessionId in the token', async () => {
    const { createSession, validateSession } = await import('@/lib/auth');
    const { token, sessionId } = await createSession();
    const result = await validateSession(token);
    expect(result.sessionId).toBe(sessionId);
  });

  it('validateSession rejects a malformed token', async () => {
    const { validateSession } = await import('@/lib/auth');
    const result = await validateSession('not.a.valid.jwt');
    expect(result.valid).toBe(false);
  });

  it('validateSession rejects an empty string', async () => {
    const { validateSession } = await import('@/lib/auth');
    const result = await validateSession('');
    expect(result.valid).toBe(false);
  });

  it('validateSession rejects a token signed with the wrong secret', async () => {
    vi.stubEnv('JWT_SECRET', 'original-secret');
    const { createSession } = await import('@/lib/auth');
    const { token } = await createSession();

    // Re-import with different secret
    vi.stubEnv('JWT_SECRET', 'different-secret');
    vi.resetModules();
    const { validateSession } = await import('@/lib/auth');
    const result = await validateSession(token);
    expect(result.valid).toBe(false);
  });
});

// ── createWsToken / validateWsToken ───────────────────────────────────

describe('createWsToken / validateWsToken', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-for-ws-tests');
    vi.stubEnv('DASHBOARD_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('createWsToken returns a token that validateWsToken accepts', async () => {
    const { createWsToken, validateWsToken } = await import('@/lib/auth');
    const token = await createWsToken();
    const valid = await validateWsToken(token);
    expect(valid).toBe(true);
  });

  it('validateWsToken rejects a regular session token', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const { createSession, validateWsToken } = await import('@/lib/auth');
    const { token } = await createSession();
    const valid = await validateWsToken(token);
    expect(valid).toBe(false);
  });

  it('validateWsToken rejects a malformed token', async () => {
    const { validateWsToken } = await import('@/lib/auth');
    const valid = await validateWsToken('garbage');
    expect(valid).toBe(false);
  });
});
