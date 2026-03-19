'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Clock,
  Zap,
  Play,
  Pause,
  History,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { GatewayCronJob, GatewayCronRun, Agent } from '@/types'
import { timeAgo as timeAgoUtil } from '@/lib/utils'

interface CronJobsPanelProps {
  cronJobs: GatewayCronJob[]
  agents: Agent[]
  dataSource: 'gateway' | 'db' | null
}

function formatRelativeTime(ms: number): string {
  const now = Date.now()
  const diff = ms - now
  if (diff <= 0) return 'now'
  const totalMin = Math.floor(diff / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${Math.round(ms / 1000)}s`
}

function timeAgo(iso: string): string {
  return timeAgoUtil(new Date(iso).getTime())
}

function extractModelShort(model: string): string {
  if (!model) return '?'
  const parts = model.split('-')
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`
  }
  return model
}

function StatusDot({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: 'var(--green)' }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: 'var(--green)' }}
        />
      </span>
    )
  }
  return (
    <span
      className="inline-flex rounded-full h-2.5 w-2.5"
      style={{ backgroundColor: 'var(--text-tertiary, #697177)' }}
    />
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const isOk = status === 'ok'
  const isFailed = status === 'failed'
  return (
    <span
      className="text-[11px] font-medium px-1.5 py-0.5 rounded"
      style={{
        background: isOk
          ? 'rgba(70, 167, 88, 0.15)'
          : isFailed
          ? 'rgba(229, 77, 46, 0.15)'
          : 'var(--surface-active)',
        color: isOk
          ? 'var(--green)'
          : isFailed
          ? 'var(--red)'
          : 'var(--text-tertiary, #697177)',
      }}
    >
      {status}
    </span>
  )
}

async function triggerJob(id: string) {
  try {
    const res = await fetch(`/api/gateway/cron/${id}/trigger`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    toast.success('Job triggered')
  } catch (err) {
    toast.error(`Trigger failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

async function toggleJob(id: string, currentEnabled: boolean) {
  try {
    const res = await fetch(`/api/gateway/cron/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !currentEnabled }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    toast.success(currentEnabled ? 'Job paused' : 'Job resumed')
  } catch (err) {
    toast.error(`Toggle failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }
}

function RunHistory({ jobId }: { jobId: string }) {
  const [runs, setRuns] = useState<GatewayCronRun[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/gateway/cron/${jobId}/runs`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setRuns(data.runs ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading runs…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-3 py-2 text-xs" style={{ color: 'var(--red)' }}>
        {error}
      </div>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No runs yet
      </div>
    )
  }

  return (
    <div className="space-y-1 px-3 py-2">
      {runs.map(run => (
        <div
          key={run.id}
          className="flex items-center gap-3 text-xs py-1 px-2 rounded-lg"
          style={{ background: 'var(--surface-hover)' }}
        >
          <span className="text-muted-foreground shrink-0">
            {timeAgo(run.startedAt)}
          </span>
          <RunStatusBadge status={run.status} />
          <span className="text-muted-foreground font-mono tabular-nums shrink-0">
            {formatDuration(run.durationMs)}
          </span>
          {run.error && (
            <span className="truncate min-w-0" style={{ color: 'var(--red)' }}>
              {run.error}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function CronJobsPanel({ cronJobs, agents, dataSource }: CronJobsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedRuns, setExpandedRuns] = useState<string | null>(null)

  const toggleRuns = useCallback((jobId: string) => {
    setExpandedRuns(prev => (prev === jobId ? null : jobId))
  }, [])

  if (dataSource !== 'gateway' || cronJobs.length === 0) return null

  const agentMap = new Map(agents.map(a => [a.id, a]))

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
          <Clock className="w-5 h-5" style={{ color: 'var(--amber)' }} />
          <h2 className="font-semibold text-foreground">Scheduled Jobs</h2>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--surface-subtle)',
              color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
            }}
          >
            {cronJobs.length}
          </span>
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
            <div className="px-3 sm:px-6 pb-4 space-y-2">
              {cronJobs.map((job) => {
                const agent = agentMap.get(job.agentId)
                const lastStatus = job.state.lastStatus
                const isRunsExpanded = expandedRuns === job.id
                return (
                  <div key={job.id}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                      style={{
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--surface-card-border)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--surface-card-hover-border)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--surface-card-border)')}
                      onClick={() => toggleRuns(job.id)}
                    >
                      {/* Status dot */}
                      <StatusDot enabled={job.enabled} />

                      {/* History icon */}
                      <History
                        className="w-3.5 h-3.5 shrink-0"
                        style={{
                          color: isRunsExpanded ? 'var(--amber)' : 'var(--text-tertiary, #697177)',
                        }}
                      />

                      {/* Name */}
                      <span className="font-semibold text-sm text-foreground truncate min-w-0 max-w-[160px]">
                        {job.name}
                      </span>

                      {/* Model badge */}
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: 'var(--surface-active)',
                          color: 'var(--purple)',
                        }}
                      >
                        {extractModelShort(job.payload.model)}
                      </span>

                      {/* Agent name */}
                      {agent && (
                        <span className="text-xs text-muted-foreground truncate shrink-0">
                          {agent.name}
                        </span>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Schedule */}
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {job.schedule.kind === 'every' ? 'interval' : job.schedule.expr}
                      </span>

                      {/* Next run */}
                      {job.state.nextRunAtMs > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(job.state.nextRunAtMs)}
                        </span>
                      )}

                      {/* Last run status badge */}
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background:
                            lastStatus === 'ok' ? 'rgba(70, 167, 88, 0.15)'
                            : lastStatus === 'failed' ? 'rgba(229, 77, 46, 0.15)'
                            : 'var(--surface-active)',
                          color:
                            lastStatus === 'ok' ? 'var(--green)'
                            : lastStatus === 'failed' ? 'var(--red)'
                            : 'var(--text-tertiary, #697177)',
                        }}
                      >
                        {lastStatus || 'never'}
                      </span>

                      {/* Last duration */}
                      <span className="text-xs text-muted-foreground font-tabular w-10 text-right shrink-0">
                        {formatDuration(job.state.lastDurationMs)}
                      </span>

                      {/* Trigger button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerJob(job.id) }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-active)]"
                        title="Run now"
                      >
                        <Zap className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} />
                      </button>

                      {/* Toggle button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleJob(job.id, job.enabled) }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-active)]"
                        title={job.enabled ? 'Pause' : 'Resume'}
                      >
                        {job.enabled
                          ? <Pause className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }} />
                          : <Play className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
                        }
                      </button>
                    </div>

                    {/* Inline run history */}
                    <AnimatePresence>
                      {isRunsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <RunHistory jobId={job.id} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
