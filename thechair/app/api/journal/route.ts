import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '../../../lib/mock-store';

const SubmitBody = z.object({
  session_number: z.number().int().positive(),
  answers: z.array(z.string()),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(store.listSessions());
}

export async function POST(req: Request) {
  const body = SubmitBody.parse(await req.json());
  try {
    const session = store.completeSession(body.session_number, body.answers);
    return NextResponse.json({
      session_number: session.session_number,
      word_count: session.word_count,
      mentor_read: session.mentor_read,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 400 }
    );
  }
}
