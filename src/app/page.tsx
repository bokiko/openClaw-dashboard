'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import AgentStrip from '@/components/AgentStrip';
import MissionQueue from '@/components/MissionQueue';
import LiveFeed from '@/components/LiveFeed';
import TaskModal from '@/components/TaskModal';
import AgentModal from '@/components/AgentModal';
import { MetricsPanel } from '@/components/MetricsPanel';
import { TokenMetricsPanel } from '@/components/TokenMetricsPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { toast } from 'sonner';
import { useSwarmData } from '@/lib/useSwarmData';
import type { TaskStatus } from '@/types';
import { STATUS_CONFIG } from '@/types';

// ── Page Component ──────────────────────────────────────────────────────

export default function Home() {
  const { agents, tasks, feed, loading, error, lastUpdated, updateTask, tokenStats, config, settings } = useSwarmData();
  
  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    updateTask(taskId, { status: newStatus });
    
    const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
    toast.success(`Task moved to ${statusLabel}`, {
      description: task?.title,
      duration: 2000,
    });
  }, [tasks, updateTask]);
  
  const [mounted, setMounted] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedFilter, setFeedFilter] = useState('all');
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [agentDetailId, setAgentDetailId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setTaskDetailId(null);
        setAgentDetailId(null);
        setFeedOpen(false);
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

  const handleCommand = useCallback((action: string) => {
    switch (action) {
      case 'toggle-feed':
        setFeedOpen(prev => !prev);
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'filter-spark':
        setSelectedAgentId(prev => prev === 'spark' ? null : 'spark');
        break;
      case 'filter-scout':
        setSelectedAgentId(prev => prev === 'scout' ? null : 'scout');
        break;
      case 'filter-urgent':
        setStatusFilter('urgent');
        break;
      case 'filter-in-progress':
        setStatusFilter('in-progress');
        break;
      default:
        console.log('Command:', action);
    }
  }, []);

  const activeAgents = agents.filter(a => a.status === 'working').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  const taskDetail = taskDetailId ? tasks.find(t => t.id === taskDetailId) : null;
  const agentDetail = agentDetailId ? agents.find(a => a.id === agentDetailId) : null;

  if (!mounted) return null;

  // Loading state
  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Loading swarm data...</p>
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

  return (
    <div className="min-h-screen">
      {/* Command Palette - Global */}
      <CommandPalette onAction={handleCommand} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header
          activeAgents={activeAgents}
          totalAgents={agents.length}
          totalTasks={tasks.length}
          inProgressTasks={inProgressTasks}
          feedOpen={feedOpen}
          onFeedToggle={handleFeedToggle}
          dashboardName={config?.name}
          dashboardSubtitle={config?.subtitle}
          repoUrl={config?.repoUrl}
          logoIcon={settings?.logoIcon}
          accentColor={settings?.accent?.primary}
        />

        <AgentStrip
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentClick={handleAgentClick}
          onAgentDetail={(id) => setAgentDetailId(id)}
        />

        <MissionQueue
          tasks={tasks}
          agents={agents}
          selectedAgentId={selectedAgentId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onTaskClick={(id) => setTaskDetailId(id)}
          onTaskMove={handleTaskMove}
        />

        {/* Metrics Panels (conditional via settings) */}
        <div className="mt-8 mb-8 space-y-6">
          {(settings?.showMetricsPanel !== false) && <MetricsPanel tasks={tasks} agents={agents} />}
          {(settings?.showTokenPanel !== false) && (
            <TokenMetricsPanel tokenStats={tokenStats} />
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 pb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/40">
          <span>{config?.name || 'OpenClaw'} Dashboard{config?.version ? ` v${config.version}` : ''}</span>
          {config?.repoUrl && (
            <>
              <span>·</span>
              <a
                href={config.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                Star on GitHub
              </a>
            </>
          )}
        </div>

        {/* Last updated indicator */}
        {lastUpdated && (
          <div className="fixed bottom-4 right-4 text-xs text-muted-foreground/50">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
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

      {/* Task Detail Modal */}
      <AnimatePresence>
        {taskDetail && (
          <TaskModal
            task={taskDetail}
            agents={agents}
            onClose={() => setTaskDetailId(null)}
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
            onTaskClick={(id) => { setAgentDetailId(null); setTaskDetailId(id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
