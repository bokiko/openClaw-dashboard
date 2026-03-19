'use client';

import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-4 h-4 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center
                         bg-red-500 text-white text-[10px] font-bold rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
