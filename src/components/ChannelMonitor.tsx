'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Circle, Radio } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface ChannelInfo {
  id: string;
  name: string;
  enabled: boolean;
  status: string;
  lastCheck: number;
}

interface ChannelData {
  channels: ChannelInfo[];
  gateway: { status: string; [key: string]: unknown };
  timestamp: number;
}

const POLL_MS = 900_000; // 15 minutes

const statusColor: Record<string, string> = {
  connected: 'text-emerald-400',
  disabled: 'text-zinc-500',
  unknown: 'text-amber-400',
  offline: 'text-red-400',
  down: 'text-red-400',
};

const statusDot: Record<string, string> = {
  connected: 'bg-emerald-400 shadow-emerald-400/50',
  disabled: 'bg-zinc-600',
  unknown: 'bg-amber-400 shadow-amber-400/50',
  offline: 'bg-red-400 shadow-red-400/50',
  down: 'bg-red-400 shadow-red-400/50',
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}


export function ChannelMonitor() {
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(POLL_MS);
  const [changed, setChanged] = useState(false);
  const prevRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: ChannelData = await res.json();
      
      // Detect changes
      const sig = JSON.stringify(d.channels.map(c => c.status));
      if (prevRef.current && prevRef.current !== sig) setChanged(true);
      prevRef.current = sig;
      
      setData(d);
      setCountdown(POLL_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchChannels();
    const id = setInterval(fetchChannels, POLL_MS);
    return () => clearInterval(id);
  }, [fetchChannels]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Clear change flash
  useEffect(() => {
    if (changed) {
      const t = setTimeout(() => setChanged(false), 2000);
      return () => clearTimeout(t);
    }
  }, [changed]);

  const gatewayOnline = data?.gateway?.status === 'online';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-colors duration-500 ${
        changed
          ? 'border-emerald-500/60 bg-emerald-950/20'
          : 'border-zinc-800 bg-zinc-900/60'
      } backdrop-blur-sm p-4 mb-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {gatewayOnline ? (
            <Radio className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <h3 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
            Channel Monitor
          </h3>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              gatewayOnline
                ? 'bg-emerald-500/20 text-emerald-400'
                : data
                ? 'bg-red-500/20 text-red-400'
                : 'bg-zinc-700/50 text-zinc-500'
            }`}
          >
            {gatewayOnline ? 'ONLINE' : data ? 'OFFLINE' : '...'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 tabular-nums">
            Next: {formatCountdown(countdown)}
          </span>
          <button
            onClick={() => { fetchChannels(); setCountdown(POLL_MS); }}
            disabled={loading}
            className="text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40"
            title="Check Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400/80 mb-2">⚠ {error}</div>
      )}

      {/* Channel rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {data?.channels.map((ch) => (
            <motion.div
              key={ch.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
            >
              <span
                className={`w-2 h-2 rounded-full shadow-sm ${statusDot[ch.status] || statusDot.unknown}`}
              />
              <span className="text-sm text-zinc-200 font-medium flex-1">
                {ch.name}
              </span>
              <span className={`text-[11px] capitalize ${statusColor[ch.status] || statusColor.unknown}`}>
                {ch.status}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Last checked */}
      {data && (
        <div className="mt-2 text-[10px] text-zinc-600 text-right">
          Checked {timeAgo(data.timestamp)}
        </div>
      )}
    </motion.div>
  );
}

export default ChannelMonitor;
