'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, WifiOff, Wifi, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusBadgeProps {
  connected: boolean;
  lastUpdated: number | null;
  error: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function useRelativeTime(timestamp: number | null): string {
  const [label, setLabel] = useState('');

  const compute = useCallback(() => {
    if (!timestamp) return '';
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  }, [timestamp]);

  useEffect(() => {
    setLabel(compute());
    const id = setInterval(() => setLabel(compute()), 5000);
    return () => clearInterval(id);
  }, [compute]);

  return label;
}

export function ConnectionStatusBadge({
  connected,
  lastUpdated,
  error,
  onRefresh,
  refreshing = false,
}: ConnectionStatusBadgeProps) {
  const relativeTime = useRelativeTime(lastUpdated);
  const [expanded, setExpanded] = useState(false);

  // Auto-expand on error, collapse when reconnected
  useEffect(() => {
    if (error) setExpanded(true);
    else setExpanded(false);
  }, [error]);

  const status: 'connected' | 'error' | 'refreshing' = refreshing
    ? 'refreshing'
    : connected
    ? 'connected'
    : 'error';

  return (
    <button
      onClick={() => {
        if (onRefresh && status !== 'refreshing') {
          onRefresh();
        } else {
          setExpanded(p => !p);
        }
      }}
      title={
        status === 'error'
          ? `Disconnected${error ? `: ${error}` : ''}. Click to retry.`
          : status === 'refreshing'
          ? 'Refreshing…'
          : `Connected · Updated ${relativeTime}. Click to refresh.`
      }
      aria-label={
        status === 'error' ? 'Connection error — click to retry' : 'Refresh dashboard data'
      }
      className={cn(
        'hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300',
        'border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        status === 'error'
          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
          : status === 'refreshing'
          ? 'bg-secondary/50 border-border text-muted-foreground cursor-wait'
          : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {/* Status dot / icon */}
      {status === 'refreshing' ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      ) : status === 'error' ? (
        <WifiOff className="w-3 h-3 shrink-0" />
      ) : (
        <span className="relative flex w-2 h-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: 'var(--accent-primary)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: 'var(--accent-primary)' }}
          />
        </span>
      )}

      {/* Label */}
      <span className="whitespace-nowrap">
        {status === 'refreshing'
          ? 'Refreshing…'
          : status === 'error'
          ? 'Retry'
          : expanded || !relativeTime
          ? relativeTime || 'Live'
          : relativeTime}
      </span>

      {/* Refresh icon (connected state only) */}
      {status === 'connected' && onRefresh && (
        <RefreshCw className="w-3 h-3 shrink-0 opacity-50" />
      )}
    </button>
  );
}
