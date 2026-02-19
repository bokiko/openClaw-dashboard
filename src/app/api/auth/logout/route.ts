import { NextResponse } from 'next/server';
import { validateSession, destroySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('oc_session')?.value;

  if (token) {
    const { sessionId } = await validateSession(token);
    if (sessionId) {
      await destroySession(sessionId);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('oc_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
