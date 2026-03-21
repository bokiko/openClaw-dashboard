'use client';

import { motion } from 'framer-motion';
import { X, CheckCheck, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Notification } from '@/types';
import { timeAgo } from '@/lib/utils';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
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


export default function NotificationPanel({
  notifications, onClose, onMarkRead, onMarkAllRead,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

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
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Close notifications">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" aria-live="polite">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No notifications
          </div>
        ) : (
          <div role="list">
          {notifications.map(n => {
            const Icon = SEVERITY_ICONS[n.severity] || Info;
            return (
              <button
                role="listitem"
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                aria-label={`${n.severity} notification: ${n.title}${n.read ? '' : ' (unread)'}`}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors
                           border-b border-border/50 last:border-b-0
                           ${!n.read ? 'bg-[var(--accent-primary-light)]' : ''}`}
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
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 mt-1.5" />
                )}
              </button>
            );
          })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
