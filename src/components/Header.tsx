'use client';

import {
  Activity, Zap, Command, Github,
  Brain, Bot, Flame, Shield, Cpu, Rocket, Sparkles, Eye, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';

const LOGO_ICONS: Record<string, LucideIcon> = {
  zap: Zap, brain: Brain, bot: Bot, flame: Flame, shield: Shield,
  cpu: Cpu, rocket: Rocket, sparkles: Sparkles, eye: Eye, activity: Activity,
};

interface HeaderProps {
  activeAgents: number;
  totalAgents: number;
  totalTasks: number;
  inProgressTasks: number;
  feedOpen: boolean;
  onFeedToggle: () => void;
  onCommandPalette?: () => void;
  unreadNotifications: number;
  notificationsOpen: boolean;
  onNotificationsToggle: () => void;
  dashboardName?: string;
  dashboardSubtitle?: string;
  repoUrl?: string | null;
  logoIcon?: string;
  accentColor?: string;
}

export default function Header({
  activeAgents,
  totalAgents,
  totalTasks,
  inProgressTasks,
  feedOpen,
  onFeedToggle,
  onCommandPalette,
  unreadNotifications,
  notificationsOpen,
  onNotificationsToggle,
  dashboardName = 'OpenClaw',
  dashboardSubtitle = 'Mission Control',
  repoUrl,
  logoIcon = 'zap',
}: HeaderProps) {
  const LogoIcon = LOGO_ICONS[logoIcon] || Zap;

  return (
    <div>
      <header className="flex items-center justify-between py-3 sm:py-4 mb-2 gap-2">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 blur-xl rounded-full" style={{ background: 'var(--accent-primary-light)' }} />
            <div
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(to bottom right, var(--accent-primary-light), transparent)`,
                border: `1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)`,
              }}
            >
              <LogoIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">
              {dashboardName}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{dashboardSubtitle}</p>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="status-dot working" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground font-tabular">{activeAgents}</span>
                <span className="text-muted-foreground">/{totalAgents}</span>
              </span>
            </div>
            <span className="text-xs text-muted-foreground">agents</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm">
              <span className="font-semibold text-foreground font-tabular">{inProgressTasks}</span>
              <span className="text-muted-foreground"> active</span>
            </span>
            <span className="text-xs text-muted-foreground">
              of {totalTasks} tasks
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onCommandPalette && (
            <button
              onClick={onCommandPalette}
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                "bg-secondary/50 text-muted-foreground",
                "border border-border hover:border-border/80",
                "hover:bg-secondary hover:text-foreground",
                "transition-all duration-200"
              )}
            >
              <Command className="w-3.5 h-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="kbd ml-1">⌘K</kbd>
            </button>
          )}

          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl items-center justify-center transition-all duration-200",
                "bg-secondary/50 text-muted-foreground border border-border",
                "hover:border-border/80 hover:text-foreground hover:bg-secondary"
              )}
              title="View repository"
            >
              <Github className="w-4 h-4" />
            </a>
          )}

          {/* Notification Bell */}
          <NotificationBell
            unreadCount={unreadNotifications}
            onClick={onNotificationsToggle}
          />

          {/* Activity Feed Toggle */}
          <button
            onClick={onFeedToggle}
            className={cn(
              "relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200",
              feedOpen
                ? "border"
                : "bg-secondary/50 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground hover:bg-secondary"
            )}
            style={feedOpen ? {
              background: 'var(--accent-primary-light)',
              color: 'var(--accent-primary)',
              borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, transparent)',
            } : undefined}
          >
            <Activity className="w-4 h-4" />
            {!feedOpen && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse-soft"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: `0 0 8px var(--accent-glow)`,
                }}
              />
            )}
          </button>
        </div>
      </header>
    </div>
  );
}
