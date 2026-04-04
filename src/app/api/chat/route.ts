import { NextResponse } from 'next/server';
import { isDbAvailable, query } from '@/lib/db';
import type { WsEventType } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let body: { agentId: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.agentId || !body.message?.trim()) {
    return NextResponse.json({ error: 'agentId and message are required' }, { status: 400 });
  }

  // Validate agentId to prevent prompt injection
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(body.agentId)) {
    return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 });
  }

  // Enforce message length limit to prevent unbounded API spend
  if (body.message.length > 10000) {
    return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 });
  }

  // Store user message in DB
  if (isDbAvailable()) {
    try {
      await query(
        `INSERT INTO chat_messages (agent_id, role, content) VALUES ($1, 'user', $2)`,
        [body.agentId, body.message.trim()],
      );
    } catch {
      // DB insert is optional — continue without persisting
    }
  }

  // Build message history for context
  let history: Array<{ role: string; content: string }> = [];
  if (isDbAvailable()) {
    try {
      const historyRes = await query<{ role: string; content: string }>(
        `SELECT role, content FROM chat_messages WHERE agent_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [body.agentId],
      );
      history = historyRes.rows.reverse();
    } catch {
      // DB unavailable — fall through to single-message context
      history = [{ role: 'user', content: body.message.trim() }];
    }
  } else {
    history = [{ role: 'user', content: body.message.trim() }];
  }

  // Call Anthropic Messages API with streaming
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are ${body.agentId}, an AI agent working on tasks. Be concise and helpful.`,
        messages: history.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'Chat API error' }, { status: 502 });
    }

    // Import broadcast once — reused for chat:start, per-chunk, and chat:done
    let broadcast: ((type: WsEventType, payload: unknown) => void) | null = null;
    try {
      const wsServer = await import('@/lib/ws-server');
      broadcast = wsServer.broadcast;
    } catch { /* WS not available */ }

    broadcast?.('chat:start', { agentId: body.agentId });

    // Stream the response
    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const event = JSON.parse(data);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  const delta = event.delta.text;
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));

                  broadcast?.('chat:chunk', { agentId: body.agentId, delta });
                }
              } catch { /* skip unparseable events */ }
            }
          }
        } finally {
          // Store assistant message
          if (isDbAvailable() && fullContent) {
            await query(
              `INSERT INTO chat_messages (agent_id, role, content) VALUES ($1, 'assistant', $2)`,
              [body.agentId, fullContent],
            );
          }

          broadcast?.('chat:done', { agentId: body.agentId });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
