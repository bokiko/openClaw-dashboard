'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  ChevronDown,
  BarChart3,
  PieChartIcon,
  Activity,
} from 'lucide-react'
import type { Task, Agent } from '@/types'

interface MetricsPanelProps {
  tasks: Task[]
  agents: Agent[]
}

type ChartType = 'activity' | 'agents' | 'status'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MetricsPanel({ tasks, agents }: MetricsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeChart, setActiveChart] = useState<ChartType>('activity')

  // ── Derive all data from props ──────────────────────────────────────

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length

    // Average completion time (done tasks with both timestamps)
    const doneTasks = tasks.filter(t => t.status === 'done' && t.updatedAt && t.createdAt)
    let avgTimeLabel = '—'
    if (doneTasks.length > 0) {
      const avgMs = doneTasks.reduce((sum, t) => sum + (t.updatedAt! - t.createdAt), 0) / doneTasks.length
      const avgHours = avgMs / (1000 * 60 * 60)
      avgTimeLabel = avgHours < 1
        ? `${Math.round(avgHours * 60)}m`
        : `${avgHours.toFixed(1)}h`
    }

    // Completion rate
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

    return [
      { label: 'Total Tasks', value: String(total), change: `${agents.filter(a => a.status === 'working').length} active`, positive: true, icon: CheckCircle2 },
      { label: 'Completed', value: String(done), change: `${completionPct}%`, positive: true, icon: TrendingUp },
      { label: 'Avg. Time', value: avgTimeLabel, change: `${doneTasks.length} done`, positive: true, icon: Clock },
      { label: 'In Progress', value: String(inProgress), change: `${tasks.filter(t => t.status === 'review').length} review`, positive: true, icon: Zap },
    ]
  }, [tasks, agents])

  const statusDistribution = useMemo(() => {
    const counts = {
      done: tasks.filter(t => t.status === 'done').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      inbox: tasks.filter(t => t.status === 'inbox').length,
      assigned: tasks.filter(t => t.status === 'assigned').length,
      review: tasks.filter(t => t.status === 'review').length,
      waiting: tasks.filter(t => t.status === 'waiting').length,
    }
    return [
      { name: 'Completed', value: counts.done, color: 'var(--green)', fallback: '#46a758' },
      { name: 'In Progress', value: counts['in-progress'], color: 'var(--blue)', fallback: '#3e63dd' },
      { name: 'Review', value: counts.review, color: 'var(--purple)', fallback: '#8e4ec6' },
      { name: 'Pending', value: counts.inbox + counts.assigned, color: 'var(--muted-chart, #697177)', fallback: '#697177' },
      { name: 'Waiting', value: counts.waiting, color: 'var(--red)', fallback: '#e54d2e' },
    ].filter(d => d.value > 0)
  }, [tasks])

  const agentPerformance = useMemo(() => {
    const agentMap = new Map(agents.map(a => [a.id, a]))
    const counts: Record<string, { done: number; inProgress: number; other: number }> = {}
    for (const task of tasks) {
      if (task.assigneeId) {
        if (!counts[task.assigneeId]) counts[task.assigneeId] = { done: 0, inProgress: 0, other: 0 }
        if (task.status === 'done') counts[task.assigneeId].done++
        else if (task.status === 'in-progress') counts[task.assigneeId].inProgress++
        else counts[task.assigneeId].other++
      }
    }
    return Object.entries(counts)
      .map(([id, c]) => ({
        name: agentMap.get(id)?.name || id.charAt(0).toUpperCase() + id.slice(1),
        done: c.done,
        inProgress: c.inProgress,
        other: c.other,
        total: c.done + c.inProgress + c.other,
        color: agentMap.get(id)?.color || '#697177',
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [tasks, agents])

  const activityData = useMemo(() => {
    const dayCounts: Record<string, number> = {}
    for (const name of DAY_NAMES) dayCounts[name] = 0
    for (const task of tasks) {
      const day = DAY_NAMES[new Date(task.createdAt).getDay()]
      dayCounts[day]++
    }
    // Start from Monday
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return order.map(day => ({ day, tasks: dayCounts[day] }))
  }, [tasks])

  const chartTabs: { id: ChartType; label: string; icon: React.ReactNode }[] = [
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'status', label: 'Status', icon: <PieChartIcon className="w-4 h-4" /> },
  ]

  // Empty state
  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'var(--surface-hover)' }}>
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--purple)' }} />
          <h2 className="font-semibold text-foreground">Metrics & Performance</h2>
        </div>
        <div className="px-6 pb-6 text-center py-8">
          <BarChart3 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No task data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add JSON task files to your tasks directory to see metrics
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between transition-colors"
        style={{ background: 'var(--surface-hover)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-active)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-hover)'}
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--purple)' }} />
          <h2 className="font-semibold text-foreground">Metrics & Performance</h2>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stats Row */}
            <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl transition-colors"
                  style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--surface-card-border)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--surface-card-hover-border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--surface-card-border)')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span
                      className="text-xs font-medium"
                      style={{ color: stat.positive ? 'var(--green)' : 'var(--red)' }}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Chart Tabs */}
            <div className="px-6 pb-2 flex gap-1">
              {chartTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={activeChart === tab.id
                    ? { background: 'var(--surface-active)', color: 'var(--foreground)' }
                    : { color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Charts */}
            <div className="px-6 pb-6">
              <AnimatePresence mode="wait">
                {activeChart === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <AreaChart data={activityData}>
                        <defs>
                          <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--purple, #8e4ec6)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--purple, #8e4ec6)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="tasks"
                          stroke="var(--purple, #8e4ec6)"
                          strokeWidth={2}
                          fill="url(#taskGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {activeChart === 'agents' && (
                  <motion.div
                    key="agents"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="h-[200px]"
                  >
                    {agentPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <BarChart data={agentPerformance} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))',
                            }}
                          />
                          <Bar dataKey="done" stackId="tasks" fill="var(--green, #46a758)" radius={[0, 0, 0, 0]} name="Done" />
                          <Bar dataKey="inProgress" stackId="tasks" fill="var(--blue, #3e63dd)" radius={[0, 0, 0, 0]} name="In Progress" />
                          <Bar dataKey="other" stackId="tasks" fill="var(--muted-chart, #697177)" radius={[0, 4, 4, 0]} name="Other" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No agent assignments yet</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeChart === 'status' && (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="h-[200px]"
                  >
                    <div className="flex items-center h-full gap-6">
                      {/* Donut Chart */}
                      <div className="relative w-[180px] h-[180px] flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {statusDistribution.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.fallback}
                                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '10px',
                                color: 'hsl(var(--foreground))',
                                padding: '8px 12px',
                                fontSize: '13px',
                              }}
                              formatter={(value?: number) => [`${value} tasks`, '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-foreground font-tabular">
                            {statusDistribution.reduce((sum, d) => sum + d.value, 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-col gap-3 flex-1 min-w-0">
                        {statusDistribution.map((item) => {
                          const total = statusDistribution.reduce((s, d) => s + d.value, 0)
                          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                          return (
                            <div key={item.name} className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-[3px] flex-shrink-0"
                                style={{ backgroundColor: item.fallback }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-foreground truncate">{item.name}</span>
                                  <span className="text-sm font-semibold text-foreground font-tabular ml-2">{item.value}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-subtle)' }}>
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%`, backgroundColor: item.fallback }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground font-tabular w-8 text-right">{pct}%</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
