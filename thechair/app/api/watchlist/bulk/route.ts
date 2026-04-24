import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '../../../../lib/mock-store';

const Item = z.object({
  ticker: z.string().min(1).max(12),
  thesis: z.string().optional(),
  trigger_price: z.number().nullable().optional(),
  invalidator: z.string().nullable().optional(),
  entry_price: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
});

const Body = z.object({ items: z.array(Item).min(1).max(200) });

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const result = store.bulkAdd(body.items);
  return NextResponse.json(result);
}
