/**
 * Activity Mappers — Transform DashboardData into WorkItem[] for Team Activity view
 */

import type { DashboardData, WorkItem } from '@/types';

export function buildWorkItems(data: DashboardData): WorkItem[] {
  const items: WorkItem[] = [];

  // 1. Cron runs → type='cron'
  for (const run of data.cronRuns ?? []) {
    const job = data.cronJobs?.find(j => j.id === run.cronId);
    items.push({
      id: run.id,
      agentId: job?.agentId || 'cron',
      type: 'cron',
      title: job?.name || 'Cron run',
      description: job?.payload.text?.slice(0, 200) || '',
      status: (['completed', 'success'].includes(run.status))
        ? 'completed'
        : (['failed', 'error'].includes(run.status))
          ? 'failed'
          : 'active',
      model: job?.payload.model || '',
      tokens: undefined,
      duration: run.durationMs,
      timestamp: new Date(run.startedAt).getTime(),
    });
  }

  // 2. Spawned sessions → type='spawn'
  for (const s of data.spawnedSessions ?? []) {
    items.push({
      id: s.sessionId,
      agentId: s.parentAgentId,
      type: 'spawn',
      title: s.label,
      description: '',
      status: s.freshness === 'recent' ? 'active' : 'completed',
      model: s.model,
      tokens: s.contextTokens || undefined,
      timestamp: new Date(s.updatedAt).getTime(),
      team: s.team,
    });
  }

  // 3. Direct sessions (not subagent, not cron) → type='direct'
  for (const task of data.tasks) {
    if (task.type === 'cron') continue;
    const key = task.metadata?.sessionKey as string | undefined;
    if (key && key.includes(':subagent:')) continue;
    items.push({
      id: task.id,
      agentId: task.assignedWorker || 'main',
      type: 'direct',
      title: task.prompt,
      description: '',
      status: task.lane === 'in_progress' ? 'active' : task.lane === 'done' ? 'completed' : 'active',
      model: (task.context?.model as string) || '',
      tokens: Number(task.context?.tokens) || undefined,
      timestamp: new Date(task.createdAt).getTime(),
    });
  }

  // Sort: failed first, then active above completed, then reverse-chronological
  return items.sort((a, b) => {
    const rank = (s: string) => s === 'failed' ? 0 : s === 'active' ? 1 : 2;
    const ra = rank(a.status), rb = rank(b.status);
    if (ra !== rb) return ra - rb;
    return b.timestamp - a.timestamp;
  });
}
