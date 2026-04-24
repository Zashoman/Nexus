import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '../../../../lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ levels: store.getDrawdownLevels() });
}

const Body = z.object({
  levels: z.array(z.number().positive().lt(100)).min(1).max(8),
});

export async function PUT(req: Request) {
  const body = Body.parse(await req.json());
  const saved = store.setDrawdownLevels(body.levels);
  return NextResponse.json({ levels: saved });
}
