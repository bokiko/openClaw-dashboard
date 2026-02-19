'use client';

import { cn } from '@/lib/utils';
import type { Agent } from '@/types';

export type TimeRange = 'today' | '24h' | '7d' | '30d';
export type ItemType = 'all' | 'cron' | 'spawn' | 'direct';
export type ItemStatus = 'all' | 'completed' | 'failed' | 'active';

interface AgentFilterBarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (id: string | null) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  itemType: ItemType;
  onItemTypeChange: (type: ItemType) => void;
  itemStatus: ItemStatus;
  onItemStatusChange: (status: ItemStatus) => void;
}

function FilterGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
      {children}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export default function AgentFilterBar({
  agents,
  selectedAgentId,
  onAgentSelect,
  timeRange,
  onTimeRangeChange,
  itemType,
  onItemTypeChange,
  itemStatus,
  onItemStatusChange,
}: AgentFilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      {/* Agent filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onAgentSelect(null)}
          className={cn(
            "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
            !selectedAgentId ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          All Agents
        </button>
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => onAgentSelect(selectedAgentId === agent.id ? null : agent.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
              selectedAgentId === agent.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: agent.color }}
            />
            {agent.name}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-border hidden sm:block" />

      {/* Time range */}
      <FilterGroup>
        {(['today', '24h', '7d', '30d'] as TimeRange[]).map(range => (
          <FilterButton key={range} active={timeRange === range} onClick={() => onTimeRangeChange(range)}>
            {range === 'today' ? 'Today' : range}
          </FilterButton>
        ))}
      </FilterGroup>

      {/* Type */}
      <FilterGroup>
        {(['all', 'cron', 'spawn', 'direct'] as ItemType[]).map(type => (
          <FilterButton key={type} active={itemType === type} onClick={() => onItemTypeChange(type)}>
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </FilterButton>
        ))}
      </FilterGroup>

      {/* Status */}
      <FilterGroup>
        {(['all', 'active', 'completed', 'failed'] as ItemStatus[]).map(status => (
          <FilterButton key={status} active={itemStatus === status} onClick={() => onItemStatusChange(status)}>
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </FilterButton>
        ))}
      </FilterGroup>
    </div>
  );
}
