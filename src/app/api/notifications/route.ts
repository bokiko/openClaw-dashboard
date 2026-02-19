import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { getNotifications, markAllNotificationsRead, deleteAllNotifications } from '@/lib/notification-bus';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ notifications: [] });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  try {
    const notifications = await getNotifications({ unreadOnly, limit });
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error loading notifications:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: true });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action === 'read-all') {
    const count = await markAllNotificationsRead();
    return NextResponse.json({ ok: true, count });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE() {
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  try {
    const count = await deleteAllNotifications();
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
