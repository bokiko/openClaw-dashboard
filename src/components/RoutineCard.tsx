'use client';

import { motion } from 'framer-motion';
import { Clock, Play, CalendarDays, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Routine {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    type: string;
    daysOfWeek: number[];
    hour: number;
    minute: number;
    timezone: string;
  };
  prompt: string;
  priority: number;
  requiredSkills: string[];
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoutineCardProps {
  routine: Routine;
  onToggle: (id: string, enabled: boolean) => void;
  onTrigger: (id: string) => void;
  onClick: (id: string) => void;
}

function formatSchedule(schedule: Routine['schedule']): string {
  const days = schedule.daysOfWeek
    .sort((a, b) => a - b)
    .map(d => DAY_LABELS[d])
    .join('/');
  const hour = String(schedule.hour).padStart(2, '0');
  const minute = String(schedule.minute).padStart(2, '0');
  return `${days} at ${hour}:${minute}`;
}

function getNextTrigger(schedule: Routine['schedule']): string {
  const now = new Date();
  // Use the routine's timezone to get current local time
  const localStr = now.toLocaleString('en-US', { timeZone: schedule.timezone });
  const local = new Date(localStr);

  const currentDay = local.getDay();
  const currentMinutes = local.getHours() * 60 + local.getMinutes();
  const scheduledMinutes = schedule.hour * 60 + schedule.minute;

  const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);
  if (sortedDays.length === 0) return 'No days selected';

  // Find the next day (could be today if time hasn't passed)
  let daysUntil = Infinity;
  for (const day of sortedDays) {
    let diff = day - currentDay;
    if (diff < 0) diff += 7;
    if (diff === 0 && currentMinutes >= scheduledMinutes) diff = 7;
    if (diff < daysUntil) daysUntil = diff;
  }

  if (daysUntil === 0) {
    const minsLeft = scheduledMinutes - currentMinutes;
    if (minsLeft < 60) return `in ${minsLeft}m`;
    return `in ${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`;
  }

  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
}

export default function RoutineCard({ routine, onToggle, onTrigger, onClick }: RoutineCardProps) {
  const priorityColor = routine.priority >= 8 ? '#e54d2e' : routine.priority >= 5 ? '#ffb224' : '#697177';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="card-premium p-5 cursor-pointer group relative"
      onClick={() => onClick(routine.id)}
    >
      {/* Header: Name + Toggle */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-white transition-colors truncate">
            {routine.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {routine.prompt}
          </p>
        </div>

        {/* Enable/Disable toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(routine.id, !routine.enabled);
          }}
          className={cn(
            "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
            routine.enabled ? "bg-green-500/30" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200",
              routine.enabled
                ? "left-5.5 bg-green-500 shadow-[0_0_8px_rgba(70,167,88,0.5)]"
                : "left-0.5 bg-muted-foreground/50"
            )}
            style={routine.enabled ? { left: '22px' } : { left: '2px' }}
          />
        </button>
      </div>

      {/* Schedule visualization */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <span className="text-xs text-muted-foreground font-medium">
          {formatSchedule(routine.schedule)}
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto">
          {routine.schedule.timezone}
        </span>
      </div>

      {/* Day-of-week dots */}
      <div className="flex items-center gap-1.5 mb-3">
        {DAY_LABELS.map((label, idx) => {
          const isActive = routine.schedule.daysOfWeek.includes(idx);
          return (
            <span
              key={label}
              className={cn(
                "w-7 h-6 rounded-md flex items-center justify-center text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-[#3e63dd]/20 text-[#3e63dd] border border-[#3e63dd]/30"
                  : "bg-secondary/30 text-muted-foreground/30"
              )}
            >
              {label.charAt(0)}
            </span>
          );
        })}
      </div>

      {/* Meta row: next trigger, last triggered, priority */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-3">
          {/* Next trigger */}
          {routine.enabled && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">
                Next: {getNextTrigger(routine.schedule)}
              </span>
            </div>
          )}

          {/* Last triggered */}
          {routine.lastTriggeredAt && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                {timeAgo(new Date(routine.lastTriggeredAt).getTime())}
              </span>
            </div>
          )}

          {!routine.enabled && (
            <span className="text-[10px] text-muted-foreground/40 italic">Disabled</span>
          )}
        </div>

        {/* Trigger Now button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTrigger(routine.id);
          }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-200",
            "bg-secondary/50 text-muted-foreground border border-border/50",
            "hover:bg-[#3e63dd]/10 hover:text-[#3e63dd] hover:border-[#3e63dd]/30"
          )}
        >
          <Play className="w-3 h-3" />
          Trigger
        </button>
      </div>

      {/* Priority indicator */}
      <div
        className="absolute top-0 left-0 w-0.5 h-full rounded-l-2xl"
        style={{ backgroundColor: priorityColor }}
      />
    </motion.div>
  );
}
