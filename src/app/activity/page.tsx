'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ActivityStats from '@/components/activity/ActivityStats';
import AgentFilterBar, { type TimeRange, type ItemType, type ItemStatus } from '@/components/activity/AgentFilterBar';
import ActivityTimeline from '@/components/activity/ActivityTimeline';
import AgentDetailCard from '@/components/activity/AgentDetailCard';
import { useClusterState } from '@/lib/useClusterState';
import { useTheme } from '@/lib/useTheme';
import { buildWorkItems } from '@/lib/activity-mappers';
import type { DashboardData } from '@/types';

function ActivityContent() {
  const {
    agents, tasks, feed, notifications, stats, loading, error, lastUpdated, connected, refresh,
    clusterWorkers, clusterTasks, dataSource, spawnedSessions, cronJobs, cronRuns,
    markNotificationRead, deleteNotification, clearAllNotifications,
  } = useClusterState();
  const { toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [itemType, setItemType] = useState<ItemType>('all');
  const [itemStatus, setItemStatus] = useState<ItemStatus>('all');

  useEffect(() => { setMounted(true); }, []);

  // Build work items from dashboard data
  const allItems = useMemo(() => {
    // Reconstruct a partial DashboardData for the mapper
    const dashData: DashboardData = {
      tasks: clusterTasks,
      tasksByLane: {},
      workers: clusterWorkers,
      activity: [],
      stats: stats || { tasks: { total: 0, pending: 0, assigned: 0, running: 0, completed: 0, failed: 0, queueDepth: 0 }, workers: { total: 0, idle: 0, busy: 0, offline: 0 }, uptime: 0 },
      timestamp: Date.now(),
      dataSource: dataSource ?? undefined,
      spawnedSessions,
      cronJobs,
      cronRuns,
    };
    return buildWorkItems(dashData);
  }, [clusterTasks, clusterWorkers, stats, dataSource, spawnedSessions, cronJobs, cronRuns]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Agent filter
    if (selectedAgentId) {
      items = items.filter(i => i.agentId === selectedAgentId);
    }

    // Time range filter
    const now = Date.now();
    const cutoffs: Record<TimeRange, number> = {
      today: new Date().setHours(0, 0, 0, 0),
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
    };
    const cutoff = cutoffs[timeRange];
    items = items.filter(i => i.timestamp >= cutoff);

    // Type filter
    if (itemType !== 'all') {
      items = items.filter(i => i.type === itemType);
    }

    // Status filter
    if (itemStatus !== 'all') {
      items = items.filter(i => i.status === itemStatus);
    }

    return items;
  }, [allItems, selectedAgentId, timeRange, itemType, itemStatus]);

  const hasFilters = selectedAgentId !== null || timeRange !== 'today' || itemType !== 'all' || itemStatus !== 'all';

  const handleCommand = useCallback((action: string) => {
    switch (action) {
      case 'goto-dashboard':
        router.push('/');
        break;
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'refresh':
        window.location.reload();
        break;
      default:
        console.log('Command:', action);
    }
  }, [router, toggleTheme]);

  const activeAgents = agents.filter(a => a.status === 'working').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;

  if (!mounted) return null;

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
          <div className="h-12 w-48 bg-muted rounded-xl animate-pulse mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-red-500 mb-2 font-medium">Failed to load data</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandPalette onAction={handleCommand} />

      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
        <Header
          activeAgents={activeAgents}
          totalAgents={agents.length}
          totalTasks={tasks.length}
          inProgressTasks={inProgressTasks}
          feedOpen={feedOpen}
          onFeedToggle={() => setFeedOpen(prev => !prev)}
          unreadNotifications={unreadNotifications}
          notificationsOpen={notificationsOpen}
          onNotificationsToggle={() => setNotificationsOpen(prev => !prev)}
          currentView="activity"
        />

        <ErrorBoundary>
          <ActivityStats items={allItems} />
        </ErrorBoundary>

        <ErrorBoundary>
          <AgentFilterBar
            agents={agents}
            selectedAgentId={selectedAgentId}
            onAgentSelect={setSelectedAgentId}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            itemType={itemType}
            onItemTypeChange={setItemType}
            itemStatus={itemStatus}
            onItemStatusChange={setItemStatus}
          />
        </ErrorBoundary>

        {selectedAgent && (
          <ErrorBoundary>
            <AgentDetailCard
              agent={selectedAgent}
              items={allItems.filter(i => i.agentId === selectedAgent.id)}
              cronJobs={cronJobs}
            />
          </ErrorBoundary>
        )}

        <ErrorBoundary>
          <ActivityTimeline items={filteredItems} agents={agents} hasFilters={hasFilters} />
        </ErrorBoundary>

        {/* Connection indicator */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground/50">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span>{connected ? 'Live' : 'Reconnecting...'}</span>
          {lastUpdated && (
            <span>| {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return <ActivityContent />;
}
