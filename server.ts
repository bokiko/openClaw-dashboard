import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  // WebSocket setup
  try {
    const { setupWebSocket } = await import('./src/lib/ws-server');
    setupWebSocket(server);
    console.log('WebSocket server attached on /ws');
  } catch (err) {
    console.warn('WebSocket setup skipped:', err instanceof Error ? err.message : err);
  }

  // Routine scheduler (Phase 7)
  try {
    // Dynamic import — silently skips if module doesn't exist yet
    const mod = await import('./src/lib/routine-scheduler' as string);
    if (mod.startScheduler) {
      mod.startScheduler();
      console.log('Routine scheduler started');
    }
  } catch {
    // Not yet implemented — skip
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close();
    try {
      const { getWss } = await import('./src/lib/ws-server');
      const wss = getWss();
      if (wss) wss.close();
    } catch { /* ws not loaded */ }
    try {
      const db = await import('./src/lib/db');
      await db.shutdown();
    } catch { /* db not loaded */ }
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
