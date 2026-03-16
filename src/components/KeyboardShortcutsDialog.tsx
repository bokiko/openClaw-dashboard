'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  heading: string;
  shortcuts: ShortcutItem[];
}

function useModKey() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac') ?? false);
  }, []);
  return isMac ? '⌘' : 'Ctrl';
}

const SHORTCUT_GROUPS: (mod: string) => ShortcutGroup[] = (mod) => [
  {
    heading: 'Quick Actions',
    shortcuts: [
      { keys: [`${mod}`, 'K'], label: 'Open command palette' },
      { keys: ['N'], label: 'Create new task' },
      { keys: ['R'], label: 'Refresh data' },
      { keys: ['F'], label: 'Toggle live feed' },
    ],
  },
  {
    heading: 'Navigation',
    shortcuts: [
      { keys: ['1'], label: 'Mission Control' },
      { keys: ['2'], label: 'Team Activity' },
      { keys: ['A'], label: 'View agents' },
      { keys: ['T'], label: 'View tasks' },
      { keys: ['M'], label: 'View messages' },
      { keys: ['O'], label: 'View routines' },
    ],
  },
  {
    heading: 'Settings',
    shortcuts: [
      { keys: ['D'], label: 'Toggle theme' },
      { keys: ['S'], label: 'Toggle sounds' },
      { keys: ['?'], label: 'Keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close dialog / panel' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const mod = useModKey();
  const groups = SHORTCUT_GROUPS(mod);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
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
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="fixed top-[10%] sm:top-[20%] left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-full max-w-lg z-50 rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--surface-modal)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--surface-modal-border)',
                  boxShadow: 'var(--shadow-modal)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Keyboard className="w-5 h-5 text-muted-foreground" />
                    <Dialog.Title className="text-base font-semibold text-foreground">
                      Keyboard Shortcuts
                    </Dialog.Title>
                  </div>
                  <Dialog.Close className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Dialog.Close>
                </div>

                {/* Body */}
                <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
                  {groups.map((group) => (
                    <div key={group.heading}>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                        {group.heading}
                      </h3>
                      <div className="space-y-1">
                        {group.shortcuts.map((shortcut) => (
                          <div
                            key={shortcut.label}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-sm text-foreground/80">{shortcut.label}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, i) => (
                                <span key={i}>
                                  {i > 0 && (
                                    <span className="text-[10px] text-muted-foreground/50 mx-0.5">+</span>
                                  )}
                                  <kbd className="inline-block px-1.5 py-0.5 text-xs text-muted-foreground bg-secondary rounded border border-border font-mono min-w-[24px] text-center">
                                    {key}
                                  </kbd>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground text-center">
                  Single-key shortcuts are disabled when an input is focused
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
