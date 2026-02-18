'use client';

import { cn } from '@/lib/utils';
import type { Agent } from '@/types';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showName?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-lg',
};

const ringClasses = {
  sm: 'ring-[2px] ring-offset-1',
  md: 'ring-[2px] ring-offset-2',
  lg: 'ring-[3px] ring-offset-2',
  xl: 'ring-[3px] ring-offset-3',
};

const statusSizeClasses = {
  sm: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
  md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-2',
  lg: 'w-3 h-3 -bottom-0.5 -right-0.5 border-2',
  xl: 'w-3.5 h-3.5 bottom-0 right-0 border-2',
};

export default function AgentAvatar({
  agent,
  size = 'md',
  showStatus = true,
  showName = false,
  interactive = false,
  selected = false,
  onClick,
  className,
}: AgentAvatarProps) {
  const isWorking = agent.status === 'working';
  const isOffline = agent.status === 'offline';

  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        interactive && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="relative">
        {/* Glow effect for working agents */}
        {isWorking && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full blur-md opacity-40 animate-pulse-soft",
              sizeClasses[size]
            )}
            style={{ backgroundColor: agent.color }}
          />
        )}
        
        {/* Avatar circle */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full font-semibold transition-all duration-200",
            sizeClasses[size],
            interactive && "hover:scale-110",
            selected && ringClasses[size],
          )}
          style={{
            background: `linear-gradient(135deg, ${agent.color}30 0%, ${agent.color}15 100%)`,
            color: agent.color,
            border: `1.5px solid ${agent.color}50`,
            ...(selected && {
              ringColor: agent.color,
              ringOffsetColor: 'hsl(240 6% 6%)',
            }),
          }}
        >
          {agent.letter}
        </div>

        {/* Status indicator */}
        {showStatus && (
          <div
            className={cn(
              "absolute rounded-full border-background",
              statusSizeClasses[size],
              isWorking ? "bg-green-DEFAULT" : isOffline ? "bg-red-400" : "bg-amber-DEFAULT",
              isWorking && "animate-pulse-soft"
            )}
            style={{
              boxShadow: isWorking
                ? '0 0 6px rgba(70, 167, 88, 0.8)'
                : isOffline
                  ? '0 0 4px rgba(239, 68, 68, 0.6)'
                  : '0 0 4px rgba(255, 178, 36, 0.6)',
            }}
          />
        )}
      </div>

      {showName && (
        <span className={cn(
          "font-medium transition-colors",
          size === 'sm' && "text-xs",
          size === 'md' && "text-sm",
          size === 'lg' && "text-sm",
          size === 'xl' && "text-base",
          selected ? "text-foreground" : "text-muted-foreground"
        )}>
          {agent.name}
        </span>
      )}
    </div>
  );
}
