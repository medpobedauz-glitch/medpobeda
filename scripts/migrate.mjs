// MedPobeda — migration runner.
// Applies server/db/migrations/*.sql in filename order inside transactions,
// records each in schema_migrations with a checksum, and is idempotent.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'server', 'db', 'migrations');

// Import config + db (they load .env and create storage dirs).
const { db } = await import(path.join(ROOT, 'server', 'db', 'index.js'));

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

function ensureTracker() {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    checksum   TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

function listMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.js'))
    .sort();
}

export function appliedMigrations() {
  ensureTracker();
  return db.prepare('SELECT filename, checksum FROM schema_migrations').all();
}

export function status() {
  const applied = new Map(appliedMigrations().map((r) => [r.filename, r]));
  const files = listMigrationFiles();
  const rows = [];
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const sum = checksum(sql);
    const row = applied.get(f);
    rows.push({
      filename: f,
      applied: Boolean(row),
      checksumOk: row ? row.checksum === sum : null,
    });
  }
  return rows;
}

export function runPendingMigrations() {
  ensureTracker();
  const applied = new Set(appliedMigrations().map((r) => r.filename));
  const appliedCount = applied.size;
  let ran = 0;
  for (const f of listMigrationFiles()) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const sum = checksum(sql);
    const apply = db.transaction(() => {
      if (f.endsWith('.js')) migrationModules.get(f).up(db);
      else db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)').run(f, sum);
    });
    apply();
    console.log(`applied: ${f}`);
    ran += 1;
  }
  return { ran, appliedCount };
}

const migrationModules = new Map();
for (const file of listMigrationFiles().filter((f) => f.endsWith('.js'))) {
  migrationModules.set(file, await import(path.join(MIGRATIONS_DIR, file)));
}

// CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--status')) {
    console.table(status());
  } else {
    runPendingMigrations();
  }
}