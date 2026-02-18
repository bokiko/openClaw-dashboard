'use client';

import { cn } from '@/lib/utils';
import type { Agent, Task } from '@/types';
import AgentAvatar from './AgentAvatar';

interface AgentStripProps {
  agents: Agent[];
  tasks: Task[];
  selectedAgentId: string | null;
  onAgentClick: (id: string) => void;
  onAgentDetail: (id: string) => void;
}

export default function AgentStrip({
  agents,
  tasks,
  selectedAgentId,
  onAgentClick,
  onAgentDetail,
}: AgentStripProps) {
  const workingAgents = agents.filter(a => a.status === 'working');
  const idleAgents = agents.filter(a => a.status === 'idle');
  const offlineAgents = agents.filter(a => a.status === 'offline');

  return (
    <div className="relative py-4 border-b border-border/50">
      {/* Background glow for active filter */}
      {selectedAgentId && (
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${agents.find(a => a.id === selectedAgentId)?.color || '#fff'} 0%, transparent 70%)`
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4">
        {/* All Button */}
        <button
          onClick={() => selectedAgentId && onAgentClick(selectedAgentId)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-sm font-medium transition-all duration-200",
            selectedAgentId === null
              ? "bg-secondary text-foreground border border-border/80 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-DEFAULT to-blue-DEFAULT" />
          <span>All</span>
          <span className="text-xs text-muted-foreground font-tabular">
            {agents.length}
          </span>
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-border/50 mx-0.5 hidden sm:block" />

        {/* Working (Busy) Agents */}
        {workingAgents.map(agent => (
          <AgentButton
            key={agent.id}
            agent={agent}
            tasks={tasks}
            isSelected={selectedAgentId === agent.id}
            onClick={() => onAgentClick(agent.id)}
            onDoubleClick={() => onAgentDetail(agent.id)}
          />
        ))}

        {/* Idle separator */}
        {idleAgents.length > 0 && workingAgents.length > 0 && (
          <div className="w-px h-6 bg-border/30 mx-0.5 hidden sm:block" />
        )}

        {/* Idle Agents */}
        {idleAgents.map(agent => (
          <AgentButton
            key={agent.id}
            agent={agent}
            tasks={tasks}
            isSelected={selectedAgentId === agent.id}
            onClick={() => onAgentClick(agent.id)}
            onDoubleClick={() => onAgentDetail(agent.id)}
          />
        ))}

        {/* Offline separator */}
        {offlineAgents.length > 0 && (workingAgents.length > 0 || idleAgents.length > 0) && (
          <div className="w-px h-6 bg-border/20 mx-1" />
        )}

        {/* Offline Agents */}
        {offlineAgents.map(agent => (
          <AgentButton
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onClick={() => onAgentClick(agent.id)}
            onDoubleClick={() => onAgentDetail(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AgentButton({
  agent,
  tasks,
  isSelected,
  onClick,
  onDoubleClick
}: {
  agent: Agent;
  tasks?: Task[];
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const isOffline = agent.status === 'offline';
  const agentTasks = tasks?.filter(t => t.assigneeId === agent.id) ?? [];
  const doneCount = agentTasks.filter(t => t.status === 'done').length;
  const totalCount = agentTasks.length;

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-sm transition-all duration-200",
        isSelected
          ? "bg-secondary shadow-sm"
          : "hover:bg-secondary/30",
        isSelected && "ring-1 ring-offset-1 ring-offset-background",
        isOffline && "opacity-50"
      )}
      style={{
        ...(isSelected && {
          '--tw-ring-color': `${agent.color}50`,
          '--tw-ring-offset-color': 'hsl(240 6% 6%)'
        } as React.CSSProperties)
      }}
    >
      <AgentAvatar
        agent={agent}
        size="sm"
        showStatus={true}
        selected={isSelected}
      />

      <span className={cn(
        "hidden sm:block font-medium transition-colors max-w-[8rem] truncate",
        isSelected ? "text-foreground" : "text-muted-foreground",
        isOffline && "line-through"
      )}>
        {agent.name}
      </span>

      {totalCount > 0 && (
        <span className="text-[10px] text-muted-foreground font-tabular">
          {doneCount}/{totalCount}
        </span>
      )}

      {agent.badge && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded font-medium hidden sm:inline",
          agent.badge === 'lead'
            ? "text-green-DEFAULT bg-green-DEFAULT/10"
            : "text-blue-DEFAULT bg-blue-DEFAULT/10"
        )}>
          {agent.badge}
        </span>
      )}
    </button>
  );
}
