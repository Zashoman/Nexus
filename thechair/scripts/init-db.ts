#!/usr/bin/env tsx
// Idempotent DB initializer: runs schema.sql then any pending migrations.

import { getDb, runSchema, runMigrations, closeDb } from '../lib/db';

function main(): void {
  runSchema();
  runMigrations();
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;
  // eslint-disable-next-line no-console
  console.log('[init-db] tables:', tables.map((t) => t.name).join(', '));
  closeDb();
}

main();
