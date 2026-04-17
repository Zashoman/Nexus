import { NextResponse } from 'next/server';
import { autoRefreshData } from '@/lib/realestate/claude';

// Public refresh: anyone can pull the latest market data.
// This is intentional — the refresh hits Claude + writes weekly
// stats to Supabase. Rate-limited only by the underlying APIs.
export async function POST() {
  try {
    const result = await autoRefreshData();
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auto-refresh failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
