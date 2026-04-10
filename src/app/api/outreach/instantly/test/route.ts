import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/outreach/instantly';

// GET-only: test Instantly API connection
export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
