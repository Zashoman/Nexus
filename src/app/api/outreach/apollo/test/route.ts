import { NextResponse } from 'next/server';
import { testApolloConnection } from '@/lib/outreach/apollo';

export async function GET() {
  try {
    const result = await testApolloConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
