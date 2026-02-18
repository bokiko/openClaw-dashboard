/**
 * Gateway WebSocket RPC Client
 *
 * Singleton client that speaks the OpenClaw gateway's custom WS protocol.
 * Server-side only (used by API routes).
 */

import WebSocket from 'ws';
import { randomUUID } from 'crypto';

const GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';
const GATEWAY_HEALTH_URL = process.env.GATEWAY_HEALTH_URL || 'http://127.0.0.1:18792';

const REQUEST_TIMEOUT = 15_000;
const MAX_RECONNECT_DELAY = 30_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface GatewayResponse {
  ok: boolean;
  id: string;
  payload?: unknown;
  error?: { message: string };
}

interface GatewayEvent {
  event: string;
  payload?: unknown;
}

class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private connected = false;
  private authenticated = false;
  private connectPromise: Promise<void> | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closing = false;

  async ensureConnected(): Promise<void> {
    if (this.connected && this.authenticated) return;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(GATEWAY_WS_URL);
      let settled = false;
      let challengeNonce: string | null = null;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          reject(new Error('Gateway connection timeout'));
        }
      }, 10_000);

      ws.on('open', () => {
        this.ws = ws;
        this.connected = true;
        this.reconnectAttempt = 0;
      });

      ws.on('message', (raw: Buffer) => {
        let msg: GatewayResponse | GatewayEvent;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        // Handle challenge event
        if ('event' in msg && msg.event === 'connect.challenge') {
          challengeNonce = (msg.payload as { nonce: string })?.nonce;
          // Send connect request
          const connectId = randomUUID();
          ws.send(JSON.stringify({
            type: 'req',
            id: connectId,
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'dashboard', version: '1.0', platform: 'darwin', mode: 'backend' },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
              ...(challengeNonce ? { nonce: challengeNonce } : {}),
            },
          }));
          return;
        }

        // Handle tick events (ignore)
        if ('event' in msg && msg.event === 'tick') return;

        // Handle RPC responses
        if ('id' in msg && 'ok' in msg) {
          const resp = msg as GatewayResponse;

          // If this is the connect response and we haven't authenticated yet
          if (!this.authenticated && resp.ok) {
            this.authenticated = true;
            clearTimeout(timeout);
            settled = true;
            resolve();
            return;
          }

          if (!this.authenticated && !resp.ok) {
            clearTimeout(timeout);
            settled = true;
            reject(new Error(`Gateway auth failed: ${resp.error?.message || 'unknown'}`));
            return;
          }

          // Normal RPC response
          const pending = this.pending.get(resp.id);
          if (pending) {
            this.pending.delete(resp.id);
            clearTimeout(pending.timer);
            if (resp.ok) {
              pending.resolve(resp.payload);
            } else {
              pending.reject(new Error(resp.error?.message || 'Gateway RPC error'));
            }
          }
        }
      });

      ws.on('close', () => {
        this.connected = false;
        this.authenticated = false;
        this.ws = null;

        // Reject all pending requests
        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error('Gateway connection closed'));
          this.pending.delete(id);
        }

        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('Gateway connection closed before auth'));
        }

        if (!this.closing) {
          this.scheduleReconnect();
        }
      });

      ws.on('error', () => {
        // onclose will fire after this
      });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), MAX_RECONNECT_DELAY);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Reconnect will happen on next call()
    }, delay);
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureConnected();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway not connected');
    }

    const id = randomUUID();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway RPC timeout: ${method}`));
      }, REQUEST_TIMEOUT);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify({
        type: 'req',
        id,
        method,
        params,
      }));
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(GATEWAY_HEALTH_URL, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  disconnect() {
    this.closing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
  }
}

// Singleton — reused across all API route invocations in the same server process
let instance: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
  if (!instance) {
    instance = new GatewayClient();
  }
  return instance;
}

export type { GatewayClient };
