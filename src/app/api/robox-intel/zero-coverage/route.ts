import { NextResponse } from 'next/server';
import { runZeroCoverageSweep } from '@/lib/robox-intel/zero-coverage';

// Coverage check can be slow — many RSS fetches in sequence
export const maxDuration = 300;

/**
 * Sweep all recent press release signals and mark those with zero
 * media pickup. Runs on an hourly schedule via Vercel cron.
 */
async function handle() {
  try {
    const result = await runZeroCoverageSweep();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
