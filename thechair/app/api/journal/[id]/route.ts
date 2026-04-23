import { NextResponse } from 'next/server';
import { store } from '../../../../lib/mock-store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const n = Number(params.id);
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }
  const session = store.getSession(n);
  if (!session) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}
