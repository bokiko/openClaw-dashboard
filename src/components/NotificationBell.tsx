'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
  isOpen: boolean;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, isOpen, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
        isOpen
          ? "bg-green-DEFAULT/10 text-green-DEFAULT border border-green-DEFAULT/30"
          : "bg-secondary/50 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground hover:bg-secondary"
      )}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-4 h-4" />

      {/* Unread count badge */}
      {unreadCount > 0 && !isOpen && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
          style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
