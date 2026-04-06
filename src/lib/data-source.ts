import { isDbAvailable } from '@/lib/db';
import type { Agent, Task, FeedItem, TokenStats } from '@/types';

export type DataSource = 'db' | 'file';

export function getDataSource(): DataSource {
  return isDbAvailable() ? 'db' : 'file';
}

export async function loadTasksUnified(): Promise<Task[]> {
  if (getDataSource() === 'db') {
    const { loadTasksFromDb } = await import('@/lib/db-data');
    const { tasks } = await loadTasksFromDb();
    return tasks;
  }
  const { loadTasks } = await import('@/lib/data');
  return loadTasks();
}

export async function getAgentsUnified(tasks?: Task[]): Promise<Agent[]> {
  if (getDataSource() === 'db') {
    const { getAgentsFromDb } = await import('@/lib/db-data');
    return getAgentsFromDb(tasks);
  }
  const { getAgents } = await import('@/lib/data');
  return getAgents(tasks);
}

export async function generateFeedUnified(tasks?: Task[]): Promise<FeedItem[]> {
  if (getDataSource() === 'db') {
    const { generateFeedFromDb } = await import('@/lib/db-data');
    return generateFeedFromDb();
  }
  const { generateFeed } = await import('@/lib/data');
  return generateFeed(tasks ?? []);
}

export async function getStatsUnified(tasks?: Task[]): Promise<{
  total: number; done: number; inProgress: number; review: number;
  assigned: number; inbox: number; waiting: number;
}> {
  if (getDataSource() === 'db') {
    const { getStatsFromDb } = await import('@/lib/db-data');
    return getStatsFromDb();
  }
  const { getStats } = await import('@/lib/data');
  return getStats(tasks ?? []);
}

export async function getTokenStatsUnified(tasks?: Task[]): Promise<TokenStats | null> {
  if (getDataSource() === 'db') {
    const { getTokenStatsFromDb } = await import('@/lib/db-data');
    return getTokenStatsFromDb();
  }
  const { getTokenStats } = await import('@/lib/data');
  return getTokenStats(tasks ?? []);
}
