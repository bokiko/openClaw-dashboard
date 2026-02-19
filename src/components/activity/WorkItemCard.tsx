'use client';

import { CheckCircle2, XCircle, Loader2, Clock, Cpu, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkItem } from '@/types';
import type { Agent } from '@/types';

interface WorkItemCardProps {
  item: WorkItem;
  agents: Agent[];
}

const TYPE_LABELS: Record<WorkItem['type'], { label: string; className: string }> = {
  cron: { label: 'Cron', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  spawn: { label: 'Spawn', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  direct: { label: 'Direct', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function StatusIcon({ status }: { status: WorkItem['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'active':
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function WorkItemCard({ item, agents }: WorkItemCardProps) {
  const agent = agents.find(a => a.id === item.agentId);
  const typeMeta = TYPE_LABELS[item.type];

  return (
    <div className={cn(
      "group relative flex items-start gap-3 p-3 rounded-xl border transition-colors",
      "bg-card border-border hover:border-border/80",
      item.status === 'failed' && "border-red-500/30 bg-red-500/5"
    )}>
      {/* Agent avatar */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: agent ? `color-mix(in srgb, ${agent.color} 15%, transparent)` : 'var(--secondary)',
          color: agent?.color || 'var(--muted-foreground)',
        }}
      >
        {agent?.letter || item.agentId.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <StatusIcon status={item.status} />
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{item.description}</p>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", typeMeta.className)}>
            {typeMeta.label}
          </span>

          {/* Model */}
          {item.model && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Cpu className="w-3 h-3" />
              {item.model.split('/').pop()?.split('-').slice(0, 2).join('-') || item.model}
            </span>
          )}

          {/* Tokens */}
          {item.tokens != null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Coins className="w-3 h-3" />
              {item.tokens >= 1000 ? `${(item.tokens / 1000).toFixed(1)}k` : item.tokens}
            </span>
          )}

          {/* Duration */}
          {item.duration != null && item.duration > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDuration(item.duration)}
            </span>
          )}

          {/* Team */}
          {item.team && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/50 text-muted-foreground">
              {item.team}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span
        className="text-[10px] text-muted-foreground shrink-0"
        title={new Date(item.timestamp).toLocaleString()}
      >
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}
