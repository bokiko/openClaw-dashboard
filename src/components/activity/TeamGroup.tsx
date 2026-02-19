'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkItem, Agent } from '@/types';
import WorkItemCard from './WorkItemCard';

interface TeamGroupProps {
  team: string;
  items: WorkItem[];
  agents: Agent[];
}

export default function TeamGroup({ team, items, agents }: TeamGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const totalTokens = items.reduce((sum, i) => sum + (i.tokens || 0), 0);
  const totalDuration = items.reduce((sum, i) => sum + (i.duration || 0), 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left",
          "bg-secondary/30 hover:bg-secondary/50 transition-colors"
        )}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{team}</span>
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
          <span>{items.length} items</span>
          {totalTokens > 0 && <span>{(totalTokens / 1000).toFixed(1)}k tokens</span>}
          {totalDuration > 0 && <span>{Math.round(totalDuration / 1000)}s</span>}
        </span>
      </button>
      {expanded && (
        <div className="p-2 flex flex-col gap-2">
          {items.map(item => (
            <WorkItemCard key={item.id} item={item} agents={agents} />
          ))}
        </div>
      )}
    </div>
  );
}
