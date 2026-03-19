'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Notification } from '@/types';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (id: number) => void;
}

const SEVERITY_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertOctagon,
};

const SEVERITY_COLORS = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type FilterTab = 'all' | 'unread';

export default function NotificationPanel({
  notifications, onClose, onMarkRead, onMarkAllRead, onDelete,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const visibleNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <motion.div
      className="fixed top-14 right-4 z-50 w-80 sm:w-96 bg-card border border-border rounded-xl
                 max-h-[70vh] flex flex-col"
      style={{ boxShadow: 'var(--shadow-modal)' }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({unreadCount} unread)</span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Mark all read"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50">
        {(['all', 'unread'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === tab
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            aria-pressed={filter === tab}
          >
            {tab}
            {tab === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" aria-live="polite">
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <span>{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</span>
            {filter === 'unread' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Show all
              </button>
            )}
          </div>
        ) : (
          <div role="list">
            <AnimatePresence initial={false}>
              {visibleNotifications.map(n => {
                const Icon = SEVERITY_ICONS[n.severity] || Info;
                return (
                  <motion.div
                    key={n.id}
                    role="listitem"
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`group relative flex items-start gap-3 px-4 py-3 border-b border-border/50
                               last:border-b-0 transition-colors
                               ${!n.read ? 'bg-[var(--accent-primary-light)]' : 'hover:bg-muted/30'}`}
                  >
                    <button
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                      onClick={() => !n.read && onMarkRead(n.id)}
                      aria-label={`${n.severity} notification: ${n.title}${n.read ? '' : ' (unread, click to mark read)'}`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${SEVERITY_COLORS[n.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0 self-center">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                        className="p-1 rounded hover:bg-muted/70 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete notification: ${n.title}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
