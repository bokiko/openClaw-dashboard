import { isDbAvailable } from '@/lib/db';
import type { Agent, Task, FeedItem, TokenStats } from '@/types';

export type DataSource = 'db' | 'file';

export function getDataSource(): DataSource {
  return isDbAvailable() ? 'db' : 'file';
}

// ── Lazy import singletons (PERF-002) ────────────────────────────────────────
// Cache the module reference after the first dynamic import so subsequent calls
// pay only the cost of a property access rather than a promise + cache lookup.
// The dynamic import boundary is preserved (prevents circular-dependency issues
// described in CLAUDE.md).

let _dbData: typeof import('@/lib/db-data') | null = null;
let _fileData: typeof import('@/lib/data') | null = null;

async function getDbData() {
  return (_dbData ??= await import('@/lib/db-data'));
}

async function getFileData() {
  return (_fileData ??= await import('@/lib/data'));
}

// ── Unified wrappers ─────────────────────────────────────────────────────────
// ARCH-002: Each wrapper catches DB errors and falls back to file mode so that
// setting DATABASE_URL while the DB is actually unreachable returns degraded
// results instead of 500 errors.

export async function loadTasksUnified(): Promise<Task[]> {
  if (getDataSource() === 'db') {
    try {
      const { loadTasksFromDb } = await getDbData();
      return await loadTasksFromDb();
    } catch {
      // DB unavailable — degrade to file mode
    }
  }
  const { loadTasks } = await getFileData();
  return loadTasks();
}

export async function getAgentsUnified(tasks?: Task[]): Promise<Agent[]> {
  if (getDataSource() === 'db') {
    try {
      const { getAgentsFromDb } = await getDbData();
      return await getAgentsFromDb(tasks);
    } catch {
      // DB unavailable — degrade to file mode
    }
  }
  const { getAgents } = await getFileData();
  return getAgents(tasks);
}

export async function generateFeedUnified(tasks?: Task[]): Promise<FeedItem[]> {
  if (getDataSource() === 'db') {
    try {
      const { generateFeedFromDb } = await getDbData();
      return await generateFeedFromDb();
    } catch {
      // DB unavailable — degrade to file mode
    }
  }
  const { generateFeed } = await getFileData();
  return generateFeed(tasks ?? []);
}

export async function getStatsUnified(tasks?: Task[]): Promise<{
  total: number; done: number; inProgress: number; review: number;
  assigned: number; inbox: number; waiting: number;
}> {
  if (getDataSource() === 'db') {
    try {
      const { getStatsFromDb } = await getDbData();
      return await getStatsFromDb();
    } catch {
      // DB unavailable — degrade to file mode
    }
  }
  const { getStats } = await getFileData();
  return getStats(tasks ?? []);
}

export async function getTokenStatsUnified(tasks?: Task[]): Promise<TokenStats | null> {
  if (getDataSource() === 'db') {
    try {
      const { getTokenStatsFromDb } = await getDbData();
      return await getTokenStatsFromDb();
    } catch {
      // DB unavailable — degrade to file mode
    }
  }
  const { getTokenStats } = await getFileData();
  return getTokenStats(tasks ?? []);
}
