import { NextResponse } from 'next/server';
import { getMockSnapshot } from '../../../../lib/market/mock';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Phase 1: return mock. Phase 3: read latest row from market_snapshots in SQLite
  // and attach derived tile presentation (percentiles, duration, direction).
  return NextResponse.json(getMockSnapshot());
}
