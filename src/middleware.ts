/**
 * Next.js Middleware — Auth guard
 *
 * Uses Web Crypto API (Edge-compatible, no Node.js crypto needed).
 * Validates session cookie on every request except /login and /api/auth/*.
 */

import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'openclaw_session';

// Public routes that don't require auth
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToHex(new Uint8Array(sig));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const decoded = atob(token);
    const dotIndex = decoded.lastIndexOf('.');
    if (dotIndex === -1) return false;

    const payload = decoded.slice(0, dotIndex);
    const signature = decoded.slice(dotIndex + 1);

    const expected = await hmacSha256(secret, payload);

    const sigBytes = hexToBytes(signature);
    const expectedBytes = hexToBytes(expected);

    return timingSafeEqual(sigBytes, expectedBytes);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.DASHBOARD_SECRET || '';

  if (!token || !secret || !(await verifyToken(token, secret))) {
    // Redirect to login for page requests, 401 for API requests
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
