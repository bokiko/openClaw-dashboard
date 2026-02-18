'use client';

import { cn } from '@/lib/utils';
import type { Priority } from '@/types';
import { PRIORITY_CONFIG } from '@/types';

interface PriorityPickerProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

const priorities: Priority[] = [0, 1, 2];

export default function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {priorities.map((p) => {
        const config = PRIORITY_CONFIG[p];
        const isActive = value === p;

        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border",
              isActive
                ? "ring-1 ring-offset-1 ring-offset-background"
                : "opacity-50 hover:opacity-80"
            )}
            style={{
              color: config.color,
              backgroundColor: isActive ? config.bgColor : 'transparent',
              borderColor: `${config.color}${isActive ? '60' : '20'}`,
              ...(isActive && { ringColor: config.color }),
            }}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
