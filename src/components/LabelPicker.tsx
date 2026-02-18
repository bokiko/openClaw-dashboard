'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelPickerProps {
  value: string[];
  onChange: (labels: string[]) => void;
  placeholder?: string;
}

export default function LabelPicker({ value, onChange, placeholder = 'Add label...' }: LabelPickerProps) {
  const [input, setInput] = useState('');

  const addLabel = useCallback((text: string) => {
    const trimmed = text.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  }, [value, onChange]);

  const removeLabel = useCallback((label: string) => {
    onChange(value.filter(l => l !== label));
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addLabel(input);
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeLabel(value[value.length - 1]);
    }
  }, [input, value, addLabel, removeLabel]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-background/50 border border-border/50 min-h-[40px] focus-within:border-border transition-colors">
      {value.map(label => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border/50 group"
        >
          <Tag className="w-2.5 h-2.5 text-muted-foreground/60" />
          {label}
          <button
            type="button"
            onClick={() => removeLabel(label)}
            className="ml-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addLabel(input); }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
      />
    </div>
  );
}
