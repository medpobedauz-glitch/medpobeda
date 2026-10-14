// Quick session check
import Database from 'better-sqlite3';
import { config } from '../server/config.js';
const db = new Database(config.databasePath);
const rows = db.prepare('SELECT id, user_id, csrf_token, data, expires_at FROM sessions').all();
console.log('Sessions in DB:', rows.length);
for (const r of rows) {
  console.log('  id:', r.id?.slice(0, 30), 'user_id:', r.user_id, 'csrf:', r.csrf_token?.slice(0, 10), 'data:', r.data?.slice(0, 50), 'expires:', r.expires_at);
}
db.close();