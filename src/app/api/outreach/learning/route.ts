import { NextResponse } from 'next/server';
import { getLearningStats } from '@/lib/outreach/learning';

// GET: stats and recent revisions for the Learning page
export async function GET() {
  try {
    const stats = await getLearningStats();
    return NextResponse.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
