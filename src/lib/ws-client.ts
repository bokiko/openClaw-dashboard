'use client';

import type { WsEvent, WsEventType } from '@/types';

type WsHandler = (payload: unknown) => void;

export type WsState = 'connecting' | 'connected' | 'disconnected' | 'error';

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<WsEventType, Set<WsHandler>>();
  private stateHandlers = new Set<(state: WsState) => void>();
  private state: WsState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30_000;
  private lastSeq = 0;
  private disposed = false;
  private wsUrl: string | null = null;
  private authToken: string | null = null;

  async connect(): Promise<void> {
    if (this.disposed) return;

    this.setState('connecting');

    try {
      // Fetch WS token and URL from server
      const res = await fetch('/api/ws-token');
      if (!res.ok) {
        this.setState('error');
        this.scheduleReconnect();
        return;
      }

      const { token, wsUrl } = await res.json();
      this.wsUrl = wsUrl;
      this.authToken = token;
    } catch {
      this.setState('error');
      this.scheduleReconnect();
      return;
    }

    this.openConnection();
  }

  private openConnection(): void {
    if (this.disposed || !this.wsUrl) return;

    try {
      const url = this.authToken
        ? `${this.wsUrl}?token=${encodeURIComponent(this.authToken)}`
        : this.wsUrl;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.lastSeq = 0; // Reset on new connection — server seq restarts after restart
        this.reconnectDelay = 1000; // Reset backoff
        this.setState('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WsEvent;

          // Sequence dedup
          if (data.seq <= this.lastSeq) return;
          this.lastSeq = data.seq;

          const handlers = this.handlers.get(data.type);
          if (handlers) {
            for (const handler of handlers) {
              handler(data.payload);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        this.setState('disconnected');
        if (!this.disposed) this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setState('error');
      };
    } catch {
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  on(event: WsEventType, handler: WsHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  onStateChange(handler: (state: WsState) => void): () => void {
    this.stateHandlers.add(handler);
    handler(this.state); // immediate callback with current state
    return () => this.stateHandlers.delete(handler);
  }

  getState(): WsState {
    return this.state;
  }

  private setState(state: WsState): void {
    this.state = state;
    for (const handler of this.stateHandlers) {
      handler(state);
    }
  }

  disconnect(): void {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }
}
