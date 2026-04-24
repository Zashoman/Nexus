#!/usr/bin/env tsx
//
// Bulk-import watchlist names from a JSON file. Useful when seeding The Chair
// from an existing tracker (Robinhood / TradingView / Bloomberg launchpad).
//
// File format (`watchlist.json`):
//   [
//     { "ticker": "LRCX", "entry_price": 880, "thesis": "WFE cycle troughing." },
//     { "ticker": "ASML", "entry_price": 1417.80 },
//     ...
//   ]
//
// `entry_price` is the price the day you started watching it. Without it, the
// "Since Entry" column is blank until the next snapshot fills it in.
//
// Usage:
//   pnpm tsx scripts/import-watchlist.ts ./my-watchlist.json
//   tsx scripts/import-watchlist.ts ./my-watchlist.json
//
// Posts against http://localhost:3000/api/watchlist/bulk by default.
// Override with CHAIR_BASE=http://localhost:3001.

import fs from 'node:fs';
import path from 'node:path';

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: tsx scripts/import-watchlist.ts <watchlist.json>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  const items = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const base = process.env.CHAIR_BASE || 'http://localhost:3000';

  const res = await fetch(`${base}/api/watchlist/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  console.log(JSON.stringify(await res.json(), null, 2));
}

main();
