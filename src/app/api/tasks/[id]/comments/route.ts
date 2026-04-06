import { NextResponse } from 'next/server';
import { isDbAvailable } from '@/lib/db';
import { addComment, getComments } from '@/lib/db-data';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  try {
    const comments = await getComments(id);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error loading comments:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbAvailable()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  let body: { content: string; author?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  try {
    // Do not forward body.author — always use the default 'operator' to prevent impersonation.
    const comment = await addComment(id, body.content.trim());
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
