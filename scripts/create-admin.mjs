// Run in the backend shell. Supply credentials as private environment variables.
import { db } from '../server/db/index.js';
import { runPendingMigrations } from './migrate.mjs';
import { hashPassword } from '../server/middleware/auth.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters) in the private shell environment.');
  process.exit(1);
}
runPendingMigrations();
if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
  console.error('Account already exists; no account or password was changed.');
  process.exit(1);
}
db.prepare('INSERT INTO users (email,password_hash,display_name,role,status) VALUES (?,?,?,?,?)')
  .run(email, hashPassword(password), process.env.ADMIN_NAME || 'Administrator', 'super_admin', 'active');
console.log('Administrator created. Remove ADMIN_PASSWORD from the environment now.');
db.close();
