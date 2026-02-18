'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Routine } from './RoutineCard';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIMEZONES = [
  'Asia/Kuwait',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
];

interface RoutineFormProps {
  routine?: Routine;
  onSubmit: (data: RoutineFormData) => void;
  onClose: () => void;
}

export interface RoutineFormData {
  name: string;
  prompt: string;
  priority: number;
  requiredSkills: string[];
  schedule: {
    type: 'weekly';
    daysOfWeek: number[];
    hour: number;
    minute: number;
    timezone: string;
  };
}

export default function RoutineForm({ routine, onSubmit, onClose }: RoutineFormProps) {
  const [name, setName] = useState(routine?.name || '');
  const [prompt, setPrompt] = useState(routine?.prompt || '');
  const [priority, setPriority] = useState(routine?.priority ?? 5);
  const [skills, setSkills] = useState(routine?.requiredSkills?.join(', ') || '');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(routine?.schedule?.daysOfWeek || [1, 3, 5]);
  const [hour, setHour] = useState(routine?.schedule?.hour ?? 9);
  const [minute, setMinute] = useState(routine?.schedule?.minute ?? 0);
  const [timezone, setTimezone] = useState(routine?.schedule?.timezone || 'Asia/Kuwait');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!routine;

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim() || daysOfWeek.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        prompt: prompt.trim(),
        priority,
        requiredSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
        schedule: {
          type: 'weekly',
          daysOfWeek,
          hour,
          minute,
          timezone,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="modal-content max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Routine' : 'Create Routine'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Daily standup summary"
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#3e63dd]/50 focus:ring-1 focus:ring-[#3e63dd]/20 transition-colors"
              required
            />
          </div>

          {/* Prompt (task template) */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
              Prompt (Task Template)
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Summarize yesterday's completed tasks and prepare today's priorities..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#3e63dd]/50 focus:ring-1 focus:ring-[#3e63dd]/20 transition-colors resize-none"
              required
            />
          </div>

          {/* Priority + Skills row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-[#3e63dd]/50 focus:ring-1 focus:ring-[#3e63dd]/20 transition-colors"
              >
                <option value={10}>Urgent (10)</option>
                <option value={8}>High (8)</option>
                <option value={5}>Normal (5)</option>
                <option value={1}>Low (1)</option>
              </select>
            </div>

            {/* Skills */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="coding, research"
                className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#3e63dd]/50 focus:ring-1 focus:ring-[#3e63dd]/20 transition-colors"
              />
            </div>
          </div>

          {/* Schedule section */}
          <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block">
              Schedule
            </span>

            {/* Day-of-week multi-select */}
            <div>
              <label className="text-xs text-muted-foreground block mb-2">
                Days of the week
              </label>
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map((label, idx) => {
                  const isActive = daysOfWeek.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        "w-9 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-200",
                        isActive
                          ? "bg-[#3e63dd]/20 text-[#3e63dd] border border-[#3e63dd]/40 shadow-sm"
                          : "bg-secondary/30 text-muted-foreground/40 border border-transparent hover:border-border/50 hover:text-muted-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time picker */}
            <div className="grid grid-cols-3 gap-3">
              {/* Hour */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Hour</label>
                <select
                  value={hour}
                  onChange={e => setHour(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground font-tabular focus:outline-none focus:border-[#3e63dd]/50 transition-colors"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Minute</label>
                <select
                  value={minute}
                  onChange={e => setMinute(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground font-tabular focus:outline-none focus:border-[#3e63dd]/50 transition-colors"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground focus:outline-none focus:border-[#3e63dd]/50 transition-colors"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !prompt.trim() || daysOfWeek.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                "bg-[#3e63dd] text-white hover:bg-[#3e63dd]/90",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Routine'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
