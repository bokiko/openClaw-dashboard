'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';

export interface Notification {
  id: string;
  workerId: string | null;
  message: string;
  type: string;
  taskId: string | null;
  details: Record<string, unknown>;
  read: boolean;
  delivered: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  'task:assigned': { icon: Info, color: '#3e63dd', label: 'Assigned' },
  'task:completed': { icon: CheckCircle, color: '#46a758', label: 'Completed' },
  'task:failed': { icon: XCircle, color: '#e54d2e', label: 'Failed' },
  'task:comment': { icon: MessageSquare, color: '#8e4ec6', label: 'Comment' },
  'worker:alert': { icon: AlertTriangle, color: '#ffb224', label: 'Alert' },
  'system': { icon: Bell, color: '#697177', label: 'System' },
};

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig['system'];
}

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onDelete,
  onClearAll,
  onClose,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-green-DEFAULT" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              <span className="text-[10px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/50 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                index={index}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>

          {notifications.length === 0 && (
            <div className="px-5 py-16 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between bg-background/50">
          <span className="text-xs text-muted-foreground">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.aside>
    </>
  );
}

function NotificationRow({
  notification,
  index,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  index: number;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = getTypeConfig(notification.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
      className={cn(
        "flex items-start gap-3 px-5 py-4 border-b border-border/20 transition-colors cursor-pointer group",
        notification.read
          ? "hover:bg-secondary/10"
          : "bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      {/* Type icon */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-relaxed",
          notification.read ? "text-muted-foreground" : "text-foreground"
        )}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ color: config.color, backgroundColor: `${config.color}15` }}
          >
            {config.label}
          </span>
          <span className="text-[11px] text-muted-foreground/60 font-tabular" suppressHydrationWarning>
            {timeAgo(new Date(notification.createdAt).getTime())}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mr-1" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
