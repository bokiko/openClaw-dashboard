'use client';

import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Tag, CheckSquare, MessageSquare, Package } from 'lucide-react';
import { cn, formatUTC, formatTokens } from '@/lib/utils';
import type { Agent, Task } from '@/types';
import { PRIORITY_CONFIG } from '@/types';
import AgentAvatar from './AgentAvatar';

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  onClick: () => void;
  compact?: boolean;
  isDragging?: boolean;
}

export default function TaskCard({ task, agents, onClick, compact = false, isDragging = false }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const assignee = task.assigneeId 
    ? agents.find(a => a.id === task.assigneeId) 
    : null;

  const isDone = task.status === 'done';

  // Rich task badge counts
  const checklist = task.checklist ?? [];
  const checklistTotal = checklist.length;
  const checklistChecked = checklist.filter(i => i.checked).length;
  const commentCount = task.comments?.length ?? 0;
  const deliverableCount = task.deliverables?.length ?? 0;

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ 
        y: -4, 
        boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' 
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        "card-premium cursor-pointer group relative",
        compact ? "p-4" : "p-5",
        isDragging && "ring-2 ring-green-500 shadow-xl shadow-green-500/20"
      )}
    >
      {/* Header: Title + Priority */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={cn(
          "font-semibold text-foreground leading-tight group-hover:text-white transition-colors",
          compact ? "text-xs" : "text-sm"
        )}>
          {task.title}
        </h3>
        
        {task.priority < 2 && (
          <span
            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: priority.color,
              backgroundColor: priority.bgColor,
              border: `1px solid ${priority.color}30`,
            }}
          >
            {priority.label}
          </span>
        )}
      </div>

      {/* Description */}
      {!compact && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {!compact && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {task.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-background/50 text-muted-foreground border border-border/50"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/50">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className={cn(
        "flex flex-col gap-1 text-[10px] text-muted-foreground/70 font-mono",
        compact ? "mb-2" : "mb-3"
      )}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Received: </span>
          <span className="text-muted-foreground" suppressHydrationWarning>
            {formatUTC(task.createdAt)}
          </span>
        </div>
        {isDone && task.updatedAt && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-500/70" />
            <span>Completed: </span>
            <span className="text-green-500/70" suppressHydrationWarning>
              {formatUTC(task.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Token Usage Badge (from remote's token tracking) */}
      {task.usage && task.usage.length > 0 && (() => {
        const totalIn = task.usage.reduce((s, u) => s + u.inputTokens, 0);
        const totalOut = task.usage.reduce((s, u) => s + u.outputTokens, 0);
        return (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] font-mono text-[#3e63dd]/80">
            <span className="px-2 py-0.5 rounded-md bg-[#3e63dd]/10 border border-[#3e63dd]/20">
              {formatTokens(totalIn + totalOut)} tok
              <span className="text-muted-foreground/50 ml-1">
                (in: {formatTokens(totalIn)} / out: {formatTokens(totalOut)})
              </span>
            </span>
          </div>
        );
      })()}

      {/* Rich task badges (from our gateway additions) */}
      {!compact && (checklistTotal > 0 || commentCount > 0 || deliverableCount > 0) && (
        <div className="flex items-center gap-3 mb-3">
          {checklistTotal > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-tabular px-1.5 py-0.5 rounded-md",
              checklistChecked === checklistTotal
                ? "bg-green-500/10 text-green-500"
                : "bg-secondary text-muted-foreground/60"
            )}>
              <CheckSquare className="w-3 h-3" />
              {checklistChecked}/{checklistTotal}
            </span>
          )}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-tabular px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground/60">
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}
          {deliverableCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-tabular px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground/60">
              <Package className="w-3 h-3" />
              {deliverableCount}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        {assignee ? (
          <div className="flex items-center gap-2">
            <AgentAvatar agent={assignee} size="sm" showStatus={false} />
            <span className="text-xs text-muted-foreground font-medium">
              {assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">
            Unassigned
          </span>
        )}
      </div>

      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: assignee 
            ? `linear-gradient(135deg, ${assignee.color}05 0%, transparent 50%)`
            : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)'
        }}
      />
    </motion.div>
  );
}
