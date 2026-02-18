'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  FileText,
  CheckSquare,
  MessageSquare,
  Package,
  Clock,
  Tag,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { Agent, Task, ChecklistItem, Comment, Deliverable } from '@/types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types';
import { toast } from 'sonner';
import AgentAvatar from './AgentAvatar';
import ChecklistPanel from './ChecklistPanel';
import CommentThread from './CommentThread';
import DeliverablesPanel from './DeliverablesPanel';

type Tab = 'details' | 'checklist' | 'comments' | 'deliverables';

interface TaskEditModalProps {
  task: Task;
  agents: Agent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'deliverables', label: 'Deliverables', icon: Package },
];

export default function TaskEditModal({ task, agents, open, onOpenChange }: TaskEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [localTask, setLocalTask] = useState<Task>(task);
  const [loading, setLoading] = useState(false);

  // Sync when task changes from outside (WebSocket updates)
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  // Load full task from API on open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadFull() {
      setLoading(true);
      try {
        const res = await fetch(`/api/cluster/tasks/${task.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          // Merge cluster data into local task
          setLocalTask(prev => ({
            ...prev,
            checklist: data.checklist ?? prev.checklist ?? [],
            comments: data.comments ?? prev.comments ?? [],
            deliverables: data.deliverables ?? prev.deliverables ?? [],
            labels: data.labels ?? prev.labels ?? [],
            assignees: data.assignees ?? prev.assignees ?? [],
          }));
        }
      } catch {
        // Keep existing data on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFull();
    return () => { cancelled = true; };
  }, [open, task.id]);

  const priority = PRIORITY_CONFIG[localTask.priority];
  const status = STATUS_CONFIG[localTask.status];
  const assignee = localTask.assigneeId
    ? agents.find(a => a.id === localTask.assigneeId)
    : null;

  const checklist = localTask.checklist ?? [];
  const comments = localTask.comments ?? [];
  const deliverables = localTask.deliverables ?? [];

  const checkedCount = checklist.filter(i => i.checked).length;

  // ── API helpers ─────────────────────────────────────────────────────

  const patchTask = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/cluster/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      toast.error('Failed to update task', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [task.id]);

  const handleChecklistToggle = useCallback(async (idx: number, checked: boolean) => {
    // Optimistic update
    setLocalTask(prev => ({
      ...prev,
      checklist: (prev.checklist ?? []).map((item, i) =>
        i === idx ? { ...item, checked } : item
      ),
    }));

    try {
      await fetch(`/api/cluster/tasks/${task.id}/checklist/${idx}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      });
    } catch {
      // Revert on failure
      setLocalTask(prev => ({
        ...prev,
        checklist: (prev.checklist ?? []).map((item, i) =>
          i === idx ? { ...item, checked: !checked } : item
        ),
      }));
    }
  }, [task.id]);

  const handleChecklistAdd = useCallback(async (text: string) => {
    const newItem: ChecklistItem = { text, checked: false };
    // Optimistic
    setLocalTask(prev => ({
      ...prev,
      checklist: [...(prev.checklist ?? []), newItem],
    }));

    try {
      await fetch(`/api/cluster/tasks/${task.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch {
      // Revert
      setLocalTask(prev => ({
        ...prev,
        checklist: (prev.checklist ?? []).slice(0, -1),
      }));
    }
  }, [task.id]);

  const handleCommentAdd = useCallback(async (text: string) => {
    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      author: 'You',
      text,
      createdAt: new Date().toISOString(),
    };
    // Optimistic
    setLocalTask(prev => ({
      ...prev,
      comments: [...(prev.comments ?? []), optimistic],
    }));

    try {
      const res = await fetch(`/api/cluster/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Replace optimistic with real
      setLocalTask(prev => ({
        ...prev,
        comments: (prev.comments ?? []).map(c =>
          c.id === optimistic.id ? (data.comment ?? data) : c
        ),
      }));
    } catch {
      // Revert
      setLocalTask(prev => ({
        ...prev,
        comments: (prev.comments ?? []).filter(c => c.id !== optimistic.id),
      }));
    }
  }, [task.id]);

  const handleDeliverableAdd = useCallback(async (deliverable: { type: string; name: string; url?: string }) => {
    const optimistic: Deliverable = {
      id: `temp-${Date.now()}`,
      type: deliverable.type,
      name: deliverable.name,
      url: deliverable.url ?? null,
      createdAt: new Date().toISOString(),
    };
    // Optimistic
    setLocalTask(prev => ({
      ...prev,
      deliverables: [...(prev.deliverables ?? []), optimistic],
    }));

    try {
      const res = await fetch(`/api/cluster/tasks/${task.id}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliverable),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalTask(prev => ({
        ...prev,
        deliverables: (prev.deliverables ?? []).map(d =>
          d.id === optimistic.id ? (data.deliverable ?? data) : d
        ),
      }));
    } catch {
      setLocalTask(prev => ({
        ...prev,
        deliverables: (prev.deliverables ?? []).filter(d => d.id !== optimistic.id),
      }));
    }
  }, [task.id]);

  // Badge counts for tabs
  const tabBadge = (tab: Tab): string | null => {
    switch (tab) {
      case 'checklist': return checklist.length > 0 ? `${checkedCount}/${checklist.length}` : null;
      case 'comments': return comments.length > 0 ? String(comments.length) : null;
      case 'deliverables': return deliverables.length > 0 ? String(deliverables.length) : null;
      default: return null;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>

        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-hidden z-50 rounded-2xl flex flex-col"
            style={{
              background: 'linear-gradient(180deg, hsl(240 5% 12%) 0%, hsl(240 5% 10%) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      color: priority.color,
                      backgroundColor: priority.bgColor,
                      border: `1px solid ${priority.color}30`,
                    }}
                  >
                    {priority.label}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5"
                    style={{
                      color: status.color,
                      backgroundColor: status.bgColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {localTask.id.slice(0, 8)}
                  </span>
                </div>

                <Dialog.Title className="text-lg font-semibold text-foreground leading-tight">
                  {localTask.title}
                </Dialog.Title>
              </div>

              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-4 pb-0">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const badge = tabBadge(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all duration-200 border-b-2",
                      isActive
                        ? "text-foreground border-green-500 bg-secondary/50"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/30"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {badge && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-tabular",
                        isActive
                          ? "bg-green-500/20 text-green-500"
                          : "bg-secondary text-muted-foreground/60"
                      )}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {loading && (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground/40 animate-spin ml-auto" />
              )}
            </div>

            {/* Tab border */}
            <div className="h-px bg-border/30 mx-6" />

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 pt-4">
              <AnimatePresence mode="wait">
                {activeTab === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    {/* Description */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                        Description
                      </label>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {localTask.description || 'No description'}
                      </p>
                    </div>

                    {/* Tags */}
                    {localTask.tags.length > 0 && (
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {localTask.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground border border-border/50"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-background/50 border border-border/50">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                          Created
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-tabular" suppressHydrationWarning>
                            {timeAgo(localTask.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                          Lane
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {localTask.lane || localTask.status}
                        </span>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-2">
                        Assigned to
                      </label>
                      {assignee ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
                          <AgentAvatar agent={assignee} size="md" showStatus />
                          <div>
                            <span className="text-sm font-medium text-foreground">{assignee.name}</span>
                            <span className="text-xs text-muted-foreground block">{assignee.role}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/50 italic py-2">
                          No one assigned yet
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'checklist' && (
                  <motion.div
                    key="checklist"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChecklistPanel
                      taskId={localTask.id}
                      items={checklist}
                      onToggle={handleChecklistToggle}
                      onAdd={handleChecklistAdd}
                    />
                  </motion.div>
                )}

                {activeTab === 'comments' && (
                  <motion.div
                    key="comments"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CommentThread
                      taskId={localTask.id}
                      comments={comments}
                      onAdd={handleCommentAdd}
                    />
                  </motion.div>
                )}

                {activeTab === 'deliverables' && (
                  <motion.div
                    key="deliverables"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DeliverablesPanel
                      taskId={localTask.id}
                      deliverables={deliverables}
                      onAdd={handleDeliverableAdd}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {localTask.id}
              </span>
              <div className="flex items-center gap-2">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    Close
                  </button>
                </Dialog.Close>
                <span className="kbd">ESC</span>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
