import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashSync } from 'bcryptjs';

// ── helpers ───────────────────────────────────────────────────────────

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const origEnv = {
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
  DASHBOARD_SECRET: process.env.DASHBOARD_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
};

beforeEach(() => {
  // Reset to clean state
  delete process.env.DASHBOARD_PASSWORD;
  delete process.env.DASHBOARD_SECRET;
  delete process.env.JWT_SECRET;
});

afterEach(() => {
  setEnv(origEnv);
});

// ── isAuthEnabled ─────────────────────────────────────────────────────

describe('isAuthEnabled', () => {
  it('returns false when no env vars are set', async () => {
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(false);
  });

  it('returns false when only DASHBOARD_PASSWORD is set (no JWT secret)', async () => {
    process.env.DASHBOARD_PASSWORD = 'somepassword';
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(false);
  });

  it('returns true when DASHBOARD_PASSWORD and JWT_SECRET are both set', async () => {
    process.env.DASHBOARD_PASSWORD = 'somepassword';
    process.env.JWT_SECRET = 'mysecret';
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });

  it('returns true when only DASHBOARD_SECRET is set (serves as both password and JWT secret)', async () => {
    process.env.DASHBOARD_SECRET = 'sharedsecret';
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });

  it('returns true when DASHBOARD_SECRET and JWT_SECRET are both set', async () => {
    process.env.DASHBOARD_SECRET = 'sharedsecret';
    process.env.JWT_SECRET = 'jwtsecret';
    const { isAuthEnabled } = await import('@/lib/auth');
    expect(isAuthEnabled()).toBe(true);
  });
});

// ── verifyPassword ────────────────────────────────────────────────────

describe('verifyPassword', () => {
  it('accepts a correct bcrypt-hashed password', async () => {
    const plain = 'correct-password';
    process.env.DASHBOARD_PASSWORD = hashSync(plain, 10);
    process.env.JWT_SECRET = 'test-secret';
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword(plain)).toBe(true);
  });

  it('rejects a wrong password against bcrypt hash', async () => {
    process.env.DASHBOARD_PASSWORD = hashSync('correct-password', 10);
    process.env.JWT_SECRET = 'test-secret';
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('wrong-password')).toBe(false);
  });

  it('accepts correct plain-text DASHBOARD_PASSWORD', async () => {
    process.env.DASHBOARD_PASSWORD = 'plainpass';
    process.env.JWT_SECRET = 'test-secret';
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('plainpass')).toBe(true);
  });

  it('rejects wrong plain-text DASHBOARD_PASSWORD', async () => {
    process.env.DASHBOARD_PASSWORD = 'plainpass';
    process.env.JWT_SECRET = 'test-secret';
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('notthesame')).toBe(false);
  });

  it('falls back to DASHBOARD_SECRET when DASHBOARD_PASSWORD is unset', async () => {
    process.env.DASHBOARD_SECRET = 'legacy-secret';
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('legacy-secret')).toBe(true);
    expect(verifyPassword('wrong')).toBe(false);
  });

  it('returns false when neither env var is set', async () => {
    const { verifyPassword } = await import('@/lib/auth');
    expect(verifyPassword('anything')).toBe(false);
  });
});

// ── createSession / validateSession ───────────────────────────────────

describe('createSession / validateSession round-trip', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  });

  it('createSession returns a token that validateSession accepts', async () => {
    const { createSession, validateSession } = await import('@/lib/auth');
    const { token, sessionId } = await createSession('127.0.0.1');
    expect(typeof token).toBe('string');
    const result = await validateSession(token);
    expect(result.valid).toBe(true);
    expect(result.sessionId).toBe(sessionId);
  });

  it('validateSession rejects a tampered token', async () => {
    const { createSession, validateSession } = await import('@/lib/auth');
    const { token } = await createSession();
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = await validateSession(tampered);
    expect(result.valid).toBe(false);
  });

  it('validateSession rejects an arbitrary string', async () => {
    const { validateSession } = await import('@/lib/auth');
    const result = await validateSession('not-a-jwt');
    expect(result.valid).toBe(false);
  });
});
