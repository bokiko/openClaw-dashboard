import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Agent, Task } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a human-readable relative time string.
 * Accepts epoch milliseconds (number), an ISO 8601 string, or undefined.
 * When called with undefined, returns 'Never'.
 */
export function timeAgo(input: number | string | undefined): string {
  if (input === undefined || input === null) return 'Never';
  const epochMs = typeof input === 'string' ? new Date(input).getTime() : input;
  if (isNaN(epochMs)) return 'Never';
  const diff = Math.max(0, Date.now() - epochMs);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatUTC(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins} UTC`;
}

// ── Agent Discovery ──────────────────────────────────────────────────

export function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#697177';
}

const AGENT_PALETTE = [
  '#46a758', '#3e63dd', '#8e4ec6', '#ffb224', '#e879a4',
  '#00a2c7', '#e54d2e', '#f76b15', '#697177', '#30a46c',
];

export function discoverAgentsFromTasks(tasks: Task[]): Agent[] {
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
      color: sanitizeColor(AGENT_PALETTE[i % AGENT_PALETTE.length]),
      role: 'Agent',
      status: inProgressIds.has(id) ? 'working' : 'idle',
    });
    i++;
  }
  return agents;
}
