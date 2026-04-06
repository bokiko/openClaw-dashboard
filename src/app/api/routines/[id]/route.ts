import { NextResponse } from 'next/server';
import { isDbAvailable, query } from '@/lib/db';
import { calculateNextRun } from '@/lib/routine-scheduler';
import { createTask } from '@/lib/db-data';
import type { RoutineSchedule, CreateTaskInput } from '@/types';

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
    const result = await query(`SELECT * FROM routines WHERE id = $1`, [id]);
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const r = result.rows[0] as {
      id: string; name: string; description: string; agent_id: string | null;
      schedule: RoutineSchedule; enabled: boolean; last_run_at: Date | null;
      next_run_at: Date | null; task_template: CreateTaskInput;
      created_at: Date; updated_at: Date;
    };

    return NextResponse.json({
      id: r.id, name: r.name, description: r.description,
      agentId: r.agent_id, schedule: r.schedule, enabled: r.enabled,
      lastRunAt: r.last_run_at?.getTime(), nextRunAt: r.next_run_at?.getTime(),
      taskTemplate: r.task_template,
      createdAt: r.created_at.getTime(), updatedAt: r.updated_at.getTime(),
    });
  } catch (error) {
    console.error('Error fetching routine:', error);
    return NextResponse.json({ error: 'Failed to fetch routine' }, { status: 500 });
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
  let body: { name?: string; description?: string; agentId?: string | null; schedule?: RoutineSchedule; enabled?: boolean; taskTemplate?: CreateTaskInput };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // SEC-007: Validate name and taskTemplate to prevent resource exhaustion.
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length > 200) {
      return NextResponse.json({ error: 'name must be a string under 200 characters' }, { status: 400 });
    }
  }

  if (body.taskTemplate !== undefined) {
    const t = body.taskTemplate;
    const VALID_STATUSES = new Set(['inbox', 'assigned', 'in-progress', 'review', 'waiting', 'done']);
    if (!t.title || typeof t.title !== 'string' || t.title.trim().length === 0 || t.title.length > 500) {
      return NextResponse.json({ error: 'taskTemplate.title must be a non-empty string under 500 chars' }, { status: 400 });
    }
    if (t.description !== undefined && (typeof t.description !== 'string' || t.description.length > 10000)) {
      return NextResponse.json({ error: 'taskTemplate.description must be a string under 10000 chars' }, { status: 400 });
    }
    if (t.status !== undefined && !VALID_STATUSES.has(t.status)) {
      return NextResponse.json({ error: 'taskTemplate.status is invalid' }, { status: 400 });
    }
    if (t.priority !== undefined && ![0, 1, 2].includes(t.priority as number)) {
      return NextResponse.json({ error: 'taskTemplate.priority must be 0, 1, or 2' }, { status: 400 });
    }
    if (t.tags !== undefined && (!Array.isArray(t.tags) || t.tags.some(tag => typeof tag !== 'string'))) {
      return NextResponse.json({ error: 'taskTemplate.tags must be an array of strings' }, { status: 400 });
    }
  }

  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (body.name !== undefined) { sets.push(`name = $${idx++}`); values.push(body.name); }
  if (body.description !== undefined) { sets.push(`description = $${idx++}`); values.push(body.description); }
  if (body.agentId !== undefined) { sets.push(`agent_id = $${idx++}`); values.push(body.agentId); }
  if (body.schedule !== undefined) {
    sets.push(`schedule = $${idx++}`); values.push(JSON.stringify(body.schedule));
    const nextRun = calculateNextRun(body.schedule);
    sets.push(`next_run_at = $${idx++}`); values.push(nextRun);
  }
  if (body.enabled !== undefined) { sets.push(`enabled = $${idx++}`); values.push(body.enabled); }
  if (body.taskTemplate !== undefined) { sets.push(`task_template = $${idx++}`); values.push(JSON.stringify(body.taskTemplate)); }

  try {
    const result = await query(
      `UPDATE routines SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id`,
      [...values, id],
    );
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating routine:', error);
    return NextResponse.json({ error: 'Failed to update routine' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const { id } = await params;

  try {
    const result = await query(`DELETE FROM routines WHERE id = $1`, [id]);
    if ((result.rowCount ?? 0) === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting routine:', error);
    return NextResponse.json({ error: 'Failed to delete routine' }, { status: 500 });
  }
}

// POST = manual trigger
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const { id } = await params;

  const result = await query<{
    name: string; agent_id: string | null;
    schedule: RoutineSchedule; task_template: CreateTaskInput;
  }>(`SELECT name, agent_id, schedule, task_template FROM routines WHERE id = $1`, [id]);

  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const routine = result.rows[0];

  try {
    const template = routine.task_template;
    const task = await createTask({
      title: template.title || `[Routine] ${routine.name}`,
      description: template.description,
      status: template.status ?? 'inbox',
      priority: template.priority ?? 2,
      assigneeId: template.assigneeId ?? routine.agent_id ?? undefined,
      tags: [...(template.tags ?? []), 'routine'],
    });

    await query(`UPDATE routines SET last_run_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]);

    return NextResponse.json({ ok: true, taskId: task.id });
  } catch (error) {
    console.error('Error triggering routine:', error);
    return NextResponse.json({ error: 'Failed to trigger routine' }, { status: 500 });
  }
}
