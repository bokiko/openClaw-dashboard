'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '@/types';

interface ChecklistPanelProps {
  taskId: string;
  items: ChecklistItem[];
  onToggle: (index: number, checked: boolean) => void;
  onAdd: (text: string) => void;
}

export default function ChecklistPanel({ taskId, items, onToggle, onAdd }: ChecklistPanelProps) {
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const checkedCount = items.filter(i => i.checked).length;
  const total = items.length;
  const progress = total > 0 ? (checkedCount / total) * 100 : 0;

  const handleAdd = useCallback(() => {
    const text = newItem.trim();
    if (!text) return;
    onAdd(text);
    setNewItem('');
  }, [newItem, onAdd]);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="text-muted-foreground/70 font-tabular">
              {checkedCount}/{total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                background: progress === 100
                  ? 'var(--green, #46a758)'
                  : 'var(--blue, #3e63dd)',
              }}
            />
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => (
            <motion.button
              key={`${taskId}-${idx}`}
              type="button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              onClick={() => onToggle(idx, !item.checked)}
              className={cn(
                "w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                "hover:bg-secondary/30 group"
              )}
            >
              {item.checked ? (
                <CheckSquare className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
              ) : (
                <Square className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
              )}
              <span className={cn(
                "text-sm leading-relaxed transition-all",
                item.checked
                  ? "text-muted-foreground/50 line-through"
                  : "text-foreground"
              )}>
                {item.text}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Add new item */}
      {adding ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewItem(''); }
            }}
            placeholder="New checklist item..."
            className="flex-1 text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border transition-colors"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewItem(''); }}
            className="px-3 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-3 py-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add item</span>
        </button>
      )}

      {/* Empty state */}
      {total === 0 && !adding && (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground/40">No checklist items yet</p>
        </div>
      )}
    </div>
  );
}
