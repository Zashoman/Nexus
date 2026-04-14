import { NextRequest, NextResponse } from 'next/server';
import { sendDailyDigest, buildDailyDigest } from '@/lib/robox-intel/digest';

export const maxDuration = 60;

/**
 * GET  — build and send the daily digest (called by Vercel cron at 8am).
 *        If DIGEST_WEBHOOK_URL / DIGEST_RECIPIENT are not set, the payload
 *        is returned inline so you can wire up sending later.
 *
 * POST /?preview=true — return the payload without attempting to send.
 */
export async function GET() {
  const result = await sendDailyDigest();
  return NextResponse.json({
    sent: result.sent,
    reason: result.reason,
    date: result.bundle.date,
    signalsFound: result.bundle.signalsFound,
    signals: result.bundle.signals,
  });
}

export async function POST(req: NextRequest) {
  const preview = req.nextUrl.searchParams.get('preview') === 'true';
  if (preview) {
    const bundle = await buildDailyDigest();
    return NextResponse.json(bundle);
  }
  const body = await req.json().catch(() => ({}));
  const result = await sendDailyDigest(body.recipient);
  return NextResponse.json({
    sent: result.sent,
    reason: result.reason,
    date: result.bundle.date,
    signalsFound: result.bundle.signalsFound,
  });
}
