'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import AgentStrip from '@/components/AgentStrip';
import MissionQueue from '@/components/MissionQueue';
import LiveFeed from '@/components/LiveFeed';
import NotificationPanel from '@/components/NotificationPanel';
import TaskEditModal from '@/components/TaskEditModal';
import TaskCreateModal from '@/components/TaskCreateModal';
import AgentModal from '@/components/AgentModal';
import { MetricsPanel } from '@/components/MetricsPanel';
import RoutineManager from '@/components/RoutineManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CommandPalette } from '@/components/CommandPalette';
import WelcomeScreen from '@/components/WelcomeScreen';
import NotificationBell from '@/components/NotificationBell';
import ChatPanel from '@/components/ChatPanel';
import { AgentStripSkeleton } from '@/components/skeletons/AgentStripSkeleton';
import { TaskCardSkeleton } from '@/components/skeletons/TaskCardSkeleton';
import { MetricsSkeleton } from '@/components/skeletons/MetricsSkeleton';
import { toast } from 'sonner';
import { useClusterState } from '@/lib/useClusterState';
import type { TaskStatus } from '@/types';
import { STATUS_CONFIG } from '@/types';

// ── Page Component ──────────────────────────────────────────────────────

function DashboardContent() {
  const {
    agents, tasks, feed, notifications, stats, loading, error, lastUpdated, connected,
    clusterWorkers, markNotificationRead, deleteNotification, clearAllNotifications,
  } = useClusterState();

  /** Task lanes are read-only from gateway — drag-drop shows a toast */
  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
    toast('Sessions are read-only from gateway', {
      description: `Cannot move "${task?.title?.slice(0, 40)}" to ${statusLabel}`,
      duration: 3000,
    });
  }, [tasks]);

  const [mounted, setMounted] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedFilter, setFeedFilter] = useState('all');
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [agentDetailId, setAgentDetailId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [routinesOpen, setRoutinesOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setTaskDetailId(null);
        setAgentDetailId(null);
        setFeedOpen(false);
        setNotificationsOpen(false);
      }
      // Cmd/Ctrl + K for command palette (future)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleAgentClick = useCallback((id: string) => {
    setSelectedAgentId(prev => prev === id ? null : id);
  }, []);

  const handleFeedToggle = useCallback(() => {
    setFeedOpen(prev => !prev);
  }, []);

  const handleNotificationsToggle = useCallback(() => {
    setNotificationsOpen(prev => !prev);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleCommand = useCallback((action: string) => {
    switch (action) {
      case 'new-task':
        setCreateTaskOpen(true);
        break;
      case 'toggle-feed':
        setFeedOpen(prev => !prev);
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'view-routines':
        setRoutinesOpen(true);
        break;
      case 'filter-urgent':
        setStatusFilter('urgent');
        break;
      case 'filter-in-progress':
        setStatusFilter('in-progress');
        break;
      default:
        // Dynamic agent filter: "filter-<agentId>"
        if (action.startsWith('filter-')) {
          const agentId = action.slice(7);
          setSelectedAgentId(prev => prev === agentId ? null : agentId);
        } else {
          console.log('Command:', action);
        }
    }
  }, []);

  const activeAgents = agents.filter(a => a.status === 'working').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  const taskDetail = taskDetailId ? tasks.find(t => t.id === taskDetailId) : null;
  const agentDetail = agentDetailId ? agents.find(a => a.id === agentDetailId) : null;

  if (!mounted) return null;

  // Loading state — skeleton UI
  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
          <div className="h-12 w-48 bg-muted rounded-xl animate-pulse mb-4" />
          <AgentStripSkeleton />
          <div className="grid gap-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => <TaskCardSkeleton key={i} />)}
          </div>
          <div className="mt-8">
            <MetricsSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Welcome screen for fresh installs
  if (!loading && tasks.length === 0 && agents.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
          <Header
            activeAgents={0}
            totalAgents={0}
            totalTasks={0}
            inProgressTasks={0}
            feedOpen={false}
            onFeedToggle={handleFeedToggle}
            unreadNotifications={0}
            notificationsOpen={false}
            onNotificationsToggle={handleNotificationsToggle}
          />
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Command Palette - Global */}
      <CommandPalette onAction={handleCommand} />

      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
        <Header
          activeAgents={activeAgents}
          totalAgents={agents.length}
          totalTasks={tasks.length}
          inProgressTasks={inProgressTasks}
          feedOpen={feedOpen}
          onFeedToggle={handleFeedToggle}
          unreadNotifications={unreadNotifications}
          notificationsOpen={notificationsOpen}
          onNotificationsToggle={handleNotificationsToggle}
        />

        <AgentStrip
          agents={agents}
          tasks={tasks}
          selectedAgentId={selectedAgentId}
          onAgentClick={handleAgentClick}
          onAgentDetail={(id) => setAgentDetailId(id)}
        />

        <ErrorBoundary>
          <MissionQueue
            tasks={tasks}
            agents={agents}
            selectedAgentId={selectedAgentId}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onTaskClick={(id) => setTaskDetailId(id)}
            onTaskMove={handleTaskMove}
          />
        </ErrorBoundary>

        {/* Routines (inline, not a modal) */}
        {routinesOpen && (
          <div className="mt-8">
            <ErrorBoundary>
              <RoutineManager
                agents={agents}
                onClose={() => setRoutinesOpen(false)}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Metrics Panel */}
        <div className="mt-8 mb-8">
          <ErrorBoundary>
            <MetricsPanel stats={stats} workers={clusterWorkers} feed={feed} />
          </ErrorBoundary>
        </div>

        {/* Connection + last updated indicator */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground/50">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span>{connected ? 'Live' : 'Reconnecting...'}</span>
          {lastUpdated && (
            <span>| {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Feed Drawer */}
      <AnimatePresence>
        {feedOpen && (
          <LiveFeed
            items={feed}
            agents={agents}
            feedFilter={feedFilter}
            onFeedFilterChange={setFeedFilter}
            selectedAgentId={selectedAgentId}
            onAgentClick={handleAgentClick}
            onClose={() => setFeedOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Notification Panel */}
      <AnimatePresence>
        {notificationsOpen && (
          <NotificationPanel
            notifications={notifications}
            onClose={() => setNotificationsOpen(false)}
            onMarkRead={(id: number) => markNotificationRead(String(id))}
            onMarkAllRead={clearAllNotifications}
          />
        )}
      </AnimatePresence>

      {/* Task Create Modal */}
      <AnimatePresence>
        {createTaskOpen && (
          <TaskCreateModal
            agents={agents}
            onClose={() => setCreateTaskOpen(false)}
            onCreated={() => {
              setCreateTaskOpen(false);
              toast.success('Task created');
            }}
          />
        )}
      </AnimatePresence>

      {/* Task Edit Modal */}
      <AnimatePresence>
        {taskDetailId && (
          <TaskEditModal
            taskId={taskDetailId}
            agents={agents}
            onClose={() => setTaskDetailId(null)}
            onUpdated={() => {
              toast.success('Task updated');
            }}
          />
        )}
      </AnimatePresence>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {agentDetail && (
          <AgentModal
            agent={agentDetail}
            tasks={tasks}
            feedItems={feed}
            onClose={() => setAgentDetailId(null)}
            onTaskClick={(id: string) => { setAgentDetailId(null); setTaskDetailId(id); }}
          />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatAgentId && (() => {
          const chatAgent = agents.find(a => a.id === chatAgentId);
          return chatAgent ? (
            <ChatPanel
              agent={chatAgent}
              onClose={() => setChatAgentId(null)}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return <DashboardContent />;
}
