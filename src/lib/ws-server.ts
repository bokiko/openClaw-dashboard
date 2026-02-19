import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import { URL } from 'url';
import type { WsEventType } from '@/types';

interface WsClient {
  ws: WebSocket;
  sessionId?: string;
  alive: boolean;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, WsClient>();
let seqCounter = 0;

export function setupWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    // Extract token from query param for auth verification
    const token = url.searchParams.get('token');

    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit('connection', ws, req, token);
    });
  });

  wss.on('connection', async (ws: WebSocket, _req: IncomingMessage, token?: string) => {
    const authEnabled = !!(process.env.JWT_SECRET || process.env.DASHBOARD_SECRET);

    // Verify token BEFORE accepting the connection
    if (authEnabled) {
      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }
      const valid = await verifyWsTokenAsync(token);
      if (!valid) {
        ws.close(4001, 'Invalid token');
        return;
      }
    }

    const client: WsClient = { ws, alive: true };
    clients.set(ws, client);

    // Send connected event only after successful auth
    sendTo(ws, 'connected', { clientId: crypto.randomUUID() });

    ws.on('pong', () => {
      const c = clients.get(ws);
      if (c) c.alive = true;
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  // Heartbeat ping every 30s
  const heartbeatInterval = setInterval(() => {
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      client.alive = false;
      ws.ping();
    }
  }, 30_000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

async function verifyWsTokenAsync(token: string): Promise<boolean> {
  try {
    const { validateWsToken } = await import('@/lib/auth');
    return validateWsToken(token);
  } catch {
    return false;
  }
}

export function broadcast(type: WsEventType, payload: unknown): void {
  const message = JSON.stringify({
    seq: ++seqCounter,
    type,
    payload,
    timestamp: Date.now(),
  });

  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function sendTo(ws: WebSocket, type: WsEventType, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    seq: ++seqCounter,
    type,
    payload,
    timestamp: Date.now(),
  }));
}

export function getClientCount(): number {
  return clients.size;
}

export function getWss(): WebSocketServer | null {
  return wss;
}
