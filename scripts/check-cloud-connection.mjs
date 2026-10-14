// Run: node --env-file=.env.cloud scripts/check-cloud-connection.mjs
// Checks credentials without copying local users/content or printing secrets.
const required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error('Fill these private fields in .env.cloud: ' + missing.join(', '));
  process.exit(1);
}
let db;
try {
  ({ db } = await import('../server/db/index.js'));
  db.prepare('SELECT 1 AS connected').get();
  console.log('Turso connection: OK');
  const { ensureMediaBucket } = await import('../server/services/object-storage.js');
  await ensureMediaBucket();
  console.log('Supabase private media bucket: OK');
  console.log('Cloud credentials verified. Local accounts and content were not copied.');
} catch {
  console.error('Cloud connection failed. Check the private keys and provider dashboards; no credential values were printed.');
  process.exitCode = 1;
} finally { db?.close(); }
