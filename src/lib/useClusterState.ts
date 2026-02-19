'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import type { Agent, Task, FeedItem, DashboardData, ClusterTask, ClusterWorker } from '@/types';
import { clusterTaskToTask, clusterWorkerToAgent, activityToFeedItem } from '@/types';
import type { Notification } from '@/types';

interface ClusterState {
  tasks: ClusterTask[];
  workers: ClusterWorker[];
  feed: FeedItem[];
  notifications: Notification[];
  stats: DashboardData['stats'] | null;
  timestamp: number | null;
  refreshInterval: number;
  dataSource: 'gateway' | 'db' | null;
}

type ClusterAction =
  | { type: 'SET_DATA'; payload: DashboardData }
  | { type: 'TASK_CREATED'; task: ClusterTask }
  | { type: 'TASK_UPDATED'; task: ClusterTask }
  | { type: 'TASK_DELETED'; task: ClusterTask }
  | { type: 'TASK_GENERIC'; task: ClusterTask }
  | { type: 'WORKER_UPDATE'; worker: ClusterWorker }
  | { type: 'ACTIVITY'; item: FeedItem }
  | { type: 'STATS_UPDATE'; stats: DashboardData['stats'] }
  | { type: 'NOTIFICATION'; notification: Notification }
  | { type: 'SET_NOTIFICATIONS'; notifications: Notification[] }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'DELETE_NOTIFICATION'; id: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

function clusterReducer(state: ClusterState, action: ClusterAction): ClusterState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        tasks: action.payload.tasks,
        workers: action.payload.workers,
        feed: (action.payload.activity || []).map(activityToFeedItem),
        notifications: state.notifications, // preserved across refresh
        stats: action.payload.stats,
        timestamp: action.payload.timestamp,
        refreshInterval: action.payload.refreshInterval ?? state.refreshInterval,
        dataSource: action.payload.dataSource ?? state.dataSource,
      };

    case 'TASK_CREATED':
      return {
        ...state,
        tasks: [action.task, ...state.tasks],
      };

    case 'TASK_UPDATED':
    case 'TASK_GENERIC':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.task.id ? action.task : t),
      };

    case 'TASK_DELETED':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.task.id),
      };

    case 'WORKER_UPDATE':
      return {
        ...state,
        workers: state.workers.some(w => w.id === action.worker.id)
          ? state.workers.map(w => w.id === action.worker.id ? action.worker : w)
          : [...state.workers, action.worker],
      };

    case 'ACTIVITY':
      return {
        ...state,
        feed: [action.item, ...state.feed.slice(0, 49)],
      };

    case 'STATS_UPDATE':
      return { ...state, stats: action.stats };

    case 'NOTIFICATION':
      return {
        ...state,
        notifications: [action.notification, ...state.notifications.slice(0, 99)],
      };

    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.notifications };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          String(n.id) === action.id ? { ...n, read: true } : n
        ),
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => String(n.id) !== action.id),
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    default:
      return state;
  }
}

/**
 * Combined state: HTTP initial load + WebSocket live patches.
 * This is the primary data hook for the dashboard.
 */
export function useClusterState() {
  const [state, dispatch] = useReducer(clusterReducer, {
    tasks: [],
    workers: [],
    feed: [],
    notifications: [],
    stats: null,
    timestamp: null,
    refreshInterval: 30000,
    dataSource: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial HTTP load
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/gateway/dashboard', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      dispatch({ type: 'SET_DATA', payload: data });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Notifications: gateway has no notifications concept — synthesize from cron failures in dashboard data
  const fetchNotifications = useCallback(async () => {
    // No-op: notifications are synthesized from cron run failures in the dashboard route
  }, []);

  useEffect(() => {
    fetchData();
    fetchNotifications();
  }, [fetchData, fetchNotifications]);

  // Periodic polling based on settings.refreshInterval
  useEffect(() => {
    if (loading) return;
    const id = setInterval(fetchData, state.refreshInterval);
    return () => clearInterval(id);
  }, [loading, state.refreshInterval, fetchData]);

  // WebSocket event handler
  const handleWsEvent = useCallback((event: { event: string; data: unknown }) => {
    const { event: type, data } = event;

    if (type === 'needs_refresh') {
      fetchData();
      return;
    }

    if (type === 'task:created') {
      dispatch({ type: 'TASK_CREATED', task: data as ClusterTask });
    } else if (type === 'task:updated' || type === 'task:lane_changed' || type === 'task:assigned' ||
               type === 'task:started' || type === 'task:completed' || type === 'task:failed' ||
               type === 'task:assignees_changed' || type === 'task:comment_added' ||
               type === 'task:checklist_toggled' || type === 'task:deliverable_added') {
      // Many events contain the task directly or nested
      const task = (data as { task?: ClusterTask })?.task || data as ClusterTask;
      if (task?.id) {
        dispatch({ type: 'TASK_GENERIC', task });
      }
    } else if (type === 'task:deleted') {
      const task = (data as { task?: ClusterTask })?.task || data as ClusterTask;
      if (task?.id) {
        dispatch({ type: 'TASK_DELETED', task });
      }
    } else if (type.startsWith('worker:')) {
      dispatch({ type: 'WORKER_UPDATE', worker: data as ClusterWorker });
    } else if (type === 'activity') {
      dispatch({ type: 'ACTIVITY', item: activityToFeedItem(data as Parameters<typeof activityToFeedItem>[0]) });
    } else if (type === 'notification') {
      dispatch({ type: 'NOTIFICATION', notification: data as Notification });
    }
  }, [fetchData]);

  // Gateway mode is HTTP-only (no browser WebSocket needed)
  const connected = !error;

  // Notification actions (optimistic + server sync)
  const markNotificationRead = useCallback(async (id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', id });
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch { /* optimistic — ignore failures */ }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_NOTIFICATION', id });
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch { /* optimistic */ }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
    } catch { /* optimistic */ }
  }, []);

  // Convert to dashboard format
  const tasks: Task[] = state.tasks.map(ct => clusterTaskToTask(ct, state.workers));
  const agents: Agent[] = state.workers.map(clusterWorkerToAgent);

  return {
    agents,
    tasks,
    feed: state.feed,
    notifications: state.notifications,
    stats: state.stats,
    loading,
    error,
    connected,
    refresh: fetchData,
    lastUpdated: state.timestamp,
    clusterTasks: state.tasks,
    clusterWorkers: state.workers,
    dataSource: state.dataSource,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
  };
}
