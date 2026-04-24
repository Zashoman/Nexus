import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '../../../lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const unack = url.searchParams.get('unacknowledged') === 'true';
  return NextResponse.json(store.listAlerts({ unacknowledgedOnly: unack }));
}

const PostBody = z.union([
  z.object({ id: z.number().int().positive(), action: z.literal('acknowledge') }),
  z.object({ all: z.literal(true), action: z.literal('acknowledge') }),
]);

export async function POST(req: Request) {
  const body = PostBody.parse(await req.json());
  if ('all' in body) {
    return NextResponse.json({ acknowledged: store.acknowledgeAllAlerts() });
  }
  const ok = store.acknowledgeAlert(body.id);
  return NextResponse.json({ ok });
}
