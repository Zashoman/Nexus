#!/usr/bin/env tsx
// Inserts a handful of watchlist names and completed sessions so the History
// and Patterns tabs have something to render in dev.

import { getDb, runSchema, runMigrations, closeDb } from '../lib/db';

function main(): void {
  runSchema();
  runMigrations();
  const db = getDb();

  const existing = db.prepare('SELECT COUNT(*) AS n FROM watchlist').get() as {
    n: number;
  };
  if (existing.n > 0) {
    // eslint-disable-next-line no-console
    console.log('[seed-dev] data already present, skipping');
    closeDb();
    return;
  }

  const now = new Date().toISOString();
  const insertW = db.prepare(
    `INSERT INTO watchlist (ticker, thesis, trigger_price, invalidator, added_at, active)
     VALUES (?, ?, ?, ?, ?, 1)`
  );
  insertW.run('AVGO', 'AI infra pull-forward; custom silicon moat.', 165, 'Hyperscaler capex cut >15%', now);
  insertW.run('LRCX', 'WFE cycle troughing; memory capex recovery.', 720, 'Memory capex push-out', now);
  insertW.run('COIN', 'Vol-of-vol proxy; stress-regime divergence watch.', 180, 'BTC IV <50 for 2w', now);

  const insertSession = db.prepare(
    `INSERT INTO sessions (session_number, created_at, regime, regime_score,
       market_snapshot, questions, answers, word_count, tags, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const demo = [
    {
      n: 1,
      regime: 'elevated' as const,
      score: 42,
      q: [{ n: 1, text: 'VXN 24.3, third day up. What does that feel like?' }],
      a: ['Honestly a little tight. Watching but not waiting for confirmation yet.'],
    },
    {
      n: 2,
      regime: 'calm' as const,
      score: 18,
      q: [{ n: 1, text: 'The tape is quiet. What are you doing with that quiet?' }],
      a: ['Cleaning the list. Three names got sharper theses today.'],
    },
  ];
  for (const s of demo) {
    const words = s.a.reduce((sum, x) => sum + x.trim().split(/\s+/).filter(Boolean).length, 0);
    insertSession.run(
      s.n,
      new Date(Date.now() - s.n * 86400000).toISOString(),
      s.regime,
      s.score,
      '{}',
      JSON.stringify(s.q),
      JSON.stringify(s.a),
      words,
      JSON.stringify([]),
      new Date(Date.now() - s.n * 86400000 + 3600000).toISOString()
    );
  }

  // eslint-disable-next-line no-console
  console.log('[seed-dev] inserted 3 watchlist names and 2 sessions');
  closeDb();
}

main();
