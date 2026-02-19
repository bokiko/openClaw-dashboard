import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { markNotificationRead, deleteNotification } from '@/lib/notification-bus';

export const dynamic = 'force-dynamic';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const updated = await markNotificationRead(numId);
    return NextResponse.json({ ok: updated });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const deleted = await deleteNotification(numId);
    return NextResponse.json({ ok: deleted });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
