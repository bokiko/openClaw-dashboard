/**
 * Gateway → Dashboard Type Mappers
 *
 * Translates OpenClaw gateway RPC responses into the data model
 * the existing dashboard components consume.
 */

import type {
  GatewaySession,
  GatewayCronJob,
  GatewayCronRun,
  ClusterTask,
  ClusterWorker,
  Activity,
  DashboardData,
  Priority,
} from '@/types';
import type { GatewayRoutine } from '@/types';

const FIVE_MINUTES = 5 * 60 * 1000;

// ── Session → ClusterTask ───────────────────────────────────────────

function deriveSessionStatus(session: GatewaySession): string {
  const age = Date.now() - new Date(session.updatedAt).getTime();
  if (session.kind === 'cron') return 'assigned';
  if (age < FIVE_MINUTES && session.contextTokens > 0) return 'in_progress';
  if (session.contextTokens > 0) return 'review';
  return 'inbox';
}

function deriveSessionPriority(model: string): number {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 9;
  if (m.includes('sonnet')) return 6;
  return 3;
}

export function sessionToClusterTask(session: GatewaySession): ClusterTask {
  const status = deriveSessionStatus(session);
  const priority = deriveSessionPriority(session.model);

  return {
    id: session.sessionId,
    type: session.kind || 'session',
    prompt: session.key || 'Untitled session',
    context: { model: session.model, tokens: session.contextTokens },
    priority,
    requiredSkills: [],
    preferredProvider: null,
    status,
    assignedWorker: session.agentId,
    result: null,
    error: null,
    parentTaskId: null,
    subtasks: [],
    createdAt: session.updatedAt,
    startedAt: status === 'in_progress' ? session.updatedAt : null,
    completedAt: null,
    retryCount: 0,
    metadata: { flags: session.flags },
    lane: status,
    assignees: [session.agentId],
    labels: [session.model],
    checklist: [],
    comments: [],
    deliverables: [],
  };
}

// ── Agent → ClusterWorker ───────────────────────────────────────────

interface AgentInfo {
  id: string;
  model: string;
  sessions: GatewaySession[];
}

export function agentToClusterWorker(agent: AgentInfo): ClusterWorker {
  const activeSessions = agent.sessions.filter(s => {
    const age = Date.now() - new Date(s.updatedAt).getTime();
    return age < FIVE_MINUTES && s.contextTokens > 0;
  });

  const status: ClusterWorker['status'] =
    activeSessions.length > 0 ? 'busy' : 'idle';

  return {
    id: agent.id,
    name: agent.id,
    ip: '127.0.0.1',
    port: 0,
    skills: [],
    provider: providerFromModel(agent.model),
    model: agent.model,
    tier: agent.model.toLowerCase().includes('opus') ? 1 : 2,
    status,
    currentTask: activeSessions[0]?.sessionId || null,
    tasksCompleted: agent.sessions.length,
    tasksFailed: 0,
    lastHeartbeat: new Date().toISOString(),
    registeredAt: agent.sessions[0]?.updatedAt || new Date().toISOString(),
    metadata: {},
  };
}

function providerFromModel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('claude') || m.includes('opus') || m.includes('sonnet') || m.includes('haiku')) return 'claude';
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'openai';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('gemini')) return 'google';
  return 'unknown';
}

// ── CronRun → Activity ──────────────────────────────────────────────

export function cronRunToActivity(run: GatewayCronRun, cronName: string): Activity {
  const isError = run.status === 'failed' || run.status === 'error';
  return {
    id: run.id,
    type: isError ? 'task:failed' : run.status === 'completed' ? 'task:completed' : 'task:started',
    taskId: run.cronId,
    workerId: null,
    actor: 'cron',
    summary: `${cronName}: ${run.status}${run.error ? ` — ${run.error}` : ''}`,
    details: { durationMs: run.durationMs },
    createdAt: run.startedAt,
  };
}

// ── CronJob → GatewayRoutine ───────────────────────────────────────────────

export function cronJobToRoutine(job: GatewayCronJob): GatewayRoutine {
  // Parse cron expr to extract schedule info for the routine card
  const schedule = parseCronSchedule(job.schedule);

  return {
    id: job.id,
    name: job.name,
    enabled: job.enabled,
    schedule,
    prompt: job.payload.text || '',
    priority: 5,
    requiredSkills: [],
    lastTriggeredAt: job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseCronSchedule(sched: GatewayCronJob['schedule']): GatewayRoutine['schedule'] {
  // Gateway uses cron expressions like "0 9 * * 1,3,5"
  // Try to extract day-of-week and time from the expr
  const parts = sched.expr.trim().split(/\s+/);

  let minute = 0;
  let hour = 9;
  let daysOfWeek = [1, 2, 3, 4, 5]; // Default: weekdays

  if (parts.length >= 5) {
    minute = parseInt(parts[0], 10) || 0;
    hour = parseInt(parts[1], 10) || 9;
    // Day of week field (5th field)
    const dowField = parts[4];
    if (dowField && dowField !== '*') {
      daysOfWeek = dowField.split(',').map(d => parseInt(d, 10)).filter(n => !isNaN(n));
    } else {
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Every day
    }
  }

  return {
    type: 'weekly',
    daysOfWeek,
    hour,
    minute,
    timezone: sched.tz || 'UTC',
  };
}

// ── Build DashboardData ─────────────────────────────────────────────

export function buildDashboardData(
  sessions: GatewaySession[],
  cronRuns: GatewayCronRun[],
  cronJobs: GatewayCronJob[],
): DashboardData {
  // Build tasks from sessions
  const tasks = sessions.map(sessionToClusterTask);

  // Derive unique agents from sessions
  const agentMap = new Map<string, AgentInfo>();
  for (const s of sessions) {
    const existing = agentMap.get(s.agentId);
    if (existing) {
      existing.sessions.push(s);
      // Use the most common model
    } else {
      agentMap.set(s.agentId, { id: s.agentId, model: s.model, sessions: [s] });
    }
  }
  const workers = Array.from(agentMap.values()).map(agentToClusterWorker);

  // Build activity from cron runs
  const cronNameMap = new Map<string, string>();
  for (const j of cronJobs) {
    cronNameMap.set(j.id, j.name);
  }
  const activity = cronRuns
    .slice(0, 50)
    .map(r => cronRunToActivity(r, cronNameMap.get(r.cronId) || 'Unknown cron'));

  // Build tasks-by-lane
  const tasksByLane: Record<string, ClusterTask[]> = {};
  for (const t of tasks) {
    if (!tasksByLane[t.lane]) tasksByLane[t.lane] = [];
    tasksByLane[t.lane].push(t);
  }

  // Stats
  const inProgress = tasks.filter(t => t.lane === 'in_progress').length;
  const assigned = tasks.filter(t => t.lane === 'assigned').length;
  const review = tasks.filter(t => t.lane === 'review').length;
  const inbox = tasks.filter(t => t.lane === 'inbox').length;
  const done = tasks.filter(t => t.lane === 'done').length;

  return {
    tasks,
    tasksByLane,
    workers,
    activity,
    stats: {
      tasks: {
        total: tasks.length,
        pending: inbox,
        assigned,
        running: inProgress,
        completed: done,
        failed: 0,
        queueDepth: inbox + assigned,
      },
      workers: {
        total: workers.length,
        idle: workers.filter(w => w.status === 'idle').length,
        busy: workers.filter(w => w.status === 'busy').length,
        offline: 0,
      },
      uptime: 0,
    },
    timestamp: Date.now(),
  };
}
