import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  // Phase 1: no-op. Phase 5 will call lib/backup/sheets.ts nightlyBackup().
  return NextResponse.json({
    ok: true,
    synced: 0,
    note: 'Phase 1 stub — Google Sheets backup not wired up yet.',
  });
}
