import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH ||
  path.join(process.env.HOME || '/home/bokiko', '.openclaw/openclaw.json');

interface ChannelConfig {
  enabled?: boolean;
  [key: string]: unknown;
}

const CHANNEL_NAMES: Record<string, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
};

export async function GET() {
  const now = Date.now();

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    const token = config?.gateway?.auth?.token || '';
    const port = config?.gateway?.port || 18789;
    const channels: Record<string, ChannelConfig> = config?.channels || {};

    // Check gateway health
    let gatewayOnline = false;
    let gatewayInfo: Record<string, unknown> = {};
    try {
      const res = await fetch(`http://localhost:${port}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        gatewayOnline = true;
        try { gatewayInfo = await res.json(); } catch { /* text response is fine */ }
      }
    } catch {
      // Try alternate endpoint
      try {
        const res = await fetch(`http://localhost:${port}/api/status`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          gatewayOnline = true;
          try { gatewayInfo = await res.json(); } catch {}
        }
      } catch { /* gateway is down */ }
    }

    const channelList = Object.entries(channels).map(([id, ch]) => {
      const enabled = ch.enabled !== false;
      let status: string;
      if (!enabled) status = 'disabled';
      else if (!gatewayOnline) status = 'unknown';
      else status = 'connected';

      return {
        id,
        name: CHANNEL_NAMES[id] || id.charAt(0).toUpperCase() + id.slice(1),
        enabled,
        status,
        lastCheck: now,
      };
    });

    return NextResponse.json({
      channels: channelList,
      gateway: {
        status: gatewayOnline ? 'online' : 'offline',
        ...gatewayInfo,
      },
      timestamp: now,
    });
  } catch (err) {
    console.error('Channel monitor error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Failed to check channels', timestamp: now },
      { status: 500 },
    );
  }
}
