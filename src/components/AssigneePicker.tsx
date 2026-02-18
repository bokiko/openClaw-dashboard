'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types';
import AgentAvatar from './AgentAvatar';

interface AssigneePickerProps {
  agents: Agent[];
  value: string[];
  onChange: (assignees: string[]) => void;
}

export default function AssigneePicker({ agents, value, onChange }: AssigneePickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  }, [agents, search]);

  const selectedAgents = useMemo(
    () => agents.filter(a => value.includes(a.id)),
    [agents, value]
  );

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAgents.map(agent => (
            <span
              key={agent.id}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-border/50 bg-secondary/50"
            >
              <AgentAvatar agent={agent} size="sm" showStatus={false} />
              <span className="text-muted-foreground font-medium">{agent.name}</span>
              <button
                type="button"
                onClick={() => remove(agent.id)}
                className="text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search + list */}
      <div className="rounded-xl bg-background/50 border border-border/50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <Search className="w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </div>

        <div className="max-h-[160px] overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground/50">
              No workers found
            </div>
          ) : (
            filtered.map(agent => {
              const isSelected = value.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggle(agent.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-secondary/50"
                      : "hover:bg-secondary/30"
                  )}
                >
                  <AgentAvatar agent={agent} size="sm" showStatus />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {agent.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 truncate">
                      {agent.role}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
