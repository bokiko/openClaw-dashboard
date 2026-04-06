import { query, transaction } from '@/lib/db';
import type {
  Agent, Task, FeedItem, TaskStatus, Priority, TokenStats,
  TaskDetail, ChecklistItem, TaskComment, TaskDeliverable,
  CreateTaskInput, UpdateTaskInput,
} from '@/types';

// ── Task CRUD ────────────────────────────────────────────────────────

export async function loadTasksFromDb(opts?: {
  status?: TaskStatus;
  assignee?: string;
  limit?: number;
  offset?: number;
}): Promise<Task[]> {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(opts.status);
  }
  if (opts?.assignee) {
    conditions.push(`assignee_id = $${idx++}`);
    params.push(opts.assignee);
  }

  const where = conditions.join(' AND ');
  const limit = opts?.limit ?? 500;
  const offset = opts?.offset ?? 0;

  const result = await query<{
    id: string; title: string; description: string; status: string;
    priority: number; assignee_id: string | null; tags: string[];
    parent_id: string | null; sort_order: number;
    created_at: Date; updated_at: Date;
  }>(
    `SELECT id, title, description, status, priority, assignee_id, tags,
            parent_id, sort_order, created_at, updated_at
     FROM dashboard_tasks
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset],
  );

  return result.rows.map(rowToTask);
}

function rowToTask(r: {
  id: string; title: string; description: string; status: string;
  priority: number; assignee_id: string | null; tags: string[];
  parent_id?: string | null; sort_order?: number;
  created_at: Date; updated_at: Date;
}): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status as TaskStatus,
    priority: r.priority as Priority,
    assigneeId: r.assignee_id ?? undefined,
    tags: r.tags || [],
    createdAt: r.created_at.getTime(),
    updatedAt: r.updated_at.getTime(),
  };
}

export async function getTaskDetailFromDb(id: string): Promise<TaskDetail | null> {
  const taskResult = await query<{
    id: string; title: string; description: string; status: string;
    priority: number; assignee_id: string | null; tags: string[];
    parent_id: string | null; sort_order: number;
    created_at: Date; updated_at: Date; deleted_at: Date | null;
  }>(
    `SELECT * FROM dashboard_tasks WHERE id = $1`,
    [id],
  );

  if (taskResult.rows.length === 0) return null;
  const r = taskResult.rows[0];

  const [checklistRes, commentsRes, deliverablesRes] = await Promise.all([
    query<{ id: number; task_id: string; label: string; checked: boolean; sort_order: number }>(
      `SELECT id, task_id, label, checked, sort_order FROM task_checklist WHERE task_id = $1 ORDER BY sort_order`,
      [id],
    ),
    query<{ id: number; task_id: string; author: string; content: string; created_at: Date }>(
      `SELECT id, task_id, author, content, created_at FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC`,
      [id],
    ),
    query<{ id: number; task_id: string; label: string; url: string; type: string }>(
      `SELECT id, task_id, label, url, type FROM task_deliverables WHERE task_id = $1`,
      [id],
    ),
  ]);

  return {
    ...rowToTask(r),
    parentId: r.parent_id ?? undefined,
    sortOrder: r.sort_order,
    deletedAt: r.deleted_at?.getTime(),
    checklist: checklistRes.rows.map(c => ({
      id: c.id, taskId: c.task_id, label: c.label,
      checked: c.checked, sortOrder: c.sort_order,
    })),
    comments: commentsRes.rows.map(c => ({
      id: c.id, taskId: c.task_id, author: c.author,
      content: c.content, createdAt: c.created_at.getTime(),
    })),
    deliverables: deliverablesRes.rows.map(d => ({
      id: d.id, taskId: d.task_id, label: d.label,
      url: d.url, type: d.type,
    })),
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const id = crypto.randomUUID();
  const result = await query<{
    id: string; title: string; description: string; status: string;
    priority: number; assignee_id: string | null; tags: string[];
    parent_id: string | null; sort_order: number;
    created_at: Date; updated_at: Date;
  }>(
    `INSERT INTO dashboard_tasks (id, title, description, status, priority, assignee_id, tags, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, description, status, priority, assignee_id, tags,
               parent_id, sort_order, created_at, updated_at`,
    [
      id,
      input.title,
      input.description ?? '',
      input.status ?? 'inbox',
      input.priority ?? 2,
      input.assigneeId ?? null,
      input.tags ?? [],
      input.parentId ?? null,
    ],
  );

  return rowToTask(result.rows[0]);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined) { sets.push(`title = $${idx++}`); params.push(input.title); }
  if (input.description !== undefined) { sets.push(`description = $${idx++}`); params.push(input.description); }
  if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
  if (input.priority !== undefined) { sets.push(`priority = $${idx++}`); params.push(input.priority); }
  if (input.assigneeId !== undefined) { sets.push(`assignee_id = $${idx++}`); params.push(input.assigneeId); }
  if (input.tags !== undefined) { sets.push(`tags = $${idx++}`); params.push(input.tags); }
  if (input.parentId !== undefined) { sets.push(`parent_id = $${idx++}`); params.push(input.parentId); }
  if (input.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(input.sortOrder); }

  if (sets.length === 1) return null; // only updated_at, nothing to change

  const result = await query<{
    id: string; title: string; description: string; status: string;
    priority: number; assignee_id: string | null; tags: string[];
    parent_id: string | null; sort_order: number;
    created_at: Date; updated_at: Date;
  }>(
    `UPDATE dashboard_tasks SET ${sets.join(', ')}
     WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING id, title, description, status, priority, assignee_id, tags,
               parent_id, sort_order, created_at, updated_at`,
    [...params, id],
  );

  return result.rows.length > 0 ? rowToTask(result.rows[0]) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const result = await query(
    `UPDATE dashboard_tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}

// ── Agents ──────────────────────────────────────────────────────────

export async function getAgentsFromDb(tasks?: Task[]): Promise<Agent[]> {
  const result = await query<{
    id: string; name: string; letter: string; color: string;
    role: string; badge: string | null; status: string;
  }>(
    `SELECT id, name, letter, color, role, badge, status FROM dashboard_agents ORDER BY name`,
  );

  if (result.rows.length > 0) {
    // Use persisted agents, overlay task-derived status
    const inProgressIds = new Set(
      (tasks ?? []).filter(t => t.status === 'in-progress').map(t => t.assigneeId).filter(Boolean),
    );
    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      letter: r.letter,
      color: r.color,
      role: r.role,
      badge: r.badge as Agent['badge'],
      status: inProgressIds.has(r.id) ? 'working' as const : r.status as Agent['status'],
    }));
  }

  // Auto-discover from tasks (same as file-mode logic)
  return discoverAgentsFromTasksDb(tasks ?? []);
}

const AGENT_PALETTE = [
  '#46a758', '#3e63dd', '#8e4ec6', '#ffb224', '#e879a4',
  '#00a2c7', '#e54d2e', '#f76b15', '#697177', '#30a46c',
];

function discoverAgentsFromTasksDb(tasks: Task[]): Agent[] {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.assigneeId) ids.add(task.assigneeId);
  }

  const inProgressIds = new Set(
    tasks.filter(t => t.status === 'in-progress').map(t => t.assigneeId).filter(Boolean),
  );

  let i = 0;
  const agents: Agent[] = [];
  for (const id of ids) {
    agents.push({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      letter: id.charAt(0).toUpperCase(),
      color: AGENT_PALETTE[i % AGENT_PALETTE.length],
      role: 'Agent',
      status: inProgressIds.has(id) ? 'working' : 'idle',
    });
    i++;
  }
  return agents;
}

// ── Feed ────────────────────────────────────────────────────────────

export async function generateFeedFromDb(limit = 15): Promise<FeedItem[]> {
  const result = await query<{
    id: string; event_type: string; entity_type: string; entity_id: string | null;
    agent_id: string | null; payload: Record<string, unknown>; created_at: Date;
  }>(
    `SELECT id::text, event_type, entity_type, entity_id, agent_id, payload, created_at
     FROM activity_log ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );

  return result.rows.map(r => ({
    id: r.id,
    type: mapEventToFeedType(r.event_type),
    severity: mapEventToSeverity(r.event_type),
    title: (r.payload.title as string) || r.event_type,
    agentId: r.agent_id ?? undefined,
    timestamp: r.created_at.getTime(),
  }));
}

function mapEventToFeedType(event: string): FeedItem['type'] {
  if (event.startsWith('task:')) return 'task';
  if (event.startsWith('agent:')) return 'status';
  if (event === 'comment') return 'comment';
  return 'decision';
}

function mapEventToSeverity(event: string): FeedItem['severity'] {
  if (event === 'task:completed' || event === 'task:created') return 'success';
  if (event.includes('error') || event.includes('fail')) return 'error';
  if (event.includes('warn')) return 'warning';
  return 'info';
}

// ── Stats ───────────────────────────────────────────────────────────

export async function getStatsFromDb(): Promise<{
  total: number; done: number; inProgress: number; review: number;
  assigned: number; inbox: number; waiting: number;
}> {
  const result = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text as count FROM dashboard_tasks WHERE deleted_at IS NULL GROUP BY status`,
  );

  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.status] = parseInt(row.count, 10);
  }

  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    done: counts['done'] ?? 0,
    inProgress: counts['in-progress'] ?? 0,
    review: counts['review'] ?? 0,
    assigned: counts['assigned'] ?? 0,
    inbox: counts['inbox'] ?? 0,
    waiting: counts['waiting'] ?? 0,
  };
}

export async function getTokenStatsFromDb(): Promise<TokenStats | null> {
  // Use the existing token_usage table from 001 migration
  const result = await query<{
    total_input: string; total_output: string;
  }>(`SELECT COALESCE(SUM(input_tokens), 0)::text as total_input,
             COALESCE(SUM(output_tokens), 0)::text as total_output
      FROM token_usage`);

  const totalInput = parseInt(result.rows[0].total_input, 10);
  const totalOutput = parseInt(result.rows[0].total_output, 10);
  if (totalInput === 0 && totalOutput === 0) return null;

  // By model
  const byModelRes = await query<{ model: string; input: string; output: string }>(
    `SELECT COALESCE(model, 'unknown') as model,
            SUM(input_tokens)::text as input,
            SUM(output_tokens)::text as output
     FROM token_usage GROUP BY model`,
  );

  // By date
  const byDateRes = await query<{ date: string; input: string; output: string }>(
    `SELECT created_at::date::text as date,
            SUM(input_tokens)::text as input,
            SUM(output_tokens)::text as output
     FROM token_usage GROUP BY created_at::date ORDER BY date`,
  );

  // By session (as proxy for agent)
  const byAgentRes = await query<{ agent: string; input: string; output: string }>(
    `SELECT COALESCE(session_id, 'unknown') as agent,
            SUM(input_tokens)::text as input,
            SUM(output_tokens)::text as output
     FROM token_usage GROUP BY session_id`,
  );

  const tokensByAgent: Record<string, { input: number; output: number }> = {};
  for (const row of byAgentRes.rows) {
    tokensByAgent[row.agent] = { input: parseInt(row.input, 10), output: parseInt(row.output, 10) };
  }

  return {
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    tokensByAgent,
    tokensByModel: byModelRes.rows.map(r => ({
      model: r.model, input: parseInt(r.input, 10), output: parseInt(r.output, 10),
    })),
    dailyTokens: byDateRes.rows.map(r => ({
      date: r.date, input: parseInt(r.input, 10), output: parseInt(r.output, 10),
    })),
  };
}

// ── Checklist CRUD ──────────────────────────────────────────────────

export async function addChecklistItem(taskId: string, label: string, sortOrder = 0): Promise<ChecklistItem> {
  const result = await query<{ id: number; task_id: string; label: string; checked: boolean; sort_order: number }>(
    `INSERT INTO task_checklist (task_id, label, sort_order)
     VALUES ($1, $2, $3) RETURNING id, task_id, label, checked, sort_order`,
    [taskId, label, sortOrder],
  );
  const r = result.rows[0];
  return { id: r.id, taskId: r.task_id, label: r.label, checked: r.checked, sortOrder: r.sort_order };
}

export async function updateChecklistItem(id: number, taskId: string, updates: { label?: string; checked?: boolean }): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.label !== undefined) { sets.push(`label = $${idx++}`); params.push(updates.label); }
  if (updates.checked !== undefined) { sets.push(`checked = $${idx++}`); params.push(updates.checked); }
  if (sets.length === 0) return false;
  // Scope update to the owning task to prevent cross-task IDOR
  const result = await query(`UPDATE task_checklist SET ${sets.join(', ')} WHERE id = $${idx++} AND task_id = $${idx}`, [...params, id, taskId]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteChecklistItem(id: number, taskId: string): Promise<boolean> {
  // Scope delete to the owning task to prevent cross-task IDOR
  const result = await query(`DELETE FROM task_checklist WHERE id = $1 AND task_id = $2`, [id, taskId]);
  return (result.rowCount ?? 0) > 0;
}

// ── Comments CRUD ───────────────────────────────────────────────────

export async function addComment(taskId: string, content: string, author = 'operator'): Promise<TaskComment> {
  const result = await query<{ id: number; task_id: string; author: string; content: string; created_at: Date }>(
    `INSERT INTO task_comments (task_id, author, content)
     VALUES ($1, $2, $3) RETURNING id, task_id, author, content, created_at`,
    [taskId, author, content],
  );
  const r = result.rows[0];
  return { id: r.id, taskId: r.task_id, author: r.author, content: r.content, createdAt: r.created_at.getTime() };
}

export async function getComments(taskId: string): Promise<TaskComment[]> {
  const result = await query<{ id: number; task_id: string; author: string; content: string; created_at: Date }>(
    `SELECT id, task_id, author, content, created_at FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC`,
    [taskId],
  );
  return result.rows.map(r => ({
    id: r.id, taskId: r.task_id, author: r.author, content: r.content, createdAt: r.created_at.getTime(),
  }));
}
