'use client';

import { ListChecks, CheckCircle2, AlertTriangle, Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkItem } from '@/types';

interface ActivityStatsProps {
  items: WorkItem[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
  danger?: boolean;
}

function StatCard({ icon, label, value, accent, danger }: StatCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border",
      "bg-card border-border",
      danger && "border-red-500/30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center",
        danger ? "bg-red-500/10 text-red-500" : accent ? "text-foreground" : "bg-secondary/50 text-muted-foreground"
      )} style={accent ? { background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' } : undefined}>
        {icon}
      </div>
      <div>
        <p className={cn("text-lg font-semibold font-tabular", danger && "text-red-500")}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export default function ActivityStats({ items }: ActivityStatsProps) {
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const todayItems = items.filter(i => i.timestamp >= dayStart);

  const succeeded = todayItems.filter(i => i.status === 'completed').length;
  const failed = todayItems.filter(i => i.status === 'failed').length;
  const active = items.filter(i => i.status === 'active').length;
  const totalTokens = todayItems.reduce((sum, i) => sum + (i.tokens || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
      <StatCard
        icon={<ListChecks className="w-4 h-4" />}
        label="Work Items Today"
        value={todayItems.length}
        accent
      />
      <StatCard
        icon={<CheckCircle2 className="w-4 h-4" />}
        label="Succeeded"
        value={succeeded}
      />
      <StatCard
        icon={<AlertTriangle className="w-4 h-4" />}
        label="Failed / Attention"
        value={failed}
        danger={failed > 0}
      />
      <StatCard
        icon={<Coins className="w-4 h-4" />}
        label="Tokens Today"
        value={totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
      />
      <StatCard
        icon={<Loader2 className="w-4 h-4" />}
        label="Active Now"
        value={active}
      />
    </div>
  );
}
