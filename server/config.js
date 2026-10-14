// MedPobeda — central configuration.
// All private config comes from environment variables (see .env.example).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env from the project root.
dotenvConfig({ path: path.join(ROOT, '.env') });

if (process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 ||
     /^(dev-insecure|replace-with)/.test(process.env.SESSION_SECRET))) {
  throw new Error('Production requires a random SESSION_SECRET of at least 32 characters.');
}

function intEnv(name, fallback) {
  const v = parseInt(process.env[name] || '', 10);
  return Number.isFinite(v) ? v : fallback;
}

export const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development', // 'development' | 'production'
  port: intEnv('PORT', 4000),
  trustProxy: intEnv('TRUST_PROXY_HOPS', 0),
  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-in-memory-secret-change-me',
  cookieSecure: String(process.env.COOKIE_SECURE || 'false') === 'true',
  sessionTtlHours: intEnv('SESSION_TTL_HOURS', 8),
  databasePath: path.resolve(ROOT, process.env.DATABASE_PATH || 'storage/medpobeda.sqlite'),
  databaseDriver: process.env.DATABASE_DRIVER || (process.env.TURSO_DATABASE_URL ? 'libsql' : 'sqlite'),
  tursoUrl: process.env.TURSO_DATABASE_URL || '',
  tursoToken: process.env.TURSO_AUTH_TOKEN || '',
  ephemeralHost: process.env.EPHEMERAL_HOST === 'true',
  mediaStorage: process.env.MEDIA_STORAGE || 'local',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  mediaBucket: process.env.SUPABASE_MEDIA_BUCKET || 'medpobeda-media',
  pdfEnabled: process.env.PDF_IMPORT_ENABLED !== 'false',
  storageDir: path.resolve(ROOT, process.env.STORAGE_DIR || 'storage/uploads'),
  maxUploadMb: intEnv('MAX_UPLOAD_MB', 8),
  publicOrigin: process.env.PUBLIC_ORIGIN || 'http://localhost:3000',
};

if (!['sqlite', 'libsql'].includes(config.databaseDriver)) throw new Error('Unknown DATABASE_DRIVER.');
if (!['local', 'supabase'].includes(config.mediaStorage)) throw new Error('Unknown MEDIA_STORAGE.');
if (config.tursoUrl) {
  if (config.databaseDriver !== 'libsql') throw new Error('Turso requires DATABASE_DRIVER=libsql.');
  const url = new URL(config.tursoUrl);
  if (!['libsql:', 'https:'].includes(url.protocol) || url.username || url.password || !config.tursoToken) {
    throw new Error('Turso requires an HTTPS/libsql URL and TURSO_AUTH_TOKEN.');
  }
}
if (config.mediaStorage === 'supabase') {
  const url = new URL(config.supabaseUrl);
  if ((url.protocol !== 'https:' && config.env === 'production') || url.username || url.password || !config.supabaseKey) {
    throw new Error('Supabase storage requires an HTTPS URL and a server-only key.');
  }
  if (!/^[a-z0-9-]+$/.test(config.mediaBucket)) throw new Error('Invalid storage bucket name.');
}
if (config.ephemeralHost && (!config.tursoUrl || config.mediaStorage !== 'supabase' || config.pdfEnabled)) {
  throw new Error('Ephemeral hosting requires Turso, Supabase media storage and PDF_IMPORT_ENABLED=false.');
}
