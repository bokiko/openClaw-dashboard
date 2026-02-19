'use client';

import { Clock, Cpu, Coins, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent, WorkItem, GatewayCronJob } from '@/types';

interface AgentMeta {
  description?: string;
  specialty?: string;
}

interface AgentDetailCardProps {
  agent: Agent;
  items: WorkItem[];
  cronJobs?: GatewayCronJob[];
  meta?: AgentMeta;
}

export default function AgentDetailCard({ agent, items, cronJobs, meta }: AgentDetailCardProps) {
  const activeItems = items.filter(i => i.status === 'active');
  const spawnCount = items.filter(i => i.type === 'spawn' && i.status === 'active').length;
  const totalTokens = items.reduce((sum, i) => sum + (i.tokens || 0), 0);
  const agentCrons = cronJobs?.filter(j => j.agentId === agent.id) ?? [];
  const lastActivity = items.length > 0 ? Math.max(...items.map(i => i.timestamp)) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{
            background: `color-mix(in srgb, ${agent.color} 15%, transparent)`,
            color: agent.color,
          }}
        >
          {agent.letter}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
            <span className="text-xs text-muted-foreground">{agent.role}</span>
            {agent.badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {agent.badge.toUpperCase()}
              </span>
            )}
          </div>

          {meta?.description && (
            <p className="text-xs text-muted-foreground mb-2">{meta.description}</p>
          )}
          {meta?.specialty && (
            <p className="text-[10px] text-muted-foreground/70 mb-2">Specialty: {meta.specialty}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              {activeItems.length} active
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Cpu className="w-3 h-3" />
              {items.length} total sessions
            </span>
            {totalTokens > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="w-3 h-3" />
                {totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tokens
              </span>
            )}
            {spawnCount > 0 && (
              <span className="text-xs text-muted-foreground">{spawnCount} active spawns</span>
            )}
            {lastActivity && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Last active {new Date(lastActivity).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Cron jobs */}
          {agentCrons.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Scheduled Jobs</p>
              <div className="flex flex-col gap-1">
                {agentCrons.map(job => (
                  <div key={job.id} className="flex items-center gap-2 text-xs">
                    <RefreshCw className={cn("w-3 h-3", job.enabled ? "text-green-500" : "text-muted-foreground/40")} />
                    <span className="text-foreground">{job.name}</span>
                    <span className="text-muted-foreground">{job.schedule.expr}</span>
                    {job.state.lastStatus && (
                      <span className={cn(
                        "px-1 py-0.5 rounded text-[10px]",
                        job.state.lastStatus === 'completed' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {job.state.lastStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
