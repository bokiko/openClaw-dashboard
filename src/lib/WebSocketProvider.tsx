'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

interface WsEvent {
  event: string;
  data: unknown;
  seq: number;
  timestamp: number;
}

type WsListener = (event: WsEvent) => void;

interface WebSocketContextValue {
  connected: boolean;
  lastSeq: number;
  subscribe: (listener: WsListener) => () => void;
  send: (data: Record<string, unknown>) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  lastSeq: 0,
  subscribe: () => () => {},
  send: () => {},
});

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

/** Max reconnect delay (exponential backoff cap) */
const MAX_RECONNECT_DELAY = 30_000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const lastSeqRef = useRef(0);
  const listenersRef = useRef<Set<WsListener>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(async () => {
    try {
      // Fetch WS token from authenticated endpoint
      const res = await fetch('/api/cluster/ws-token');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error(`Token fetch failed: ${res.status}`);
      }

      const { token, wsUrl } = await res.json();

      // Gateway polling mode: wsUrl is null — skip WebSocket entirely
      if (!wsUrl) {
        setConnected(true); // Mark as "connected" so UI doesn't show reconnecting
        return;
      }

      const url = `${wsUrl}?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptRef.current = 0;

        // If we have a lastSeq, request resume
        if (lastSeqRef.current > 0) {
          ws.send(JSON.stringify({ type: 'resume', lastSeq: lastSeqRef.current }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data);

          // Normalize: messages with `type` but no `event` (e.g. chat:start, chat:chunk)
          // get their type mapped to the event field so listeners can match on it.
          const msg: WsEvent = raw.event
            ? raw
            : { event: raw.type || 'unknown', data: raw, seq: raw.seq ?? 0, timestamp: raw.timestamp ?? Date.now() };

          // Track sequence number
          if (typeof msg.seq === 'number' && msg.seq > 0) {
            lastSeqRef.current = msg.seq;
          }

          // Handle resume:stale — do full HTTP refresh
          if (msg.event === 'resume:stale') {
            // Notify listeners to trigger a full refresh
            listenersRef.current.forEach(fn => fn({
              event: 'needs_refresh',
              data: null,
              seq: msg.seq,
              timestamp: Date.now(),
            }));
            return;
          }

          // Forward to all listeners
          listenersRef.current.forEach(fn => fn(msg));
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    } catch (err) {
      console.error('WebSocket connect error:', err);
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;

    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
    reconnectAttemptRef.current = attempt + 1;

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // Initial connect
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  const subscribe = useCallback((listener: WsListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, lastSeq: lastSeqRef.current, subscribe, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}
