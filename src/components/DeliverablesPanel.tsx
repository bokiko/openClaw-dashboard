'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Code, Image, Link, Package, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { Deliverable } from '@/types';

interface DeliverablesPanelProps {
  taskId: string;
  deliverables: Deliverable[];
  onAdd: (deliverable: { type: string; name: string; url?: string }) => void;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  file: FileText,
  code: Code,
  image: Image,
  link: Link,
  package: Package,
};

const TYPE_COLORS: Record<string, string> = {
  file: '#3e63dd',
  code: '#8e4ec6',
  image: '#e879a4',
  link: '#00a2c7',
  package: '#ffb224',
};

const DELIVERABLE_TYPES = ['file', 'code', 'image', 'link', 'package'];

export default function DeliverablesPanel({ taskId, deliverables, onAdd }: DeliverablesPanelProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('file');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    onAdd({
      type: newType,
      name,
      url: newUrl.trim() || undefined,
    });
    setNewName('');
    setNewUrl('');
    setNewType('file');
    setAdding(false);
  }, [newName, newType, newUrl, onAdd]);

  return (
    <div className="space-y-3">
      {/* Deliverable list */}
      <AnimatePresence mode="popLayout">
        {deliverables.map((d) => {
          const Icon = TYPE_ICONS[d.type] || File;
          const color = TYPE_COLORS[d.type] || '#697177';

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/30 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}25`,
                }}
              >
                <Icon className="w-4 h-4" color={color} />
              </div>

              <div className="flex-1 min-w-0">
                {d.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:underline truncate block"
                  >
                    {d.name}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-foreground truncate block">
                    {d.name}
                  </span>
                )}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                  <span className="capitalize">{d.type}</span>
                  {d.createdAt && (
                    <>
                      <span>-</span>
                      <span className="font-tabular" suppressHydrationWarning>
                        {timeAgo(new Date(d.createdAt).getTime())}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {deliverables.length === 0 && !adding && (
        <div className="text-center py-6">
          <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground/40">No deliverables yet</p>
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="space-y-2 p-3 rounded-xl bg-background/50 border border-border/50">
          {/* Type selector */}
          <div className="flex items-center gap-1.5">
            {DELIVERABLE_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t] || File;
              const color = TYPE_COLORS[t] || '#697177';
              const isActive = newType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    isActive ? "bg-secondary" : "hover:bg-secondary/30"
                  )}
                  title={t}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    color={isActive ? color : 'hsl(var(--muted-foreground))'}
                  />
                </button>
              );
            })}
          </div>

          {/* Name input */}
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewUrl(''); }
            }}
            placeholder="Deliverable name..."
            className="w-full text-sm bg-transparent border border-border/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border transition-colors"
          />

          {/* URL input */}
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewUrl(''); }
            }}
            placeholder="URL (optional)..."
            className="w-full text-sm bg-transparent border border-border/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border transition-colors"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setNewUrl(''); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                newName.trim()
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-secondary/50 text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-3 py-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add deliverable</span>
        </button>
      )}
    </div>
  );
}
