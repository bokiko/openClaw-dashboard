import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/api/health', '/api/auth'];

function getSecret(): Uint8Array | null {
  // Mirror auth.ts: JWT_SECRET takes precedence, fall back to DASHBOARD_SECRET
  const secret = process.env.JWT_SECRET || process.env.DASHBOARD_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const secret = getSecret();

  // No secret configured → open access (v1 compatibility)
  if (!secret) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get('oc_session')?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Invalid or expired token
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
