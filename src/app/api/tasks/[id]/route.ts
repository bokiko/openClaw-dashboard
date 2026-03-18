import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { getTaskDetailFromDb, updateTask, deleteTask } from '@/lib/db-data';
import type { UpdateTaskInput } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const task = await getTaskDetailFromDb(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error loading task:', error);
    return NextResponse.json({ error: 'Failed to load task' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  let body: UpdateTaskInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateableFields: (keyof UpdateTaskInput)[] = ['title', 'description', 'status', 'priority', 'assigneeId', 'tags', 'parentId', 'sortOrder'];
  const hasUpdates = updateableFields.some(k => body[k] !== undefined);
  if (!hasUpdates) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 });
  }

  try {
    // Capture old status for move events
    let oldStatus: string | undefined;
    if (body.status) {
      const existing = await getTaskDetailFromDb(id);
      oldStatus = existing?.status;
    }

    const task = await updateTask(id, body);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Broadcast via WS
    try {
      const { broadcast } = await import('@/lib/ws-server');
      broadcast('task:updated', task);
      if (body.status && oldStatus && oldStatus !== body.status) {
        broadcast('task:moved', { id, oldStatus, newStatus: body.status });
      }
    } catch { /* WS not available */ }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteTask(id);
    if (!deleted) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Broadcast via WS
    try {
      const { broadcast } = await import('@/lib/ws-server');
      broadcast('task:deleted', { id });
    } catch { /* WS not available */ }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
