'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocketContext } from './WebSocketProvider';

interface WsEvent {
  event: string;
  data: unknown;
  seq: number;
  timestamp: number;
}

/**
 * Subscribe to specific WebSocket event types.
 *
 * @param eventTypes - Array of event type strings to listen for (e.g. ['task:created', 'task:updated'])
 * @param handler - Callback invoked with the event data
 */
export function useWebSocket(eventTypes: string[], handler: (event: WsEvent) => void) {
  const { subscribe, connected } = useWebSocketContext();

  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (eventTypes.length === 0 || eventTypes.includes(event.event)) {
        stableHandler(event);
      }
    });

    return unsubscribe;
  }, [subscribe, eventTypes, stableHandler]);

  return { connected };
}
