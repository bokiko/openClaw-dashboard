'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Agent, Priority } from '@/types';
import PriorityPicker from './PriorityPicker';
import LabelPicker from './LabelPicker';
import AssigneePicker from './AssigneePicker';

interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
}

export default function TaskCreateModal({ open, onOpenChange, agents }: TaskCreateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [priority, setPriority] = useState<Priority>(2);
  const [labels, setLabels] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setPrompt('');
    setPriority(2);
    setLabels([]);
    setSkills([]);
    setAssignees([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/cluster/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          priority: priority === 0 ? 10 : priority === 1 ? 7 : 3, // Map back to cluster scale (1-10)
          labels,
          requiredSkills: skills,
          assignees,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      toast.success('Task created', {
        description: trimmed.slice(0, 60),
        duration: 3000,
      });

      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create task', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [prompt, priority, labels, skills, assignees, submitting, resetForm, onOpenChange]);

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
            className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto z-50 rounded-2xl p-6"
            style={{
              background: 'linear-gradient(180deg, hsl(240 5% 12%) 0%, hsl(240 5% 10%) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Create Task
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Prompt */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                  Task Prompt
                </label>
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the task for the swarm..."
                  rows={4}
                  className="w-full resize-none text-sm bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border transition-colors leading-relaxed"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                  Priority
                </label>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>

              {/* Labels */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                  Labels
                </label>
                <LabelPicker value={labels} onChange={setLabels} />
              </div>

              {/* Skills */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                  Required Skills
                </label>
                <LabelPicker
                  value={skills}
                  onChange={setSkills}
                  placeholder="Add skill..."
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                  Assignees
                </label>
                <AssigneePicker
                  agents={agents}
                  value={assignees}
                  onChange={setAssignees}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/50">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || submitting}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  prompt.trim() && !submitting
                    ? "bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/30"
                    : "bg-secondary text-muted-foreground/30 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Create Task</span>
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
