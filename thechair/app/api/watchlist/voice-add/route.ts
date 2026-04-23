import { NextResponse } from 'next/server';
import { z } from 'zod';

const Body = z.object({ transcript: z.string().min(1) });

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  // Phase 1: naive parser. Phase 4 will call Anthropic to parse the transcript into
  // { ticker, thesis, trigger_price, invalidator } with a confirmation modal.
  const tickerMatch = body.transcript.match(/\b[A-Z]{2,5}\b/);
  return NextResponse.json({
    suggested: {
      ticker: tickerMatch ? tickerMatch[0] : '',
      thesis: body.transcript.trim(),
      trigger_price: null,
      invalidator: null,
    },
    raw_transcript: body.transcript,
  });
}
