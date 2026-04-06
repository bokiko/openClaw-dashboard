import { NextResponse } from 'next/server';
import { generateFeedUnified } from '@/lib/data-source';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50), 100);

  try {
    const feed = await generateFeedUnified(undefined, limit);
    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error loading feed:', error);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}
