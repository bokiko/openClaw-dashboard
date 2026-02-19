'use client';

import { motion } from 'framer-motion';
import type { SpawnedSession } from '@/types';

interface SpawnedSessionRowProps {
  session: SpawnedSession;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SpawnedSessionRow({ session }: SpawnedSessionRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg"
      style={{ background: 'var(--surface-subtle)' }}
    >
      {/* Freshness dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: session.freshness === 'recent' ? 'var(--green, #46a758)' : 'var(--muted-foreground, #697177)',
        }}
      />

      {/* Label */}
      <span className="text-foreground font-medium truncate max-w-[140px]">
        {session.label}
      </span>

      {/* Model badge */}
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
        style={{
          background: 'var(--surface-active)',
          color: 'var(--muted-foreground)',
        }}
      >
        {session.model.split('/').pop() || session.model}
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Token count */}
      <span className="text-muted-foreground font-tabular flex-shrink-0">
        {formatTokens(session.contextTokens)} tok
      </span>

      {/* Relative time */}
      <span className="text-muted-foreground/60 flex-shrink-0">
        {timeAgo(session.updatedAt)}
      </span>
    </motion.div>
  );
}

interface SpawnedSessionGroupProps {
  sessions: SpawnedSession[];
}

export function SpawnedSessionGroup({ sessions }: SpawnedSessionGroupProps) {
  if (sessions.length === 0) return null;

  // Group by team
  const byTeam = new Map<string, SpawnedSession[]>();
  const noTeam: SpawnedSession[] = [];
  for (const s of sessions) {
    if (s.team) {
      const list = byTeam.get(s.team) || [];
      list.push(s);
      byTeam.set(s.team, list);
    } else {
      noTeam.push(s);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-1 mt-2"
    >
      {/* Team groups */}
      {Array.from(byTeam.entries()).map(([team, teamSessions]) => (
        <div key={team} className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 pt-1">
            {team}
          </span>
          {teamSessions.map(s => (
            <SpawnedSessionRow key={s.sessionId} session={s} />
          ))}
        </div>
      ))}
      {/* Ungrouped */}
      {noTeam.map(s => (
        <SpawnedSessionRow key={s.sessionId} session={s} />
      ))}
    </motion.div>
  );
}
