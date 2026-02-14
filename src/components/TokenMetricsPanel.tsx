'use client'

import { useState } from 'react'
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
  Cell,
} from 'recharts'
import {
  Activity,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
} from 'lucide-react'
import { formatTokens } from '@/lib/utils'
import type { TokenStats } from '@/types'

interface TokenMetricsPanelProps {
  tokenStats: TokenStats | null
}

type ChartTab = 'trend' | 'models'

const MODEL_COLORS = [
  '#8e4ec6', '#3e63dd', '#46a758', '#ffb224', '#e54d2e',
  '#00a2c7', '#e879a4', '#697177',
]

export function TokenMetricsPanel({ tokenStats }: TokenMetricsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<ChartTab>('trend')

  const tabs: { id: ChartTab; label: string }[] = [
    { id: 'trend', label: 'Trend' },
    { id: 'models', label: 'Models' },
  ]

  const totalTokens = tokenStats
    ? tokenStats.totalInputTokens + tokenStats.totalOutputTokens
    : 0

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
          <Activity className="w-5 h-5" style={{ color: 'var(--blue)' }} />
          <h2 className="font-semibold text-foreground">Token Usage</h2>
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
            {!tokenStats ? (
              /* Empty state */
              <div className="px-6 pb-6 text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No usage data yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Token usage will appear here when tasks include usage data
                </p>
              </div>
            ) : (
              <>
                {/* Stat Cards */}
                <div className="px-6 pb-4 grid grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Total Tokens',
                      value: formatTokens(totalTokens),
                      icon: Layers,
                      color: 'var(--blue)',
                    },
                    {
                      label: 'Input Tokens',
                      value: formatTokens(tokenStats.totalInputTokens),
                      icon: ArrowDownToLine,
                      color: 'var(--purple)',
                    },
                    {
                      label: 'Output Tokens',
                      value: formatTokens(tokenStats.totalOutputTokens),
                      icon: ArrowUpFromLine,
                      color: 'var(--green)',
                    },
                  ].map((stat, index) => (
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
                        <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart Tabs */}
                <div className="px-6 pb-2 flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                      style={activeTab === tab.id
                        ? { background: 'var(--surface-active)', color: 'var(--foreground)' }
                        : { color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Charts */}
                <div className="px-6 pb-6">
                  <AnimatePresence mode="wait">
                    {activeTab === 'trend' && tokenStats.dailyTokens.length > 0 && (
                      <motion.div
                        key="trend"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="h-[200px]"
                      >
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <AreaChart data={tokenStats.dailyTokens}>
                            <defs>
                              <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--purple, #8e4ec6)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--purple, #8e4ec6)" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--green, #46a758)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--green, #46a758)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              axisLine={{ stroke: 'hsl(var(--border))' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              axisLine={{ stroke: 'hsl(var(--border))' }}
                              tickLine={false}
                              tickFormatter={(v: number) => formatTokens(v)}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '10px',
                                color: 'hsl(var(--foreground))',
                                padding: '8px 12px',
                                fontSize: '13px',
                              }}
                              formatter={(value?: number, name?: string) => [
                                formatTokens(value ?? 0),
                                name === 'input' ? 'Input' : 'Output',
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="input"
                              stackId="1"
                              stroke="var(--purple, #8e4ec6)"
                              strokeWidth={2}
                              fill="url(#inputGradient)"
                            />
                            <Area
                              type="monotone"
                              dataKey="output"
                              stackId="1"
                              stroke="var(--green, #46a758)"
                              strokeWidth={2}
                              fill="url(#outputGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </motion.div>
                    )}

                    {activeTab === 'trend' && tokenStats.dailyTokens.length === 0 && (
                      <motion.div
                        key="trend-empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[200px] flex items-center justify-center"
                      >
                        <p className="text-sm text-muted-foreground">No daily trend data available</p>
                      </motion.div>
                    )}

                    {activeTab === 'models' && tokenStats.tokensByModel.length > 0 && (
                      <motion.div
                        key="models"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="h-[200px]"
                      >
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <BarChart data={tokenStats.tokensByModel} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              axisLine={{ stroke: 'hsl(var(--border))' }}
                              tickLine={false}
                              tickFormatter={(v: number) => formatTokens(v)}
                            />
                            <YAxis
                              type="category"
                              dataKey="model"
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              width={100}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '10px',
                                color: 'hsl(var(--foreground))',
                                padding: '8px 12px',
                                fontSize: '13px',
                              }}
                              formatter={(value?: number, name?: string) => [
                                formatTokens(value ?? 0),
                                name === 'input' ? 'Input' : 'Output',
                              ]}
                            />
                            <Bar dataKey="input" stackId="a" radius={[0, 0, 0, 0]}>
                              {tokenStats.tokensByModel.map((_, index) => (
                                <Cell key={`in-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} fillOpacity={0.7} />
                              ))}
                            </Bar>
                            <Bar dataKey="output" stackId="a" radius={[0, 4, 4, 0]}>
                              {tokenStats.tokensByModel.map((_, index) => (
                                <Cell key={`out-${index}`} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    )}

                    {activeTab === 'models' && tokenStats.tokensByModel.length === 0 && (
                      <motion.div
                        key="models-empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[200px] flex items-center justify-center"
                      >
                        <p className="text-sm text-muted-foreground">No model breakdown available</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
