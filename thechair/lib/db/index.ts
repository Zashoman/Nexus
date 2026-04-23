import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let _db: Database.Database | null = null;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_PATH || path.join(os.homedir(), '.thechair', 'thechair.db');
  const resolved = raw.startsWith('~') ? path.join(os.homedir(), raw.slice(1)) : raw;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  _db = db;
  return db;
}

export function runSchema(): void {
  const db = getDb();
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = path.join(process.cwd(), 'lib', 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name as string)
  );

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const insertMigration = db.prepare(
    'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)'
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file, new Date().toISOString());
    });
    tx();
  }
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
