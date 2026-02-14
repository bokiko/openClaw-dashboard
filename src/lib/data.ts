import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { Agent, Task, FeedItem, TaskStatus, Priority, TokenUsage, TokenStats } from '@/types';
import { loadSettings, ACCENT_PRESETS, type DashboardSettings, type AccentColor } from '@/lib/settings';

function getTasksDir(): string {
  return process.env.OPENCLAW_TASKS_DIR || './tasks';
}

// ── Dashboard Config ──────────────────────────────────────────────────
export interface DashboardConfig {
  name: string;
  subtitle: string;
  repoUrl: string | null;
  version: string;
}

export function getDashboardConfig(): DashboardConfig {
  const settings = loadSettings();
  return {
    name: settings.name,
    subtitle: settings.subtitle,
    repoUrl: settings.repoUrl,
    version: '0.3.0',
  };
}

// ── Client Settings ──────────────────────────────────────────────────
export interface ClientSettings {
  name: string;
  subtitle: string;
  repoUrl: string | null;
  logoIcon: string;
  theme: 'dark' | 'light';
  accentColor: AccentColor;
  accent: { primary: string; primaryLight: string; glow: string };
  backgroundGradient: { topLeft: string; bottomRight: string };
  cardDensity: 'compact' | 'comfortable';
  showMetricsPanel: boolean;
  showTokenPanel: boolean;
  refreshInterval: number;
  timeDisplay: 'utc' | 'local';
}

export function getClientSettings(): ClientSettings {
  const s = loadSettings();
  const accent = ACCENT_PRESETS[s.accentColor] || ACCENT_PRESETS.green;
  return {
    name: s.name,
    subtitle: s.subtitle,
    repoUrl: s.repoUrl,
    logoIcon: s.logoIcon,
    theme: s.theme,
    accentColor: s.accentColor,
    accent,
    backgroundGradient: s.backgroundGradient,
    cardDensity: s.cardDensity,
    showMetricsPanel: s.showMetricsPanel,
    showTokenPanel: s.showTokenPanel,
    refreshInterval: s.refreshInterval,
    timeDisplay: s.timeDisplay,
  };
}

// ── Color Validation ──────────────────────────────────────────────────
function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#697177';
}

// ── Agent Color Palette ──────────────────────────────────────────────
const AGENT_PALETTE = [
  '#46a758', '#3e63dd', '#8e4ec6', '#ffb224', '#e879a4',
  '#00a2c7', '#e54d2e', '#f76b15', '#697177', '#30a46c',
];

// ── Auto-Discover Agents ─────────────────────────────────────────────
function discoverAgentsFromTasks(tasks: Task[]): Agent[] {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.assigneeId) ids.add(task.assigneeId);
  }

  const inProgressIds = new Set(
    tasks.filter(t => t.status === 'in-progress').map(t => t.assigneeId).filter(Boolean)
  );

  let i = 0;
  const agents: Agent[] = [];
  for (const id of ids) {
    agents.push({
      id,
      name: capitalize(id),
      letter: id.charAt(0).toUpperCase(),
      color: sanitizeColor(AGENT_PALETTE[i % AGENT_PALETTE.length]),
      role: 'Agent',
      status: inProgressIds.has(id) ? 'working' : 'idle',
    });
    i++;
  }

  return agents;
}

// ── Get Agents ───────────────────────────────────────────────────────
export function getAgents(tasks?: Task[]): Agent[] {
  // 1. Settings agents (user-configured roster)
  const settings = loadSettings();
  if (settings.agents && settings.agents.length > 0) {
    const configuredAgents: Agent[] = settings.agents.map(a => ({
      id: a.id,
      name: a.name,
      letter: a.letter,
      color: sanitizeColor(a.color),
      role: a.role,
      status: 'idle' as const,
      badge: a.badge,
    }));

    // Overlay status from tasks
    if (tasks) {
      const inProgressIds = new Set(
        tasks.filter(t => t.status === 'in-progress').map(t => t.assigneeId).filter(Boolean)
      );
      for (const agent of configuredAgents) {
        if (inProgressIds.has(agent.id)) agent.status = 'working';
      }
    }

    // Overlay agents-status.json if it exists
    return overlayAgentStatus(configuredAgents);
  }

  // 2. Auto-discover from tasks
  const discovered = discoverAgentsFromTasks(tasks || []);

  // 3. Overlay agents-status.json if it exists
  return overlayAgentStatus(discovered);
}

function overlayAgentStatus(agents: Agent[]): Agent[] {
  const statusPath = join(getTasksDir(), 'agents-status.json');
  if (!existsSync(statusPath)) return agents;

  try {
    const raw = JSON.parse(readFileSync(statusPath, 'utf-8')) as Record<string, string>;
    return agents.map(agent => ({
      ...agent,
      status: raw[agent.id] === 'working' ? 'working' as const : agent.status,
    }));
  } catch {
    return agents;
  }
}

// ── Status Mapping ─────────────────────────────────────────────────────
function mapStatus(rawStatus: string): TaskStatus {
  const s = rawStatus?.toLowerCase() || 'inbox';
  if (s === 'complete' || s === 'completed' || s === 'done' || s === 'approved') return 'done';
  if (s === 'in-progress' || s === 'in_progress' || s === 'active' || s === 'working') return 'in-progress';
  if (s === 'review' || s === 'submitted' || s === 'pending_review') return 'review';
  if (s === 'assigned' || s === 'claimed') return 'assigned';
  if (s === 'waiting' || s === 'blocked' || s === 'paused') return 'waiting';
  return 'inbox';
}

// ── Priority Mapping ───────────────────────────────────────────────────
function mapPriority(rawPriority: string): Priority {
  const p = rawPriority?.toLowerCase() || 'normal';
  if (p === 'urgent' || p === 'p0' || p === 'critical') return 0;
  if (p === 'high' || p === 'p1') return 1;
  return 2;
}

// ── Parse Date ─────────────────────────────────────────────────────────
function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return Date.now();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

// ── Extract Assignee ───────────────────────────────────────────────────
function extractAssignee(task: Record<string, unknown>): string | undefined {
  // Check various fields where assignee might be
  if (task.claimed_by) return String(task.claimed_by);
  if (task.assignee) return String(task.assignee);
  
  // Check deliverables for primary assignee
  const deliverables = task.deliverables as Array<Record<string, unknown>> | undefined;
  if (deliverables && deliverables.length > 0) {
    const firstAssignee = deliverables[0]?.assignee;
    if (firstAssignee) return String(firstAssignee);
  }
  
  return undefined;
}

// ── Extract Tags ───────────────────────────────────────────────────────
function extractTags(task: Record<string, unknown>): string[] {
  if (Array.isArray(task.tags)) return task.tags.map(String);
  if (task.type) return [String(task.type)];
  return [];
}

// ── Parse Usage ───────────────────────────────────────────────────────
function parseUsage(raw: unknown): TokenUsage[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const result: TokenUsage[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const input = Number(r.inputTokens ?? r.input_tokens ?? 0);
    const output = Number(r.outputTokens ?? r.output_tokens ?? 0);
    if (input === 0 && output === 0) continue;
    result.push({
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: r.cacheReadTokens != null ? Number(r.cacheReadTokens) : (r.cache_read_tokens != null ? Number(r.cache_read_tokens) : undefined),
      cacheWriteTokens: r.cacheWriteTokens != null ? Number(r.cacheWriteTokens) : (r.cache_write_tokens != null ? Number(r.cache_write_tokens) : undefined),
      model: r.model != null ? String(r.model) : undefined,
      provider: r.provider != null ? String(r.provider) : undefined,
      timestamp: r.timestamp != null ? Number(r.timestamp) : undefined,
    });
  }
  return result.length > 0 ? result : undefined;
}

// ── Load Tasks (cached) ──────────────────────────────────────────────────
let _tasksCache: Task[] | null = null;
let _tasksCachedAt = 0;
const TASKS_CACHE_TTL = 5000; // re-read from disk every 5s at most

/** @internal — test only */
export function _resetTasksCache() { _tasksCache = null; _tasksCachedAt = 0; }

export function loadTasks(): Task[] {
  const now = Date.now();
  if (_tasksCache && (now - _tasksCachedAt) < TASKS_CACHE_TTL) return _tasksCache;

  if (!existsSync(getTasksDir())) {
    console.warn('Tasks directory not found:', getTasksDir());
    return [];
  }

  const resolvedDir = resolve(getTasksDir());
  const files = readdirSync(getTasksDir()).filter(f => f.endsWith('.json'));
  const tasks: Task[] = [];

  for (const file of files) {
    try {
      const fullPath = resolve(getTasksDir(), file);
      if (!fullPath.startsWith(resolvedDir + '/')) {
        console.warn('Skipping path traversal attempt:', file);
        continue;
      }

      const stats = statSync(fullPath);
      if (stats.size > 1_048_576) {
        console.warn(`Skipping oversized task file: ${file} (${stats.size} bytes)`);
        continue;
      }

      const content = readFileSync(fullPath, 'utf-8');
      const raw = JSON.parse(content);

      // Skip non-task files (arrays like feed-items.json, or objects without title)
      if (Array.isArray(raw) || typeof raw !== 'object' || raw === null || !raw.title) continue;

      const task = raw as Record<string, unknown>;
      const usage = parseUsage(task.usage);
      tasks.push({
        id: String(task.id || file.replace('.json', '')),
        title: String(task.title || 'Untitled'),
        description: String(task.description || ''),
        status: mapStatus(task.status as string),
        priority: mapPriority(task.priority as string),
        assigneeId: extractAssignee(task),
        tags: extractTags(task),
        createdAt: parseDate(task.created_at as string || task.created as string),
        updatedAt: parseDate(task.completed_at as string || task.completed as string || task.updated_at as string),
        ...(usage && { usage }),
      });
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  }

  // Sort by createdAt descending (newest first)
  tasks.sort((a, b) => b.createdAt - a.createdAt);

  _tasksCache = tasks;
  _tasksCachedAt = Date.now();
  return tasks;
}

// ── Generate Feed from Tasks ───────────────────────────────────────────
export function generateFeed(tasks: Task[]): FeedItem[] {
  const feed: FeedItem[] = [];
  const now = Date.now();
  
  // Generate feed items from recent task activity
  for (const task of tasks.slice(0, 20)) {
    if (task.status === 'done' && task.updatedAt) {
      feed.push({
        id: `${task.id}-complete`,
        type: 'task',
        severity: 'success',
        title: `${task.assigneeId ? capitalize(task.assigneeId) : 'Someone'} completed "${task.title}"`,
        agentId: task.assigneeId,
        timestamp: task.updatedAt,
      });
    } else if (task.status === 'in-progress') {
      feed.push({
        id: `${task.id}-progress`,
        type: 'task',
        severity: 'info',
        title: `${task.assigneeId ? capitalize(task.assigneeId) : 'Someone'} started "${task.title}"`,
        agentId: task.assigneeId,
        timestamp: task.createdAt,
      });
    } else if (task.status === 'review') {
      feed.push({
        id: `${task.id}-review`,
        type: 'task',
        severity: 'info',
        title: `"${task.title}" submitted for review`,
        agentId: task.assigneeId,
        timestamp: task.updatedAt || task.createdAt,
      });
    }
  }

  // Merge feed items from bridge script (file claims, memory entries)
  const feedPath = join(getTasksDir(), 'feed-items.json');
  if (existsSync(feedPath)) {
    try {
      const rawFeed = JSON.parse(readFileSync(feedPath, 'utf-8')) as Array<{
        id: string; type: string; title: string; agentId?: string; timestamp: string;
      }>;
      for (const item of rawFeed.slice(0, 10)) {
        feed.push({
          id: item.id,
          type: item.type === 'memory' ? 'decision' : 'comment',
          severity: item.type === 'memory' ? 'info' : 'info',
          title: item.title,
          agentId: item.agentId,
          timestamp: new Date(item.timestamp).getTime(),
        });
      }
    } catch { /* ignore malformed feed file */ }
  }

  // Add a status item
  const agents = getAgents(tasks);
  const workingAgents = agents.filter(a => a.status === 'working').length;
  feed.unshift({
    id: 'status-now',
    type: 'status',
    severity: 'success',
    title: `Squad active — ${workingAgents} ${workingAgents === 1 ? 'project' : 'projects'} online`,
    timestamp: now,
  });

  // Sort by timestamp descending
  feed.sort((a, b) => b.timestamp - a.timestamp);
  
  return feed.slice(0, 15);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Get Stats ──────────────────────────────────────────────────────────
export function getStats(tasks: Task[]) {
  return {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    inbox: tasks.filter(t => t.status === 'inbox').length,
    waiting: tasks.filter(t => t.status === 'waiting').length,
  };
}

// ── Get Token Stats ──────────────────────────────────────────────────
export function getTokenStats(tasks: Task[]): TokenStats | null {
  const tasksWithUsage = tasks.filter(t => t.usage && t.usage.length > 0);
  if (tasksWithUsage.length === 0) return null;

  let totalInput = 0;
  let totalOutput = 0;
  const byAgent: Record<string, { input: number; output: number }> = {};
  const byModel: Record<string, { input: number; output: number }> = {};
  const byDate: Record<string, { input: number; output: number }> = {};

  for (const task of tasksWithUsage) {
    const agentId = task.assigneeId || 'unknown';
    if (!byAgent[agentId]) byAgent[agentId] = { input: 0, output: 0 };

    for (const u of task.usage!) {
      totalInput += u.inputTokens;
      totalOutput += u.outputTokens;

      byAgent[agentId].input += u.inputTokens;
      byAgent[agentId].output += u.outputTokens;

      const model = u.model || 'unknown';
      if (!byModel[model]) byModel[model] = { input: 0, output: 0 };
      byModel[model].input += u.inputTokens;
      byModel[model].output += u.outputTokens;

      const dateKey = u.timestamp
        ? new Date(u.timestamp).toISOString().slice(0, 10)
        : new Date(task.createdAt).toISOString().slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { input: 0, output: 0 };
      byDate[dateKey].input += u.inputTokens;
      byDate[dateKey].output += u.outputTokens;
    }
  }

  return {
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    tokensByAgent: byAgent,
    tokensByModel: Object.entries(byModel).map(([model, counts]) => ({
      model,
      input: counts.input,
      output: counts.output,
    })),
    dailyTokens: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, input: counts.input, output: counts.output })),
  };
}
