import { isDbAvailable, query, transaction } from '@/lib/db';
import type { RoutineSchedule, CreateTaskInput } from '@/types';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return;
  if (!isDbAvailable()) return;

  console.log('Routine scheduler started (60s interval)');
  schedulerInterval = setInterval(tick, 60_000);

  // First tick after 5s
  setTimeout(tick, 5000);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

async function tick(): Promise<void> {
  if (!isDbAvailable()) return;

  try {
    const result = await query<{
      id: string; name: string; agent_id: string | null;
      schedule: RoutineSchedule; task_template: CreateTaskInput;
    }>(
      `SELECT id, name, agent_id, schedule, task_template
       FROM routines
       WHERE enabled = TRUE AND next_run_at <= NOW()`,
    );

    // Process all due routines concurrently; one failure must not block others
    await Promise.allSettled(result.rows.map(async (routine) => {
      try {
        const template = routine.task_template;
        const nextRun = calculateNextRun(routine.schedule);

        // Wrap INSERT + UPDATE in a transaction for atomicity so a failed UPDATE
        // cannot leave an orphan task (createTask uses the pool directly and
        // would escape the transaction boundary).
        await transaction(async (client) => {
          await client.query(
            `INSERT INTO dashboard_tasks (id, title, description, status, priority, assignee_id, tags, parent_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              crypto.randomUUID(),
              template.title || `[Routine] ${routine.name}`,
              template.description ?? '',
              template.status ?? 'inbox',
              template.priority ?? 2,
              template.assigneeId ?? routine.agent_id ?? null,
              [...(template.tags ?? []), 'routine'],
              null,
            ],
          );

          await client.query(
            `UPDATE routines SET last_run_at = NOW(), next_run_at = $1, updated_at = NOW() WHERE id = $2`,
            [nextRun, routine.id],
          );
        });

        console.log(`Routine "${routine.name}" fired, next run: ${nextRun?.toISOString() ?? 'never'}`);
      } catch (err) {
        console.error(`Routine "${routine.name}" failed:`, err instanceof Error ? err.message : err);
      }
    }));
  } catch (err) {
    console.error('Scheduler tick failed:', err instanceof Error ? err.message : err);
  }
}

export function calculateNextRun(schedule: RoutineSchedule): Date | null {
  if (!schedule.days || schedule.days.length === 0) return null;
  if (!schedule.time) return null;

  const [hours, minutes] = schedule.time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const now = new Date();

  // Try each of the next 8 days to find a matching day
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(hours, minutes, 0, 0);

    // Check if this day-of-week is in the schedule
    const dayOfWeek = candidate.getDay();
    if (!schedule.days.includes(dayOfWeek)) continue;

    // Skip if this time has already passed today
    if (dayOffset === 0 && candidate <= now) continue;

    return candidate;
  }

  return null;
}
