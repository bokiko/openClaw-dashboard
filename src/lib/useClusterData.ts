'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent, Task, FeedItem, DashboardData, ClusterTask, ClusterWorker, Activity } from '@/types';
import { clusterTaskToTask, clusterWorkerToAgent, activityToFeedItem } from '@/types';

interface UseClusterDataReturn {
  agents: Agent[];
  tasks: Task[];
  feed: FeedItem[];
  stats: DashboardData['stats'] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  // Raw cluster data for advanced usage
  clusterTasks: ClusterTask[];
  clusterWorkers: ClusterWorker[];
}

const REFRESH_INTERVAL = 30000; // 30 seconds (replaced by WebSocket in Phase 3)

export function useClusterData(): UseClusterDataReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cluster/dashboard', { cache: 'no-store' });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cluster data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh (until Phase 3 WebSocket replaces this)
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Optimistic task update (local only)
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } as ClusterTask : t
        ),
      };
    });
  }, []);

  // Convert cluster data to dashboard format
  const workers = data?.workers || [];
  const tasks = (data?.tasks || []).map(ct => clusterTaskToTask(ct, workers));
  const agents = workers.map(clusterWorkerToAgent);
  const feed = (data?.activity || []).map(activityToFeedItem);

  return {
    agents,
    tasks,
    feed,
    stats: data?.stats || null,
    loading,
    error,
    refresh: fetchData,
    lastUpdated: data?.timestamp || null,
    updateTask,
    clusterTasks: data?.tasks || [],
    clusterWorkers: workers,
  };
}
