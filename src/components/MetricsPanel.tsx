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
  Users,
  ChevronDown,
  BarChart3,
  PieChartIcon,
  Activity,
} from 'lucide-react'
import type { DashboardData, ClusterWorker } from '@/types'

// Fallback mock data for charts (used when no real data)
const mockActivityData = [
  { day: 'Mon', tasks: 4 },
  { day: 'Tue', tasks: 7 },
  { day: 'Wed', tasks: 5 },
  { day: 'Thu', tasks: 9 },
  { day: 'Fri', tasks: 12 },
  { day: 'Sat', tasks: 8 },
  { day: 'Sun', tasks: 6 },
]

const providerColors: Record<string, string> = {
  claude: '#e879a4',
  openai: '#46a758',
  deepseek: '#3e63dd',
  groq: '#ffb224',
  cerebras: '#8e4ec6',
  ollama: '#00a2c7',
}

function getWorkerColor(provider: string): string {
  return providerColors[provider] || '#697177'
}

interface MetricsPanelProps {
  stats?: DashboardData['stats'] | null;
  workers?: ClusterWorker[];
}

type ChartType = 'activity' | 'agents' | 'status'

export function MetricsPanel({ stats: clusterStats, workers }: MetricsPanelProps = {}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeChart, setActiveChart] = useState<ChartType>('activity')

  if (!clusterStats && (!workers || workers.length === 0)) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-secondary rounded" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Build stats from real cluster data when available
  const displayStats = useMemo(() => {
    if (!clusterStats) {
      return [
        { label: 'Total Tasks', value: '--', change: '', positive: true, icon: CheckCircle2 },
        { label: 'Completed', value: '--', change: '', positive: true, icon: TrendingUp },
        { label: 'In Queue', value: '--', change: '', positive: true, icon: Clock },
        { label: 'Workers', value: '--', change: '', positive: true, icon: Users },
      ]
    }
    const t = clusterStats.tasks
    const w = clusterStats.workers
    return [
      { label: 'Total Tasks', value: String(t.total), change: `${t.queueDepth} queued`, positive: true, icon: CheckCircle2 },
      { label: 'Completed', value: String(t.completed), change: t.failed > 0 ? `${t.failed} failed` : 'none failed', positive: t.failed === 0, icon: TrendingUp },
      { label: 'Running', value: String(t.running), change: `${t.pending} pending`, positive: true, icon: Clock },
      { label: 'Workers', value: `${w.idle + w.busy}/${w.total}`, change: `${w.busy} busy`, positive: w.offline === 0, icon: Users },
    ]
  }, [clusterStats])

  // Build agent performance from real worker data
  const agentPerformance = useMemo(() => {
    if (!workers || workers.length === 0) return []
    return workers
      .filter(w => w.status !== 'offline')
      .map(w => ({
        name: w.name,
        completed: w.tasksCompleted,
        color: getWorkerColor(w.provider),
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 8)
  }, [workers])

  // Build status distribution from real stats
  const statusDistribution = useMemo(() => {
    if (!clusterStats) return [
      { name: 'Completed', value: 0, color: '#22c55e', fallback: '#22c55e' },
      { name: 'Running', value: 0, color: '#3b82f6', fallback: '#3b82f6' },
      { name: 'Pending', value: 0, color: '#6b7280', fallback: '#6b7280' },
      { name: 'Failed', value: 0, color: '#ef4444', fallback: '#ef4444' },
    ]
    const t = clusterStats.tasks
    return [
      { name: 'Completed', value: t.completed, color: '#22c55e', fallback: '#22c55e' },
      { name: 'Running', value: t.running + t.assigned, color: '#3b82f6', fallback: '#3b82f6' },
      { name: 'Pending', value: t.pending, color: '#6b7280', fallback: '#6b7280' },
      { name: 'Failed', value: t.failed, color: '#ef4444', fallback: '#ef4444' },
    ].filter(s => s.value > 0)
  }, [clusterStats])

  // Activity data: still use mock since we don't have time-series in the cluster yet
  const activityData = mockActivityData

  const chartTabs: { id: ChartType; label: string; icon: React.ReactNode }[] = [
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'status', label: 'Status', icon: <PieChartIcon className="w-4 h-4" /> },
  ]

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
            <div className="px-3 sm:px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              {displayStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 sm:p-4 rounded-xl transition-colors"
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
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Chart Tabs */}
            <div className="px-3 sm:px-6 pb-2 flex gap-1">
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
            <div className="px-3 sm:px-6 pb-4 sm:pb-6">
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
                          <Bar dataKey="completed" fill="var(--green, #46a758)" radius={[0, 4, 4, 0]} name="Completed" />
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
                    className="min-h-[200px]"
                  >
                    <div className="flex flex-col sm:flex-row items-center h-full gap-4 sm:gap-6">
                      {/* Donut Chart */}
                      <div className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] flex-shrink-0">
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
