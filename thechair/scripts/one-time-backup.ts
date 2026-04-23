#!/usr/bin/env tsx
// Phase 5: run a manual one-shot backup. Useful right after setup to seed the sheet.

import { nightlyBackup } from '../lib/backup/sheets';

(async () => {
  const result = await nightlyBackup();
  // eslint-disable-next-line no-console
  console.log('[one-time-backup]', result);
})();
