// Quick DB inspection script.
import Database from 'better-sqlite3';
import { config } from '../server/config.js';
const db = new Database(config.databasePath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

for (const t of ['curricula', 'subjects', 'modules', 'topics', 'questions', 'users']) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get();
  console.log(`${t}: ${row.n}`);
}

const users = db.prepare('SELECT id, email, role, status FROM users').all();
console.log('Users:', JSON.stringify(users, null, 2));

const curricula = db.prepare('SELECT id, slug, status FROM curricula').all();
console.log('Curricula:', JSON.stringify(curricula, null, 2));

db.close();