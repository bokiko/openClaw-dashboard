'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center',
        compact ? 'py-6 gap-1' : 'py-12 gap-1.5',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center',
          compact ? 'w-8 h-8' : 'w-12 h-12',
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground/50',
            compact ? 'w-3.5 h-3.5' : 'w-5 h-5',
          )}
        />
      </div>

      <span
        className={cn(
          'font-medium text-muted-foreground/70',
          compact ? 'text-xs mt-1.5' : 'text-sm mt-3',
        )}
      >
        {title}
      </span>

      {description && (
        <span
          className={cn(
            'text-muted-foreground/50 text-center max-w-[200px]',
            compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1',
          )}
        >
          {description}
        </span>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
