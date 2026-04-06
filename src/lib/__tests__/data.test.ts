import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadTasks, generateFeed, _resetTasksCache } from '@/lib/data';
import { _resetSettingsCache } from '@/lib/settings';

let tmpDir: string;
const origTasksDir = process.env.OPENCLAW_TASKS_DIR;

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'openclaw-test-'));
}

function writeTask(dir: string, filename: string, data: Record<string, unknown>) {
  writeFileSync(join(dir, filename), JSON.stringify(data));
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  process.env.OPENCLAW_TASKS_DIR = tmpDir;
  _resetTasksCache();
  _resetSettingsCache();
});

afterEach(() => {
  if (origTasksDir !== undefined) {
    process.env.OPENCLAW_TASKS_DIR = origTasksDir;
  } else {
    delete process.env.OPENCLAW_TASKS_DIR;
  }
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
});

// ── loadTasks ─────────────────────────────────────────────────────────

describe('loadTasks', () => {
  it('parses a valid task JSON into a Task object', async () => {
    writeTask(tmpDir, 'task-1.json', {
      id: 'task-1',
      title: 'Build dashboard',
      description: 'A real task',
      status: 'in-progress',
      priority: 'high',
      claimed_by: 'neo',
      tags: ['ui', 'frontend'],
      created_at: '2026-01-15T10:00:00Z',
    });

    const tasks = await loadTasks();
    expect(tasks).toHaveLength(1);

    const t = tasks[0];
    expect(t.id).toBe('task-1');
    expect(t.title).toBe('Build dashboard');
    expect(t.description).toBe('A real task');
    expect(t.status).toBe('in-progress');
    expect(t.priority).toBe(1); // high → 1
    expect(t.assigneeId).toBe('neo');
    expect(t.tags).toEqual(['ui', 'frontend']);
    expect(t.createdAt).toBe(new Date('2026-01-15T10:00:00Z').getTime());
  });

  it('maps various status strings correctly', async () => {
    const statusTests: [string, string][] = [
      ['complete', 'done'],
      ['completed', 'done'],
      ['done', 'done'],
      ['approved', 'done'],
      ['in-progress', 'in-progress'],
      ['in_progress', 'in-progress'],
      ['active', 'in-progress'],
      ['working', 'in-progress'],
      ['review', 'review'],
      ['submitted', 'review'],
      ['pending_review', 'review'],
      ['assigned', 'assigned'],
      ['claimed', 'assigned'],
      ['waiting', 'waiting'],
      ['blocked', 'waiting'],
      ['paused', 'waiting'],
      ['random', 'inbox'],
    ];

    for (const [input, expected] of statusTests) {
      _resetTasksCache();
      // Clean out previous files
      const dir = makeTmpDir();
      process.env.OPENCLAW_TASKS_DIR = dir;

      writeTask(dir, 'test.json', { title: 'T', status: input });
      const tasks = await loadTasks();
      expect(tasks[0].status).toBe(expected);

      try { rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });

  it('maps priority strings correctly', async () => {
    const priorityTests: [string, number][] = [
      ['urgent', 0],
      ['p0', 0],
      ['critical', 0],
      ['high', 1],
      ['p1', 1],
      ['normal', 2],
      ['low', 2],
    ];

    for (const [input, expected] of priorityTests) {
      _resetTasksCache();
      const dir = makeTmpDir();
      process.env.OPENCLAW_TASKS_DIR = dir;

      writeTask(dir, 'test.json', { title: 'T', priority: input });
      const tasks = await loadTasks();
      expect(tasks[0].priority).toBe(expected);

      try { rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });

  it('skips non-task files (arrays, objects without title)', async () => {
    // Array file (like feed-items.json)
    writeFileSync(join(tmpDir, 'feed-items.json'), JSON.stringify([{ id: '1' }]));
    // Object without title
    writeTask(tmpDir, 'no-title.json', { id: 'x', status: 'done' });
    // Valid task
    writeTask(tmpDir, 'real.json', { title: 'Real Task' });

    const tasks = await loadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Real Task');
  });

  it('skips oversized files (>1MB)', async () => {
    writeTask(tmpDir, 'valid.json', { title: 'Small Task' });
    // Write a file > 1MB
    const bigContent = JSON.stringify({ title: 'Big Task', data: 'x'.repeat(1_100_000) });
    writeFileSync(join(tmpDir, 'big.json'), bigContent);

    const tasks = await loadTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Small Task');
  });

  it('returns empty array when TASKS_DIR does not exist', async () => {
    process.env.OPENCLAW_TASKS_DIR = '/tmp/nonexistent-dir-openclaw-test';
    _resetTasksCache();

    const tasks = await loadTasks();
    expect(tasks).toEqual([]);
  });

  it('cache: second call within 5s returns same reference', async () => {
    writeTask(tmpDir, 'task.json', { title: 'Cached' });

    const first = await loadTasks();
    const second = await loadTasks();
    expect(first).toBe(second); // same reference
  });

  it('cache: call after TTL returns fresh data', async () => {
    writeTask(tmpDir, 'task.json', { title: 'V1' });
    const first = await loadTasks();
    expect(first[0].title).toBe('V1');

    // Force cache expiry by resetting
    _resetTasksCache();

    // Write updated file
    writeTask(tmpDir, 'task.json', { title: 'V2' });
    const second = await loadTasks();
    expect(second[0].title).toBe('V2');
    expect(first).not.toBe(second);
  });

  it('extracts assignee from deliverables array', async () => {
    writeTask(tmpDir, 'task.json', {
      title: 'Delegated',
      deliverables: [{ assignee: 'spark', task: 'write code' }],
    });

    const tasks = await loadTasks();
    expect(tasks[0].assigneeId).toBe('spark');
  });

  it('extracts tags from type field when no tags array', async () => {
    writeTask(tmpDir, 'task.json', { title: 'Typed', type: 'bug' });

    const tasks = await loadTasks();
    expect(tasks[0].tags).toEqual(['bug']);
  });

  it('parses token usage data', async () => {
    writeTask(tmpDir, 'task.json', {
      title: 'With Usage',
      usage: [
        { inputTokens: 1000, outputTokens: 500, model: 'claude-3' },
        { inputTokens: 2000, outputTokens: 800 },
      ],
    });

    const tasks = await loadTasks();
    expect(tasks[0].usage).toHaveLength(2);
    expect(tasks[0].usage![0].inputTokens).toBe(1000);
    expect(tasks[0].usage![0].model).toBe('claude-3');
    expect(tasks[0].usage![1].outputTokens).toBe(800);
  });
});

// ── generateFeed ──────────────────────────────────────────────────────

describe('generateFeed', () => {
  it('generates feed items from task statuses', async () => {
    writeTask(tmpDir, 'done.json', {
      title: 'Done Task',
      status: 'done',
      claimed_by: 'neo',
      completed_at: '2026-01-15T12:00:00Z',
    });
    writeTask(tmpDir, 'active.json', {
      title: 'Active Task',
      status: 'in-progress',
      claimed_by: 'spark',
      created_at: '2026-01-15T11:00:00Z',
    });
    writeTask(tmpDir, 'review.json', {
      title: 'Review Task',
      status: 'review',
      created_at: '2026-01-15T10:00:00Z',
    });

    const tasks = await loadTasks();
    const feed = await generateFeed(tasks);

    // Should have status item + 3 task items = 4 minimum
    expect(feed.length).toBeGreaterThanOrEqual(4);

    // Check for specific feed entry types
    const doneItem = feed.find(f => f.id.includes('-complete'));
    expect(doneItem).toBeDefined();
    expect(doneItem!.severity).toBe('success');
    expect(doneItem!.title).toContain('completed');

    const progressItem = feed.find(f => f.id.includes('-progress'));
    expect(progressItem).toBeDefined();
    expect(progressItem!.severity).toBe('info');
    expect(progressItem!.title).toContain('started');

    const reviewItem = feed.find(f => f.id.includes('-review'));
    expect(reviewItem).toBeDefined();
    expect(reviewItem!.title).toContain('submitted for review');
  });

  it('merges feed-items.json when present', async () => {
    writeTask(tmpDir, 'task.json', { title: 'A Task', status: 'done', completed_at: '2026-01-15T12:00:00Z' });
    writeFileSync(
      join(tmpDir, 'feed-items.json'),
      JSON.stringify([
        { id: 'ext-1', type: 'memory', title: 'A memory entry', timestamp: '2026-01-15T13:00:00Z' },
      ])
    );

    const tasks = await loadTasks();
    const feed = await generateFeed(tasks);

    const memoryItem = feed.find(f => f.id === 'ext-1');
    expect(memoryItem).toBeDefined();
    expect(memoryItem!.type).toBe('decision'); // memory → decision
  });

  it('caps feed at 15 items', async () => {
    // Create 20 tasks to generate many feed items
    for (let i = 0; i < 20; i++) {
      writeTask(tmpDir, `task-${i}.json`, {
        title: `Task ${i}`,
        status: 'done',
        completed_at: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
      });
    }

    _resetTasksCache();
    const tasks = await loadTasks();
    const feed = await generateFeed(tasks);
    expect(feed.length).toBeLessThanOrEqual(15);
  });

  it('includes status-now item at the top after sort', async () => {
    writeTask(tmpDir, 'task.json', { title: 'T', status: 'inbox' });

    const tasks = await loadTasks();
    const feed = await generateFeed(tasks);

    const statusItem = feed.find(f => f.id === 'status-now');
    expect(statusItem).toBeDefined();
    expect(statusItem!.type).toBe('status');
  });
});

// ── loadSettings (via data.ts integration) ────────────────────────────

describe('loadSettings', () => {
  // Settings tests use the settings module directly
  // We need to import it after resetting cache
  it('returns defaults when no settings.json exists', async () => {
    const { loadSettings, _resetSettingsCache } = await import('@/lib/settings');
    _resetSettingsCache();

    const settings = loadSettings();
    expect(settings.name).toBe('OpenClaw');
    expect(settings.theme).toBe('dark');
    expect(settings.accentColor).toBe('green');
    expect(settings.refreshInterval).toBe(30000);
  });

  it('merges partial settings with defaults', async () => {
    const { loadSettings, _resetSettingsCache } = await import('@/lib/settings');

    // Write a partial settings.json in cwd
    const settingsPath = join(process.cwd(), 'settings.json');
    let cleanupSettings = false;
    try {
      writeFileSync(settingsPath, JSON.stringify({ name: 'MySwarm', theme: 'light' }));
      cleanupSettings = true;
      _resetSettingsCache();

      const settings = loadSettings();
      expect(settings.name).toBe('MySwarm');
      expect(settings.theme).toBe('light');
      // Defaults for unspecified fields
      expect(settings.accentColor).toBe('green');
      expect(settings.logoIcon).toBe('zap');
    } finally {
      if (cleanupSettings) {
        try { rmSync(settingsPath); } catch { /* ok */ }
      }
    }
  });

  it('validates accentColor against ACCENT_PRESETS', async () => {
    const { loadSettings, _resetSettingsCache } = await import('@/lib/settings');

    const settingsPath = join(process.cwd(), 'settings.json');
    let cleanupSettings = false;
    try {
      writeFileSync(settingsPath, JSON.stringify({ accentColor: 'neon-rainbow' }));
      cleanupSettings = true;
      _resetSettingsCache();

      const settings = loadSettings();
      expect(settings.accentColor).toBe('green'); // fallback to default
    } finally {
      if (cleanupSettings) {
        try { rmSync(settingsPath); } catch { /* ok */ }
      }
    }
  });

  it('clamps refreshInterval minimum to 5000ms', async () => {
    const { loadSettings, _resetSettingsCache } = await import('@/lib/settings');

    const settingsPath = join(process.cwd(), 'settings.json');
    let cleanupSettings = false;
    try {
      writeFileSync(settingsPath, JSON.stringify({ refreshInterval: 1000 }));
      cleanupSettings = true;
      _resetSettingsCache();

      const settings = loadSettings();
      // refreshInterval < 5000 → falls back to default (30000)
      expect(settings.refreshInterval).toBe(30000);
    } finally {
      if (cleanupSettings) {
        try { rmSync(settingsPath); } catch { /* ok */ }
      }
    }
  });

  it('cache: returns cached settings within TTL', async () => {
    const { loadSettings, _resetSettingsCache } = await import('@/lib/settings');
    _resetSettingsCache();

    const first = loadSettings();
    const second = loadSettings();
    expect(first).toBe(second); // same reference
  });
});
