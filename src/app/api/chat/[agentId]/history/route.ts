import { NextResponse } from 'next/server';
import { isDbAvailable, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(agentId)) {
    return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 });
  }

  if (!isDbAvailable()) {
    return NextResponse.json({ messages: [] });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100));
  const offset = Math.max(0, Math.min(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 10000));

  try {
    const result = await query<{
      id: number; agent_id: string; role: string; content: string;
      metadata: Record<string, unknown>; created_at: Date;
    }>(
      `SELECT id, agent_id, role, content, metadata, created_at
       FROM chat_messages WHERE agent_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [agentId, limit, offset],
    );

    const messages = result.rows.reverse().map(r => ({
      id: r.id,
      agentId: r.agent_id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      metadata: r.metadata,
      createdAt: r.created_at.getTime(),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error loading chat history:', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
