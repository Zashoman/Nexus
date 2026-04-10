import { NextResponse } from 'next/server';
import { classifyReplies } from '@/lib/outreach/classifier';

// POST: classify a batch of email replies using Claude
export async function POST(request: Request) {
  try {
    const { replies } = await request.json();

    if (!replies || !Array.isArray(replies) || replies.length === 0) {
      return NextResponse.json({ error: 'replies array is required' }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (replies.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 replies per batch' }, { status: 400 });
    }

    const results = await classifyReplies(replies);

    // Convert Map to plain object for JSON
    const classifications: Record<string, unknown> = {};
    for (const [id, result] of results) {
      classifications[id] = result;
    }

    return NextResponse.json({ classifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Classification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
