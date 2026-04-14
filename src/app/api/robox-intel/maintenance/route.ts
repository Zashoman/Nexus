import { NextResponse } from 'next/server';
import {
  unsnoozeExpired,
  autoArchiveStale,
  checkVelocityAlerts,
} from '@/lib/robox-intel/maintenance';

export const maxDuration = 120;

/**
 * Housekeeping job — run hourly via cron.
 *   - Un-snooze expired snoozes
 *   - Auto-archive stale 'new' signals past the threshold
 *   - Check for velocity spikes and fire Slack alerts
 *
 * Safe to run as often as you like; all operations are idempotent.
 */
async function handle() {
  const [snooze, archive, velocity] = await Promise.all([
    unsnoozeExpired().catch((e) => ({ unsnoozed: 0, error: String(e) })),
    autoArchiveStale().catch((e) => ({ archived: 0, error: String(e) })),
    checkVelocityAlerts().catch((e) => ({
      alertsFired: 0,
      companies: [],
      error: String(e),
    })),
  ]);
  return NextResponse.json({ snooze, archive, velocity });
}

export const GET = handle;
export const POST = handle;
