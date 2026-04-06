import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { loadTasksFromDb, createTask } from '@/lib/db-data';
import type { TaskStatus, CreateTaskInput } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') as TaskStatus | null;
  const assignee = url.searchParams.get('assignee');
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '500', 10) || 500), 500);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

  try {
    const { tasks, total } = await loadTasksFromDb({
      status: status ?? undefined,
      assignee: assignee ?? undefined,
      limit: Math.min(limit, 500),
      offset,
    });
    return NextResponse.json({ tasks, total });
  } catch (error) {
    console.error('Error loading tasks:', error);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: CreateTaskInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const task = await createTask({
      ...body,
      title: body.title.trim(),
      description: body.description?.trim(),
    });

    // Broadcast via WS if available
    try {
      const { broadcast } = await import('@/lib/ws-server');
      broadcast('task:created', task);
    } catch { /* WS not available */ }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
