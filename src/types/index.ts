// ── Core types ──────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  letter: string;
  color: string;
  role: string;
  status: 'working' | 'idle' | 'offline';
  badge?: 'lead' | 'spc';
  avatar?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model?: string;
  provider?: string;
  timestamp?: number;
}

export interface TokenStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  tokensByAgent: Record<string, { input: number; output: number }>;
  tokensByModel: { model: string; input: number; output: number }[];
  dailyTokens: { date: string; input: number; output: number }[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  tags: string[];
  createdAt: number;
  updatedAt?: number;
  // Token tracking (from remote)
  usage?: TokenUsage[];
  // Rich task fields (from cluster or DB)
  checklist?: (ChecklistItem | ClusterChecklistItem)[];
  comments?: (Comment | TaskComment)[];
  deliverables?: Deliverable[];
  assignees?: string[];
  labels?: string[];
  lane?: string;
}

export type TaskStatus = 'inbox' | 'assigned' | 'in-progress' | 'review' | 'waiting' | 'done';
export type Priority = 0 | 1 | 2; // 0 = urgent, 1 = high, 2 = normal

export interface FeedItem {
  id: string;
  type: 'status' | 'task' | 'comment' | 'decision';
  severity: 'info' | 'success' | 'warning' | 'error';
  title: string;
  agentId?: string;
  timestamp: number;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
}

// ── Cluster types ────────────────────────────────────────────────────

export interface ClusterTask {
  id: string;
  type: string;
  prompt: string;
  context: Record<string, unknown>;
  priority: number;
  requiredSkills: string[];
  preferredProvider: string | null;
  status: string;
  assignedWorker: string | null;
  result: unknown;
  error: string | null;
  parentTaskId: string | null;
  subtasks: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  metadata: Record<string, unknown>;
  lane: string;
  assignees: string[];
  labels: string[];
  checklist: ClusterChecklistItem[];
  comments: Comment[];
  deliverables: Deliverable[];
}

export interface ClusterWorker {
  id: string;
  name: string;
  ip: string;
  port: number;
  skills: string[];
  provider: string;
  model: string;
  tier: number;
  status: 'idle' | 'busy' | 'offline';
  currentTask: string | null;
  tasksCompleted: number;
  tasksFailed: number;
  lastHeartbeat: string;
  registeredAt: string;
  metadata: Record<string, unknown>;
}

export interface Activity {
  id: string;
  type: string;
  taskId: string | null;
  workerId: string | null;
  actor: string;
  summary: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ClusterChecklistItem {
  text: string;
  checked: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  type: string;
  name: string;
  url: string | null;
  createdAt: string;
}

export interface DashboardData {
  tasks: ClusterTask[];
  tasksByLane: Record<string, ClusterTask[]>;
  workers: ClusterWorker[];
  activity: Activity[];
  stats: {
    tasks: { total: number; pending: number; assigned: number; running: number; completed: number; failed: number; queueDepth: number };
    workers: { total: number; idle: number; busy: number; offline: number };
    uptime: number;
  };
  timestamp: number;
  refreshInterval?: number;
}

// ── Gateway types (from OpenClaw gateway WS RPC) ────────────────────

export interface GatewaySession {
  agentId: string;
  key: string;
  kind: string;
  sessionId: string;
  updatedAt: string;
  model: string;
  contextTokens: number;
  flags: Record<string, unknown>;
}

export interface GatewayCronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr: string;
    tz: string;
  };
  payload: {
    kind: string;
    text: string;
    model: string;
  };
  state: {
    nextRunAtMs: number;
    lastRunAtMs: number;
    lastStatus: string;
    lastDurationMs: number;
  };
}

export interface GatewayCronRun {
  id: string;
  cronId: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  durationMs: number;
  error: string | null;
}

export interface GatewayChannelStatus {
  name: string;
  connected: boolean;
  details: Record<string, unknown>;
}

/** Gateway routine shape (from cronJobToRoutine mapper) */
export interface GatewayRoutine {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    type: string;
    daysOfWeek: number[];
    hour: number;
    minute: number;
    timezone: string;
  };
  prompt: string;
  priority: number;
  requiredSkills: string[];
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Config constants ─────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  'inbox': { label: 'Inbox', color: '#697177', bgColor: 'rgba(105, 113, 119, 0.1)' },
  'assigned': { label: 'Assigned', color: '#ffb224', bgColor: 'rgba(255, 178, 36, 0.1)' },
  'in-progress': { label: 'In Progress', color: '#3e63dd', bgColor: 'rgba(62, 99, 221, 0.1)' },
  'review': { label: 'Review', color: '#8e4ec6', bgColor: 'rgba(142, 78, 198, 0.1)' },
  'waiting': { label: 'Waiting', color: '#ffb224', bgColor: 'rgba(255, 178, 36, 0.1)' },
  'done': { label: 'Done', color: '#46a758', bgColor: 'rgba(70, 167, 88, 0.1)' },
};

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  0: { label: 'Urgent', color: '#e54d2e', bgColor: 'rgba(229, 77, 46, 0.1)' },
  1: { label: 'High', color: '#ffb224', bgColor: 'rgba(255, 178, 36, 0.1)' },
  2: { label: 'Normal', color: '#697177', bgColor: 'rgba(105, 113, 119, 0.1)' },
};

export const LANE_ORDER: TaskStatus[] = ['in-progress', 'review', 'assigned', 'waiting', 'inbox', 'done'];

// ── Mapping helpers ──────────────────────────────────────────────────

/** Map cluster lane to dashboard TaskStatus */
export function mapClusterLane(lane: string): TaskStatus {
  const mapping: Record<string, TaskStatus> = {
    'inbox': 'inbox',
    'assigned': 'assigned',
    'in_progress': 'in-progress',
    'review': 'review',
    'done': 'done',
  };
  return mapping[lane] || 'inbox';
}

/** Map cluster priority (1-10) to dashboard Priority (0-2) */
export function mapClusterPriority(priority: number): Priority {
  if (priority >= 8) return 0; // Urgent
  if (priority >= 5) return 1; // High
  return 2; // Normal
}

/** Convert a ClusterTask to a dashboard Task */
export function clusterTaskToTask(ct: ClusterTask, workers: ClusterWorker[]): Task {
  const assignee = ct.assignedWorker || ct.assignees?.[0];
  return {
    id: ct.id,
    title: ct.prompt?.slice(0, 120) || 'Untitled',
    description: ct.prompt || '',
    status: mapClusterLane(ct.lane),
    priority: mapClusterPriority(ct.priority),
    assigneeId: assignee || undefined,
    tags: ct.labels || [],
    createdAt: new Date(ct.createdAt).getTime(),
    updatedAt: ct.completedAt ? new Date(ct.completedAt).getTime() : undefined,
    checklist: ct.checklist as (ChecklistItem | ClusterChecklistItem)[],
    comments: ct.comments as (Comment | TaskComment)[],
    deliverables: ct.deliverables,
    assignees: ct.assignees,
    labels: ct.labels,
    lane: ct.lane,
  };
}

/** Convert a ClusterWorker to a dashboard Agent */
export function clusterWorkerToAgent(cw: ClusterWorker): Agent {
  const name = cw.name || cw.id || 'Unknown';
  return {
    id: cw.id,
    name,
    letter: name.charAt(0).toUpperCase(),
    color: workerColor(cw.provider),
    role: `${cw.provider || 'unknown'}/${cw.model || 'unknown'}`,
    status: cw.status === 'busy' ? 'working' : cw.status === 'offline' ? 'offline' : 'idle',
    badge: cw.tier === 1 ? 'lead' : cw.tier === 2 ? 'spc' : undefined,
  };
}

function workerColor(provider: string): string {
  const colors: Record<string, string> = {
    claude: '#e879a4',
    openai: '#46a758',
    deepseek: '#3e63dd',
    groq: '#ffb224',
    cerebras: '#8e4ec6',
    ollama: '#00a2c7',
  };
  return colors[provider] || '#697177';
}

/** Convert Activity to FeedItem */
export function activityToFeedItem(a: Activity): FeedItem {
  const severityMap: Record<string, FeedItem['severity']> = {
    'task:completed': 'success',
    'task:failed': 'error',
    'worker:offline': 'warning',
    'task:cancelled': 'warning',
  };
  return {
    id: a.id,
    type: a.type.startsWith('worker') ? 'status' : 'task',
    severity: severityMap[a.type] || 'info',
    title: a.summary,
    agentId: a.workerId || undefined,
    timestamp: new Date(a.createdAt).getTime(),
  };
}

// ── V2 Types (DB-backed task detail, notifications, chat, routines) ──

export interface ChecklistItem {
  id: number;
  taskId: string;
  label: string;
  checked: boolean;
  sortOrder: number;
}

export interface TaskComment {
  id: number;
  taskId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface TaskDeliverable {
  id: number;
  taskId: string;
  label: string;
  url: string;
  type: string;
}

export interface TaskDetail extends Omit<Task, 'checklist' | 'comments' | 'deliverables'> {
  parentId?: string;
  sortOrder: number;
  deletedAt?: number;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  deliverables: TaskDeliverable[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  tags?: string[];
  parentId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  tags?: string[];
  parentId?: string | null;
  sortOrder?: number;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: number;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface RoutineSchedule {
  days: number[];        // 0=Sun, 1=Mon, ..., 6=Sat
  time: string;          // "HH:MM" in 24h format
  timezone: string;      // IANA timezone, e.g. "America/New_York"
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  agentId?: string;
  schedule: RoutineSchedule;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  taskTemplate: CreateTaskInput;
  createdAt: number;
  updatedAt: number;
}

// ── WebSocket Event Types ────────────────────────────────────────────

export type WsEventType =
  | 'connected'
  | 'heartbeat'
  | 'task:created'
  | 'task:updated'
  | 'task:moved'
  | 'task:deleted'
  | 'agent:status'
  | 'feed:new'
  | 'notification:new'
  | 'chat:start'
  | 'chat:chunk'
  | 'chat:done';

export interface WsEvent<T = unknown> {
  seq: number;
  type: WsEventType;
  payload: T;
  timestamp: number;
}
