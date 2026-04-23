// Entry point for the long-lived worker process (run alongside `next start`).
// Uses node-cron to register schedules against the LOCAL_TZ timezone.

import cron from 'node-cron';
import { runMarketPoll } from './market-poll';
import { runNightlyBackup } from './nightly-backup';

const TZ = process.env.LOCAL_TZ || 'America/New_York';

function start() {
  // Market hours poll: every 5 minutes, 9:30-16:00 ET (Mon-Fri).
  // US market hours are fixed to America/New_York regardless of LOCAL_TZ.
  cron.schedule('*/5 9-16 * * 1-5', runMarketPoll, {
    timezone: 'America/New_York',
  });

  // Off-hours poll: every 30 minutes.
  cron.schedule('*/30 * * * *', runMarketPoll, { timezone: TZ });

  // Nightly Google Sheets backup at 23:59 local.
  cron.schedule('59 23 * * *', runNightlyBackup, { timezone: TZ });

  // eslint-disable-next-line no-console
  console.log(`[workers] started; TZ=${TZ}`);
}

start();
