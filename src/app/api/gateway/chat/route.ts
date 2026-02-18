/**
 * POST /api/gateway/chat
 *
 * Send a chat message to an agent via the gateway.
 * Non-streaming initially — returns full response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGatewayClient } from '@/lib/gateway-client';

interface ChatResponse {
  chatId: string;
  text: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, message } = await req.json();

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'agentId and message are required' },
        { status: 400 },
      );
    }

    const gw = getGatewayClient();
    const res = await gw.call<ChatResponse>('chat.send', {
      agentId,
      message,
    });

    return NextResponse.json({
      chatId: res?.chatId || crypto.randomUUID(),
      text: res?.text || '',
      model: res?.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
