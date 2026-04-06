import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { addChecklistItem, updateChecklistItem, deleteChecklistItem } from '@/lib/db-data';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  let body: { label: string; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.label || typeof body.label !== 'string') {
    return NextResponse.json({ error: 'Label is required' }, { status: 400 });
  }

  try {
    const item = await addChecklistItem(id, body.label.trim(), body.sortOrder);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error adding checklist item:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id: taskId } = await params;
  let body: { id: number; label?: string; checked?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

  try {
    const updated = await updateChecklistItem(body.id, taskId, {
      label: body.label,
      checked: body.checked,
    });
    return NextResponse.json({ ok: updated });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id: taskId } = await params;
  const url = new URL(request.url);
  const itemId = parseInt(url.searchParams.get('itemId') || '', 10);
  if (!itemId) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

  try {
    const deleted = await deleteChecklistItem(itemId, taskId);
    return NextResponse.json({ ok: deleted });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
