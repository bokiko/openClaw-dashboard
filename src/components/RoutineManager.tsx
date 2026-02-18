'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Plus, ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import RoutineCard from './RoutineCard';
import RoutineForm from './RoutineForm';
import type { Routine } from './RoutineCard';
import type { RoutineFormData } from './RoutineForm';

export function RoutineManager() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>(undefined);

  // Fetch routines from the cluster (via Next.js proxy)
  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch('/api/gateway/routines', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutines(data.routines || []);
    } catch (err) {
      console.error('Failed to fetch routines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  // Create routine
  const handleCreate = useCallback(async (formData: RoutineFormData) => {
    try {
      const res = await fetch('/api/gateway/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutines(prev => [data.routine, ...prev]);
      setShowForm(false);
      toast.success('Routine created', { description: formData.name, duration: 2000 });
    } catch (err) {
      toast.error('Failed to create routine', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  // Update routine
  const handleUpdate = useCallback(async (formData: RoutineFormData) => {
    if (!editingRoutine) return;
    try {
      const res = await fetch(`/api/gateway/routines/${editingRoutine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutines(prev => prev.map(r => r.id === data.routine.id ? data.routine : r));
      setEditingRoutine(undefined);
      setShowForm(false);
      toast.success('Routine updated', { description: formData.name, duration: 2000 });
    } catch (err) {
      toast.error('Failed to update routine', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [editingRoutine]);

  // Toggle enable/disable via PATCH with enabled field
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/gateway/routines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutines(prev => prev.map(r => r.id === data.routine.id ? data.routine : r));
      toast.success(`Routine ${enabled ? 'enabled' : 'disabled'}`, { duration: 1500 });
    } catch (err) {
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} routine`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  // Trigger now
  const handleTrigger = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/gateway/routines/${id}/trigger`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutines(prev => prev.map(r => r.id === data.routine.id ? data.routine : r));
      toast.success('Routine triggered', {
        description: `Task ${data.task?.id?.slice(0, 8)} created`,
        duration: 2000,
      });
    } catch (err) {
      toast.error('Failed to trigger routine', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  // Click to edit
  const handleClick = useCallback((id: string) => {
    const routine = routines.find(r => r.id === id);
    if (routine) {
      setEditingRoutine(routine);
      setShowForm(true);
    }
  }, [routines]);

  const enabledCount = routines.filter(r => r.enabled).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(33,34,37,0.8), rgba(24,25,27,0.9))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 2px 4px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <CalendarClock className="w-5 h-5 text-[#3e63dd]" />
          <h2 className="font-semibold text-white">Routines</h2>
          <span className="text-xs text-muted-foreground/60 font-tabular">
            {enabledCount} active / {routines.length} total
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-[#697177]" />
          </motion.div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRoutines()}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => {
              setEditingRoutine(undefined);
              setShowForm(true);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              "bg-[#3e63dd]/10 text-[#3e63dd] border border-[#3e63dd]/20",
              "hover:bg-[#3e63dd]/20 hover:border-[#3e63dd]/40"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            New Routine
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-6">
              {loading && routines.length === 0 && (
                <div className="flex items-center justify-center h-[120px]">
                  <div className="inline-block w-6 h-6 border-2 border-[#3e63dd] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loading && routines.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[120px] rounded-xl border border-dashed border-border/30 bg-gradient-to-b from-transparent to-background/30">
                  <CalendarClock className="w-6 h-6 text-muted-foreground/30 mb-2" />
                  <span className="text-xs text-muted-foreground/50">
                    No routines yet. Create one to schedule recurring tasks.
                  </span>
                </div>
              )}

              {routines.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {routines.map(routine => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        onToggle={handleToggle}
                        onTrigger={handleTrigger}
                        onClick={handleClick}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <RoutineForm
            routine={editingRoutine}
            onSubmit={editingRoutine ? handleUpdate : handleCreate}
            onClose={() => {
              setShowForm(false);
              setEditingRoutine(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
