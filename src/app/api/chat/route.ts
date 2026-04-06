import { NextResponse } from 'next/server';
import { isDbAvailable, query } from '@/lib/db';

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

  // Prevent prompt injection — only allow safe agent ID characters
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(body.agentId)) {
    return NextResponse.json({ error: 'Invalid agentId format' }, { status: 400 });
  }

  // Store user message in DB
  if (isDbAvailable()) {
    await query(
      `INSERT INTO chat_messages (agent_id, role, content) VALUES ($1, 'user', $2)`,
      [body.agentId, body.message.trim()],
    );
  }

  // Build message history for context
  let history: Array<{ role: string; content: string }> = [];
  if (isDbAvailable()) {
    const historyRes = await query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [body.agentId],
    );
    history = historyRes.rows.reverse();
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

    // Broadcast chat:start via WS
    try {
      const { broadcast } = await import('@/lib/ws-server');
      broadcast('chat:start', { agentId: body.agentId });
    } catch { /* WS not available */ }

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

                  // Broadcast chunk via WS
                  try {
                    const { broadcast } = await import('@/lib/ws-server');
                    broadcast('chat:chunk', { agentId: body.agentId, delta });
                  } catch { /* ignore */ }
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

          // Broadcast chat:done
          try {
            const { broadcast } = await import('@/lib/ws-server');
            broadcast('chat:done', { agentId: body.agentId });
          } catch { /* ignore */ }

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
