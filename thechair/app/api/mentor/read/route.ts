import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMockRead } from '../../../../lib/mentor/mock';

const Body = z.object({
  regime: z.enum(['calm', 'elevated', 'stressed', 'dislocation']),
  answers: z.array(z.string()),
});

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  // Phase 1 mock; Phase 2 will call Anthropic with the Q&A pairs.
  return NextResponse.json(getMockRead(body.regime, body.answers));
}
