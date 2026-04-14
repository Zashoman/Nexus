import { NextRequest, NextResponse } from 'next/server';
import { sendDailyDigest, buildDailyDigest } from '@/lib/robox-intel/digest';

export const maxDuration = 60;

/**
 * GET  — build and send the daily digest (called by Vercel cron at 8am).
 *        Uses Resend if RESEND_API_KEY is set, else legacy webhook.
 *
 * POST /?preview=true — return the payload without sending.
 * POST                 — send, with optional { recipients: string[] } override.
 */
export async function GET() {
  const result = await sendDailyDigest();
  return NextResponse.json({
    sent: result.sent,
    provider: result.provider,
    reason: result.reason,
    date: result.bundle.date,
    signalsFound: result.bundle.signalsFound,
    deliveredTo: result.deliveredTo,
  });
}

export async function POST(req: NextRequest) {
  const preview = req.nextUrl.searchParams.get('preview') === 'true';
  if (preview) {
    const bundle = await buildDailyDigest();
    return NextResponse.json(bundle);
  }
  const body = await req.json().catch(() => ({}));
  const recipients = Array.isArray(body.recipients)
    ? body.recipients.map(String)
    : undefined;
  const result = await sendDailyDigest(recipients);
  return NextResponse.json({
    sent: result.sent,
    provider: result.provider,
    reason: result.reason,
    date: result.bundle.date,
    signalsFound: result.bundle.signalsFound,
    deliveredTo: result.deliveredTo,
  });
}
