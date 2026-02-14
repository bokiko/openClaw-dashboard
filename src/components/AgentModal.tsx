'use client';

import { motion } from 'framer-motion';
import { X, Briefcase, Activity, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { Agent, Task, FeedItem, TaskStatus } from '@/types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/types';
import AgentAvatar from './AgentAvatar';

interface AgentModalProps {
  agent: Agent;
  tasks: Task[];
  feedItems: FeedItem[];
  onClose: () => void;
  onTaskClick: (id: string) => void;
}

export default function AgentModal({ 
  agent, 
  tasks, 
  feedItems, 
  onClose, 
  onTaskClick 
}: AgentModalProps) {
  const agentTasks = tasks.filter(t => t.assigneeId === agent.id);
  const agentActivity = feedItems.filter(f => f.agentId === agent.id).slice(0, 5);
  const isWorking = agent.status === 'working';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-content"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="modal-card"
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Agent Profile
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent Info */}
        <div className="flex items-center gap-4 mb-6">
          <AgentAvatar agent={agent} size="xl" showStatus={true} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-foreground">
                {agent.name}
              </h2>
              {agent.badge && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-medium",
                  agent.badge === 'lead' 
                    ? "text-green-DEFAULT bg-green-DEFAULT/10 border border-green-DEFAULT/20" 
                    : "text-blue-DEFAULT bg-blue-DEFAULT/10 border border-blue-DEFAULT/20"
                )}>
                  {agent.badge === 'lead' ? 'Lead' : 'Specialist'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{agent.role}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50 mb-6">
          <span className={cn(
            "status-dot",
            isWorking ? "working" : "idle"
          )} />
          <span className={cn(
            "text-sm font-medium",
            isWorking ? "text-green-DEFAULT" : "text-amber-DEFAULT"
          )}>
            {isWorking ? 'Currently Working' : 'Idle'}
          </span>
        </div>

        {/* Task Timeline */}
        {agentTasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Task Timeline
              </span>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto scrollbar-thin">
              {(['done', 'in-progress', 'review', 'assigned', 'waiting', 'inbox'] as TaskStatus[]).map(statusKey => {
                const group = agentTasks.filter(t => t.status === statusKey);
                if (group.length === 0) return null;
                const statusInfo = STATUS_CONFIG[statusKey];
                return (
                  <div key={statusKey}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-1">
                      {statusInfo.label} ({group.length})
                    </p>
                    <div className="space-y-1">
                      {group
                        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                        .slice(0, 10)
                        .map(task => (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task.id)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: statusInfo.color }}
                            />
                            <span className="text-sm text-foreground flex-1 truncate">
                              {task.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 font-tabular shrink-0" suppressHydrationWarning>
                              {timeAgo(task.updatedAt || task.createdAt)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assigned Tasks */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Assigned Tasks
            </span>
            <span className="text-xs text-muted-foreground font-tabular">
              ({agentTasks.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
            {agentTasks.map(task => {
              const priority = PRIORITY_CONFIG[task.priority];
              const status = STATUS_CONFIG[task.status];

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 cursor-pointer hover:bg-secondary/50 hover:border-border transition-all"
                >
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: priority.color,
                      backgroundColor: priority.bgColor,
                    }}
                  >
                    P{task.priority}
                  </span>
                  <span className="text-sm text-foreground flex-1 truncate">
                    {task.title}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md"
                    style={{
                      color: status.color,
                      backgroundColor: status.bgColor,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}

            {agentTasks.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground/60">
                No tasks assigned
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Recent Activity
            </span>
          </div>

          <div className="space-y-3 max-h-[150px] overflow-y-auto scrollbar-thin">
            {agentActivity.map(item => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.title.replace(agent.name, '').trim()}
                  </p>
                  <span className="text-[11px] text-muted-foreground/50 font-tabular" suppressHydrationWarning>
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {agentActivity.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground/60">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
          <span className="kbd">ESC</span>
        </div>
        </motion.div>
      </motion.div>
    </>
  );
}
