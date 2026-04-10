import { NextResponse } from 'next/server';
import { testSlackConnection } from '@/lib/outreach/slack';

// GET: test Slack connection
export async function GET() {
  try {
    const result = await testSlackConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
