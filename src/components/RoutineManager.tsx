'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Calendar, Play, Pause, Trash2, Zap } from 'lucide-react';
import { useRoutines } from '@/lib/useRoutines';
import RoutineForm from './RoutineForm';
import type { Agent, Routine } from '@/types';
import { timeAgo as timeAgoUtil } from '@/lib/utils';

interface RoutineManagerProps {
  agents: Agent[];
  onClose: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeAgo(ts?: number): string {
  if (!ts) return 'Never';
  return timeAgoUtil(ts);
}

function formatNextRun(ts?: number): string {
  if (!ts) return 'Not scheduled';
  return new Date(ts).toLocaleString([], {
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function RoutineManager({ agents, onClose }: RoutineManagerProps) {
  const { routines, loading, create, toggle, trigger, remove } = useRoutines();
  const [showForm, setShowForm] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full sm:max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl
                   p-6 max-h-[85vh] overflow-y-auto"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--accent-primary)]" />
            <h2 className="text-lg font-semibold text-foreground">Routines</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] text-white
                         text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border">
            <RoutineForm
              agents={agents}
              onSubmit={async (input) => { await create(input); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : routines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No routines configured. Create one to automate recurring tasks.
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map(routine => (
              <div
                key={routine.id}
                className={`p-4 rounded-xl border transition-colors ${
                  routine.enabled
                    ? 'bg-background border-border'
                    : 'bg-muted/20 border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{routine.name}</h3>
                    {routine.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{routine.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => trigger(routine.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title="Manual trigger"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <button
                      onClick={() => toggle(routine.id, !routine.enabled)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title={routine.enabled ? 'Disable' : 'Enable'}
                    >
                      {routine.enabled
                        ? <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                        : <Play className="w-3.5 h-3.5 text-green-400" />
                      }
                    </button>
                    <button
                      onClick={() => remove(routine.id)}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>
                    {routine.schedule.days?.map(d => DAYS[d]).join(', ')} at {routine.schedule.time}
                  </span>
                  <span>Last: {timeAgo(routine.lastRunAt)}</span>
                  <span>Next: {formatNextRun(routine.nextRunAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
