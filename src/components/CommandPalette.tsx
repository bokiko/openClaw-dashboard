'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Zap,
  Users,
  ListTodo,
  Settings,
  Moon,
  Sun,
  Bell,
  RefreshCw,
  Plus,
  Filter,
  Keyboard,
  MessageSquare,
  Activity,
  FileText,
  BarChart3,
} from 'lucide-react'
import type { ClusterTask, ClusterWorker } from '@/types'

interface CommandPaletteProps {
  onAction?: (action: string, payload?: unknown) => void
  tasks?: ClusterTask[]
  agents?: ClusterWorker[]
}

interface CommandItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

interface CommandGroup {
  heading: string
  commands: CommandItem[]
}

const GROUPS: CommandGroup[] = [
  {
    heading: 'Quick Actions',
    commands: [
      { id: 'new-task', label: 'Create New Task', icon: Plus, shortcut: 'N' },
      { id: 'refresh', label: 'Refresh Data', icon: RefreshCw, shortcut: 'R' },
      { id: 'toggle-feed', label: 'Toggle Live Feed', icon: Activity, shortcut: 'F' },
    ],
  },
  {
    heading: 'Navigation',
    commands: [
      { id: 'goto-dashboard', label: 'Switch to Mission Control', icon: BarChart3, shortcut: '1' },
      { id: 'goto-activity', label: 'Switch to Team Activity', icon: Users, shortcut: '2' },
      { id: 'view-agents', label: 'View All Agents', icon: Users, shortcut: 'A' },
      { id: 'view-tasks', label: 'View All Tasks', icon: ListTodo, shortcut: 'T' },
      { id: 'view-messages', label: 'View Messages', icon: MessageSquare, shortcut: 'M' },
      { id: 'view-routines', label: 'View Routines', icon: RefreshCw, shortcut: 'O' },
    ],
  },
  {
    heading: 'Filters',
    commands: [
      { id: 'filter-spark', label: 'Filter: Spark Tasks', icon: Filter },
      { id: 'filter-scout', label: 'Filter: Scout Tasks', icon: Filter },
      { id: 'filter-urgent', label: 'Filter: Urgent Only', icon: Zap },
      { id: 'filter-in-progress', label: 'Filter: In Progress', icon: Filter },
    ],
  },
  {
    heading: 'Settings',
    commands: [
      { id: 'toggle-theme', label: 'Toggle Theme', icon: Moon, shortcut: 'D' },
      { id: 'toggle-sounds', label: 'Toggle Sounds', icon: Bell, shortcut: 'S' },
      { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, shortcut: '?' },
      { id: 'settings', label: 'Open Settings', icon: Settings, shortcut: ',' },
    ],
  },
  {
    heading: 'Reports',
    commands: [
      { id: 'export-report', label: 'Export Weekly Report', icon: FileText },
      { id: 'view-metrics', label: 'View Detailed Metrics', icon: Activity },
    ],
  },
]

export function CommandPalette({ onAction, tasks = [], agents = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return tasks
      .filter(t => t.prompt?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q))
      .slice(0, 5)
  }, [search, tasks])

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return agents
      .filter(a => a.name?.toLowerCase().includes(q) || a.model?.toLowerCase().includes(q) || a.provider?.toLowerCase().includes(q))
      .slice(0, 5)
  }, [search, agents])

  // Toggle with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback(
    (commandId: string, payload?: unknown) => {
      setOpen(false)
      setSearch('')
      onAction?.(commandId, payload)
    },
    [onAction]
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[10%] sm:top-[20%] left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-full max-w-xl z-50"
          >
            <Command
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-modal)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--surface-modal-border)',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs text-muted-foreground bg-secondary rounded border border-border">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-muted-foreground text-sm">
                  No results found.
                </Command.Empty>

                {/* Dynamic: Tasks matching search */}
                {filteredTasks.length > 0 && (
                  <Command.Group key="tasks-dynamic" heading="Tasks" className="mb-2">
                    <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tasks
                    </div>
                    {filteredTasks.map((task) => {
                      const label = (task.prompt || task.id).slice(0, 60) + ((task.prompt || '').length > 60 ? '…' : '')
                      return (
                        <Command.Item
                          key={`task-${task.id}`}
                          value={`task-${task.id}-${label}`}
                          onSelect={() => handleSelect('open-task', { taskId: task.id })}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-foreground/70 hover:bg-muted hover:text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground transition-colors group"
                        >
                          <ListTodo className="w-4 h-4 text-muted-foreground group-hover:text-foreground/70 group-data-[selected=true]:text-foreground/70" />
                          <span className="flex-1 truncate">{label}</span>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded border border-border">
                            {task.status}
                          </span>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )}

                {/* Dynamic: Agents matching search */}
                {filteredAgents.length > 0 && (
                  <Command.Group key="agents-dynamic" heading="Agents" className="mb-2">
                    <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Agents
                    </div>
                    {filteredAgents.map((agent) => (
                      <Command.Item
                        key={`agent-${agent.id}`}
                        value={`agent-${agent.id}-${agent.name}`}
                        onSelect={() => handleSelect('open-agent', { agentId: agent.id })}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-foreground/70 hover:bg-muted hover:text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground transition-colors group"
                      >
                        <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground/70 group-data-[selected=true]:text-foreground/70" />
                        <span className="flex-1">{agent.name}</span>
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded border border-border">
                          {agent.provider}/{agent.model}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {GROUPS.map((group) => (
                  <Command.Group
                    key={group.heading}
                    heading={group.heading}
                    className="mb-2"
                  >
                    <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group.heading}
                    </div>
                    {group.commands.map((command) => (
                      <Command.Item
                        key={command.id}
                        value={command.label}
                        onSelect={() => handleSelect(command.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-foreground/70 hover:bg-muted hover:text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground transition-colors group"
                      >
                        <command.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground/70 group-data-[selected=true]:text-foreground/70" />
                        <span className="flex-1">{command.label}</span>
                        {command.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-xs text-muted-foreground bg-secondary rounded border border-border font-mono">
                            {command.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border">
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded border border-border">
                      ↵
                    </kbd>
                    Select
                  </span>
                </div>
                <span className="text-[var(--purple)]">OpenClaw</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
