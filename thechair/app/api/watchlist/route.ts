import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '../../../lib/mock-store';

const PostBody = z.object({
  ticker: z.string().min(1).max(12),
  thesis: z.string().min(1),
  trigger_price: z.number().nullable().optional(),
  invalidator: z.string().nullable().optional(),
});

const PutBody = z.object({
  id: z.number().int().positive(),
  thesis: z.string().optional(),
  trigger_price: z.number().nullable().optional(),
  invalidator: z.string().nullable().optional(),
  entry_price: z.number().nullable().optional(),
  high_water_mark: z.number().nullable().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(store.listWatchlist());
}

export async function POST(req: Request) {
  const body = PostBody.parse(await req.json());
  const added = store.addWatchlist({
    ticker: body.ticker,
    thesis: body.thesis,
    trigger_price: body.trigger_price ?? null,
    invalidator: body.invalidator ?? null,
  });
  return NextResponse.json(added, { status: 201 });
}

export async function PUT(req: Request) {
  const body = PutBody.parse(await req.json());
  const { id, ...patch } = body;
  const updated = store.updateWatchlist(id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }
  const ok = store.archiveWatchlist(id);
  return NextResponse.json({ ok });
}
