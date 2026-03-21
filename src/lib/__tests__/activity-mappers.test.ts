import { describe, it, expect } from 'vitest';
import { buildWorkItems } from '@/lib/activity-mappers';
import type { DashboardData, ClusterTask, GatewayCronJob, GatewayCronRun, SpawnedSession } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function emptyData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    tasks: [],
    tasksByLane: {},
    workers: [],
    activity: [],
    stats: {
      tasks: { total: 0, pending: 0, assigned: 0, running: 0, completed: 0, failed: 0, queueDepth: 0 },
      workers: { total: 0, idle: 0, busy: 0, offline: 0 },
      uptime: 0,
    },
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<ClusterTask> = {}): ClusterTask {
  return {
    id: 'task-1',
    type: 'direct',
    prompt: 'Do something',
    context: {},
    priority: 2,
    requiredSkills: [],
    preferredProvider: null,
    status: 'active',
    assignedWorker: 'brain',
    result: null,
    error: null,
    parentTaskId: null,
    subtasks: [],
    createdAt: new Date(1_700_000_000_000).toISOString(),
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    metadata: {},
    lane: 'in_progress',
    assignees: [],
    labels: [],
    checklist: [],
    comments: [],
    deliverables: [],
    ...overrides,
  };
}

function makeCronJob(overrides: Partial<GatewayCronJob> = {}): GatewayCronJob {
  return {
    id: 'job-1',
    agentId: 'brain',
    name: 'Morning briefing',
    enabled: true,
    schedule: { kind: 'cron', expr: '0 8 * * *', tz: 'UTC' },
    payload: { kind: 'systemEvent', text: 'Good morning', model: 'claude-opus-4' },
    state: { nextRunAtMs: 0, lastRunAtMs: 0, lastStatus: 'success', lastDurationMs: 0 },
    ...overrides,
  };
}

function makeCronRun(overrides: Partial<GatewayCronRun> = {}): GatewayCronRun {
  return {
    id: 'run-1',
    cronId: 'job-1',
    startedAt: new Date(1_700_000_000_000).toISOString(),
    completedAt: new Date(1_700_000_005_000).toISOString(),
    status: 'completed',
    durationMs: 5000,
    error: null,
    ...overrides,
  };
}

function makeSpawnedSession(overrides: Partial<SpawnedSession> = {}): SpawnedSession {
  return {
    sessionId: 'sess-1',
    label: 'Research task',
    model: 'gemini-3.1-pro',
    freshness: 'recent',
    contextTokens: 12000,
    totalTokens: 15000,
    parentAgentId: 'main',
    team: 'research',
    updatedAt: new Date(1_700_000_000_000).toISOString(),
    key: 'sess-1',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('buildWorkItems', () => {
  it('returns empty array for empty data', () => {
    expect(buildWorkItems(emptyData())).toEqual([]);
  });

  // ── Cron runs ────────────────────────────────────────────────────

  describe('cron runs', () => {
    it('maps a completed cron run to a work item', () => {
      const job = makeCronJob();
      const run = makeCronRun({ status: 'completed' });
      const items = buildWorkItems(emptyData({ cronJobs: [job], cronRuns: [run] }));

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'run-1',
        agentId: 'brain',
        type: 'cron',
        title: 'Morning briefing',
        status: 'completed',
        duration: 5000,
      });
    });

    it('maps a failed cron run to status "failed"', () => {
      const run = makeCronRun({ status: 'failed' });
      const items = buildWorkItems(emptyData({ cronRuns: [run] }));
      expect(items[0].status).toBe('failed');
    });

    it('maps an error cron run to status "failed"', () => {
      const run = makeCronRun({ status: 'error' });
      const items = buildWorkItems(emptyData({ cronRuns: [run] }));
      expect(items[0].status).toBe('failed');
    });

    it('maps a "success" status to completed', () => {
      const run = makeCronRun({ status: 'success' });
      const items = buildWorkItems(emptyData({ cronRuns: [run] }));
      expect(items[0].status).toBe('completed');
    });

    it('maps an in-progress run to a non-failed, non-completed status', () => {
      const run = makeCronRun({ status: 'running' });
      const items = buildWorkItems(emptyData({ cronRuns: [run] }));
      expect(items[0].status).not.toBe('failed');
      expect(items[0].status).not.toBe('completed');
    });

    it('falls back to "cron" agentId when no matching job found', () => {
      const run = makeCronRun({ cronId: 'unknown-job' });
      const items = buildWorkItems(emptyData({ cronRuns: [run] }));
      expect(items[0].agentId).toBe('cron');
      expect(items[0].title).toBe('Cron run');
    });

    it('truncates long payload text to 200 chars', () => {
      const longText = 'a'.repeat(300);
      const job = makeCronJob({ payload: { kind: 'systemEvent', text: longText, model: 'opus' } });
      const run = makeCronRun({ cronId: 'job-1' });
      const items = buildWorkItems(emptyData({ cronJobs: [job], cronRuns: [run] }));
      expect(items[0].description.length).toBeLessThanOrEqual(200);
    });
  });

  // ── Spawned sessions ─────────────────────────────────────────────

  describe('spawned sessions', () => {
    it('maps a recent spawned session to status "active"', () => {
      const session = makeSpawnedSession({ freshness: 'recent' });
      const items = buildWorkItems(emptyData({ spawnedSessions: [session] }));

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'sess-1',
        agentId: 'main',
        type: 'spawn',
        title: 'Research task',
        status: 'active',
        model: 'gemini-3.1-pro',
        tokens: 12000,
        team: 'research',
      });
    });

    it('maps a stale spawned session to status "completed"', () => {
      const session = makeSpawnedSession({ freshness: 'stale' });
      const items = buildWorkItems(emptyData({ spawnedSessions: [session] }));
      expect(items[0].status).toBe('completed');
    });

    it('omits tokens when contextTokens is 0', () => {
      const session = makeSpawnedSession({ contextTokens: 0 });
      const items = buildWorkItems(emptyData({ spawnedSessions: [session] }));
      // 0 is falsy → tokens should be undefined
      expect(items[0].tokens).toBeUndefined();
    });
  });

  // ── Direct tasks ─────────────────────────────────────────────────

  describe('direct tasks', () => {
    it('maps an in_progress task to status "active"', () => {
      const task = makeTask({ lane: 'in_progress' });
      const items = buildWorkItems(emptyData({ tasks: [task] }));

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'task-1',
        agentId: 'brain',
        type: 'direct',
        title: 'Do something',
        status: 'active',
      });
    });

    it('maps a done task to status "completed"', () => {
      const task = makeTask({ lane: 'done' });
      const items = buildWorkItems(emptyData({ tasks: [task] }));
      expect(items[0].status).toBe('completed');
    });

    it('skips tasks of type "cron"', () => {
      const task = makeTask({ type: 'cron' });
      const items = buildWorkItems(emptyData({ tasks: [task] }));
      expect(items).toHaveLength(0);
    });

    it('skips subagent tasks (sessionKey contains ":subagent:")', () => {
      const task = makeTask({ metadata: { sessionKey: 'main:subagent:abc' } });
      const items = buildWorkItems(emptyData({ tasks: [task] }));
      expect(items).toHaveLength(0);
    });

    it('falls back to "main" agentId when assignedWorker is null', () => {
      const task = makeTask({ assignedWorker: null });
      const items = buildWorkItems(emptyData({ tasks: [task] }));
      expect(items[0].agentId).toBe('main');
    });

    it('reads tokens from context.tokens', () => {
      const task = makeTask({ context: { tokens: 5000 } });
      const items = buildWorkItems(emptyData({ tasks: [task] }));
      expect(items[0].tokens).toBe(5000);
    });
  });

  // ── Sorting ──────────────────────────────────────────────────────

  describe('sort order', () => {
    it('places failed items first, then active, then completed', () => {
      const t = Date.now();
      const cronRuns: GatewayCronRun[] = [
        makeCronRun({ id: 'r1', status: 'completed', startedAt: new Date(t - 1000).toISOString() }),
        makeCronRun({ id: 'r2', status: 'failed',    startedAt: new Date(t - 2000).toISOString() }),
        makeCronRun({ id: 'r3', status: 'running',   startedAt: new Date(t - 3000).toISOString() }),
      ];
      const items = buildWorkItems(emptyData({ cronRuns }));
      const statuses = items.map(i => i.status);
      expect(statuses[0]).toBe('failed');
      // active (running) before completed
      const activeIdx = statuses.indexOf('active');
      const completedIdx = statuses.indexOf('completed');
      expect(activeIdx).toBeLessThan(completedIdx);
    });

    it('sorts by timestamp descending within same status', () => {
      const t = Date.now();
      const cronRuns: GatewayCronRun[] = [
        makeCronRun({ id: 'older', status: 'completed', startedAt: new Date(t - 5000).toISOString() }),
        makeCronRun({ id: 'newer', status: 'completed', startedAt: new Date(t - 1000).toISOString() }),
      ];
      const items = buildWorkItems(emptyData({ cronRuns }));
      expect(items[0].id).toBe('newer');
      expect(items[1].id).toBe('older');
    });
  });
});
