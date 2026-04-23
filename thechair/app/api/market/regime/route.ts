import { NextResponse } from 'next/server';
import { getMockSnapshot } from '../../../../lib/market/mock';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snap = getMockSnapshot();
  return NextResponse.json({
    regime: snap.regime,
    regime_score: snap.regime_score,
    sub_signals: snap.sub_signals,
    captured_at: snap.captured_at,
  });
}
