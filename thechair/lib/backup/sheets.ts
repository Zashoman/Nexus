// Phase 5: Google Sheets backup sync. Appends pending session rows to the
// three-tab sheet and marks them backed up. Safe to retry — failed runs do
// not mark rows, so the next run picks them up.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOG_PATH = path.join(os.homedir(), '.thechair', 'backup.log');

export async function nightlyBackup(): Promise<{ synced: number; error?: string }> {
  // Phase 1 stub
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} phase-1 stub run\n`);
    return { synced: 0 };
  } catch (e) {
    return { synced: 0, error: e instanceof Error ? e.message : 'unknown' };
  }
}
