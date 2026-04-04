/**
 * GET/POST /api/gateway/tasks/[id]/comments
 *
 * File-based comment storage for gateway tasks.
 * Comments are persisted in .gateway-comments.json (gitignored).
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const COMMENTS_FILE = join(process.cwd(), '.gateway-comments.json');

// Serializes concurrent writes to prevent race conditions
let writeLock = Promise.resolve();

interface StoredComment {
  id: number;
  taskId: string;
  author: string;
  content: string;
  createdAt: number;
}

type CommentsStore = Record<string, StoredComment[]>;

async function loadStore(): Promise<CommentsStore> {
  try {
    const raw = await readFile(COMMENTS_FILE, 'utf-8');
    return JSON.parse(raw) as CommentsStore;
  } catch {
    return {};
  }
}

async function saveStore(store: CommentsStore): Promise<void> {
  await writeFile(COMMENTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = await loadStore();
  return NextResponse.json({ comments: store[id] || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  let savedComment: StoredComment | undefined;
  writeLock = writeLock.then(async () => {
    const store = await loadStore();
    const taskComments = store[id] || [];
    const nextId = taskComments.length > 0
      ? Math.max(...taskComments.map(c => c.id)) + 1
      : 1;

    const comment: StoredComment = {
      id: nextId,
      taskId: id,
      author: body.author || 'operator',
      content,
      createdAt: Date.now(),
    };

    taskComments.push(comment);
    store[id] = taskComments;
    await saveStore(store);
    savedComment = comment;
  });
  await writeLock;

  return NextResponse.json({ comment: savedComment }, { status: 201 });
}
