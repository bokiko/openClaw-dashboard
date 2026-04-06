import { NextResponse } from 'next/server';
import { generateFeedUnified } from '@/lib/data-source';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // generateFeedUnified handles DB/file dispatch internally
    const feed = await generateFeedUnified();
    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error loading feed:', error);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}
