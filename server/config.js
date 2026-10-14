// MedPobeda — central configuration.
// All private config comes from environment variables (see .env.example).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env from the project root.
dotenvConfig({ path: path.join(ROOT, '.env') });

function intEnv(name, fallback) {
  const v = parseInt(process.env[name] || '', 10);
  return Number.isFinite(v) ? v : fallback;
}

export const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development', // 'development' | 'production'
  port: intEnv('PORT', 4000),
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-in-memory-secret-change-me',
  cookieSecure: String(process.env.COOKIE_SECURE || 'false') === 'true',
  sessionTtlHours: intEnv('SESSION_TTL_HOURS', 8),
  databasePath: path.resolve(ROOT, process.env.DATABASE_PATH || 'storage/medpobeda.sqlite'),
  storageDir: path.resolve(ROOT, process.env.STORAGE_DIR || 'storage/uploads'),
  maxUploadMb: intEnv('MAX_UPLOAD_MB', 8),
  publicOrigin: process.env.PUBLIC_ORIGIN || 'http://localhost:3000',
};