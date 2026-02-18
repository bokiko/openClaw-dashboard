'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { Agent, FeedItem } from '@/types';
import AgentAvatar from './AgentAvatar';

interface LiveFeedProps {
  items: FeedItem[];
  agents: Agent[];
  feedFilter: string;
  onFeedFilterChange: (filter: string) => void;
  selectedAgentId: string | null;
  onAgentClick: (id: string) => void;
  onClose: () => void;
}

const typeFilters = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'status', label: 'Workers' },
];

const severityConfig = {
  info: { color: '#697177', icon: MessageSquare },
  success: { color: '#46a758', icon: CheckCircle },
  warning: { color: '#ffb224', icon: AlertCircle },
  error: { color: '#e54d2e', icon: AlertCircle },
};

export default function LiveFeed({
  items,
  agents,
  feedFilter,
  onFeedFilterChange,
  selectedAgentId,
  onAgentClick,
  onClose,
}: LiveFeedProps) {
  const agentFiltered = selectedAgentId
    ? items.filter(f => f.agentId === selectedAgentId)
    : items;

  const typeFiltered = feedFilter === 'all'
    ? agentFiltered
    : agentFiltered.filter(f => f.type === feedFilter);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-5 h-5 text-green-DEFAULT" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-DEFAULT animate-pulse-soft" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Activity</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-DEFAULT animate-pulse-soft" />
                <span className="text-[10px] font-medium text-green-DEFAULT">LIVE</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-5 py-3 border-b border-border/30">
          <div className="flex items-center gap-1">
            {typeFilters.map(f => (
              <button
                key={f.id}
                onClick={() => onFeedFilterChange(f.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  feedFilter === f.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {typeFiltered.map((item, index) => (
              <FeedItemRow
                key={item.id}
                item={item}
                agents={agents}
                index={index}
                onAgentClick={onAgentClick}
              />
            ))}
          </AnimatePresence>

          {typeFiltered.length === 0 && (
            <div className="px-5 py-16 text-center text-sm text-muted-foreground">
              No activity to show
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between bg-background/50">
          <span className="text-xs text-muted-foreground">
            {typeFiltered.length} events
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-DEFAULT animate-pulse-soft" />
            <span className="text-[10px] font-medium text-green-DEFAULT">Connected</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function FeedItemRow({ 
  item, 
  agents, 
  index,
  onAgentClick 
}: { 
  item: FeedItem; 
  agents: Agent[];
  index: number;
  onAgentClick: (id: string) => void;
}) {
  const config = severityConfig[item.severity];
  const Icon = config.icon;
  const agent = item.agentId ? agents.find(a => a.id === item.agentId) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex items-start gap-3 px-5 py-4 border-b border-border/20 hover:bg-secondary/20 transition-colors"
    >
      {/* Icon or Avatar */}
      {agent ? (
        <AgentAvatar 
          agent={agent} 
          size="sm" 
          showStatus={false}
          interactive
          onClick={() => onAgentClick(agent.id)}
        />
      ) : (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-3 h-3" style={{ color: config.color }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {agent ? (
            <>
              <span 
                className="text-foreground font-medium cursor-pointer hover:text-green-DEFAULT transition-colors"
                onClick={() => onAgentClick(agent.id)}
              >
                {agent.name}
              </span>
              {' '}{item.title.replace(agent.name, '').trim()}
            </>
          ) : (
            item.title
          )}
        </p>
        <span className="text-[11px] text-muted-foreground/60 font-tabular mt-1 block" suppressHydrationWarning>
          {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* Severity indicator */}
      <span 
        className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
        style={{ backgroundColor: config.color }}
      />
    </motion.div>
  );
}
