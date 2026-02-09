'use client';

import { useState, useCallback } from 'react';
import { Activity, Zap, Command, Github, Download, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HeaderProps {
  activeAgents: number;
  totalAgents: number;
  totalTasks: number;
  inProgressTasks: number;
  feedOpen: boolean;
  onFeedToggle: () => void;
  onCommandPalette?: () => void;
  dashboardName?: string;
  dashboardSubtitle?: string;
  repoUrl?: string | null;
}

type UpdateStatus = 'idle' | 'updating' | 'updated' | 'current' | 'error';

export default function Header({
  activeAgents,
  totalAgents,
  totalTasks,
  inProgressTasks,
  feedOpen,
  onFeedToggle,
  onCommandPalette,
  dashboardName = 'OpenClaw',
  dashboardSubtitle = 'Mission Control',
  repoUrl,
}: HeaderProps) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');

  const handleUpdate = useCallback(async () => {
    if (updateStatus === 'updating') return;
    setUpdateStatus('updating');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const apiKey = process.env.NEXT_PUBLIC_OPENCLAW_API_KEY;
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch('/api/update', { method: 'POST', headers });
      const data = await res.json();

      if (data.status === 'current') {
        setUpdateStatus('current');
        toast.info('Already up to date', { duration: 3000 });
      } else if (data.status === 'updated') {
        setUpdateStatus('updated');
        toast.success('Update applied', {
          description: 'Server restarting — page will reload shortly',
          duration: 5000,
        });
        // Reload page after server has time to restart
        setTimeout(() => window.location.reload(), 4000);
      } else {
        setUpdateStatus('error');
        toast.error('Update failed', {
          description: data.message || 'Unknown error',
          duration: 5000,
        });
      }
    } catch {
      setUpdateStatus('error');
      toast.error('Update failed', {
        description: 'Could not reach the server',
        duration: 5000,
      });
    }

    // Reset after 4s
    setTimeout(() => setUpdateStatus('idle'), 4000);
  }, [updateStatus]);

  const updateIcon = {
    idle: <Download className="w-4 h-4" />,
    updating: <Loader2 className="w-4 h-4 animate-spin" />,
    updated: <Check className="w-4 h-4" />,
    current: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  }[updateStatus];

  const updateColors = {
    idle: 'bg-secondary/50 text-muted-foreground border-border hover:border-border/80 hover:text-foreground hover:bg-secondary',
    updating: 'bg-blue-DEFAULT/10 text-blue-DEFAULT border-blue-DEFAULT/30',
    updated: 'bg-green-DEFAULT/10 text-green-DEFAULT border-green-DEFAULT/30',
    current: 'bg-green-DEFAULT/10 text-green-DEFAULT border-green-DEFAULT/30',
    error: 'bg-red-DEFAULT/10 text-red-DEFAULT border-red-DEFAULT/30',
  }[updateStatus];

  return (
    <header className="flex items-center justify-between py-4 mb-2">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-DEFAULT/20 blur-xl rounded-full" />
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-green-DEFAULT/20 to-green-DEFAULT/5 border border-green-DEFAULT/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-DEFAULT" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {dashboardName}
          </h1>
          <p className="text-xs text-muted-foreground">{dashboardSubtitle}</p>
        </div>
      </div>

      {/* Center: Stats */}
      <div className="hidden md:flex items-center gap-6">
        {/* Active Agents */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="status-dot working" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground font-tabular">{activeAgents}</span>
              <span className="text-muted-foreground">/{totalAgents}</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground">agents</span>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Tasks */}
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <span className="font-semibold text-foreground font-tabular">{inProgressTasks}</span>
            <span className="text-muted-foreground"> active</span>
          </span>
          <span className="text-xs text-muted-foreground">
            of {totalTasks} tasks
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Command Palette Button */}
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              "bg-secondary/50 text-muted-foreground",
              "border border-border hover:border-border/80",
              "hover:bg-secondary hover:text-foreground",
              "transition-all duration-200"
            )}
          >
            <Command className="w-3.5 h-3.5" />
            <span className="text-xs">Search</span>
            <kbd className="kbd ml-1">⌘K</kbd>
          </button>
        )}

        {/* Repo Link */}
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
              "bg-secondary/50 text-muted-foreground border border-border",
              "hover:border-border/80 hover:text-foreground hover:bg-secondary"
            )}
            title="View repository"
          >
            <Github className="w-4 h-4" />
          </a>
        )}

        {/* Update Button */}
        <button
          onClick={handleUpdate}
          disabled={updateStatus === 'updating'}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border",
            updateColors,
            updateStatus === 'updating' && "cursor-wait"
          )}
          title={
            updateStatus === 'idle' ? 'Check for updates' :
            updateStatus === 'updating' ? 'Updating...' :
            updateStatus === 'updated' ? 'Update complete' :
            updateStatus === 'current' ? 'Up to date' :
            'Update failed'
          }
        >
          {updateIcon}
        </button>

        {/* Activity Feed Toggle */}
        <button
          onClick={onFeedToggle}
          className={cn(
            "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
            feedOpen
              ? "bg-green-DEFAULT/10 text-green-DEFAULT border border-green-DEFAULT/30"
              : "bg-secondary/50 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground hover:bg-secondary"
          )}
        >
          <Activity className="w-4 h-4" />

          {/* Notification dot */}
          {!feedOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-DEFAULT animate-pulse-soft"
              style={{ boxShadow: '0 0 8px rgba(70, 167, 88, 0.6)' }}
            />
          )}
        </button>
      </div>
    </header>
  );
}
