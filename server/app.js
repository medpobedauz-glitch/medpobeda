import { anatomyAssets } from './middleware/anatomy-assets.js';
import studentAnswersRouter from './routes/student-answers.js';
import { createAppAuthRouter } from './routes/app-auth.js';
import { createAppAuthClient } from './services/app-auth-client.js';
import studentProfileRouter from './routes/student-profile.js';
import studentDashboardRouter from './routes/student-dashboard.js';
import publicCommonExtRouter from './routes/public-common-ext.js';
import adminExtensionsRouter from './routes/admin-extensions.js';
import adminQbankRouter from './routes/admin-qbank.js';
// MedPobeda — Express application server.
// Mounts admin API, public API, media serving, SPA fallback, and error handling.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import { config } from './config.js';
import { runPendingMigrations } from '../scripts/migrate.mjs';
import { db } from './db/index.js';
import { SqliteSessionStore } from './services/session-store.js';
import { bootstrapSessionUser, ensureCsrf } from './middleware/auth.js';
import { attachStudent } from './middleware/student-auth.js';
import { errorHandler } from './middleware/error.js';
import adminAuthRouter from './routes/admin-auth.js';
import adminContentRouter from './routes/admin-content.js';
import adminQuestionsRouter from './routes/admin-questions.js';
import adminMediaRouter from './routes/admin-media.js';
import adminPdfImportRouter from './routes/admin-pdf-import.js';
import { startPdfWorker } from './services/pdf-worker.js';
import adminUsersRouter from './routes/admin-users.js';
import publicLearnRouter from './routes/public-learn.js';
import publicQuestionsRouter from './routes/public-questions.js';
import studentBookmarksRouter from './routes/student-bookmarks.js';
import publicAuthRouter from './routes/public-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Run database migrations (idempotent) before serving any request ---
runPendingMigrations();

const app = express();

// --- Body parsing ---
app.use('/api/admin/qbank/import', express.json({limit:'8mb'}));
app.use('/api/admin/qbank', express.json({limit:'2mb'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // parses CSRF tokens from form bodies

// --- CORS (development only; production is same-origin or behind a proxy) ---
if (config.env !== 'production') {
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', config.publicOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

// Anatomy assets must remain available while Vite rebuilds dist.
app.use('/models', anatomyAssets(path.join(ROOT, 'public', 'models')));

// --- Session (SQLite-backed, server-side) ---
app.use(session({
  store: new SqliteSessionStore(),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.cookieSecure,
    httpOnly: true,
    maxAge: config.sessionTtlHours * 60 * 60 * 1000,
  },
}));

// --- Resolve req.user / req.student from session + issue CSRF token ---
app.use(bootstrapSessionUser);
app.use(attachStudent);
app.use(ensureCsrf);

// --- Static assets ---
app.use('/media', express.static(config.storageDir));
if (config.env === 'production') {
  app.use(express.static(path.join(ROOT, 'dist')));
}

// --- Health check (no auth required) ---
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env });
});

// --- Admin API routes ---
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/content', adminContentRouter);
app.use('/api/admin', adminQuestionsRouter);
app.use('/api/admin', adminMediaRouter);
app.use('/api/admin', adminUsersRouter);
app.use('/api/admin/pdf-import', adminPdfImportRouter);
app.use('/api/admin/qbank', adminQbankRouter);
startPdfWorker();

// --- Public API routes (student-facing, published content only) ---
app.use('/api/public', publicLearnRouter);
app.use('/api/public', publicQuestionsRouter);

// --- Student auth (register / login / me / logout) ---
app.use('/api/app/auth', createAppAuthRouter({
  enabled: process.env.MEDPOBEDA_APP_LOGIN_ENABLED === 'true',
  origin: config.publicOrigin,
  client: createAppAuthClient({ baseUrl: process.env.MEDPOBEDA_APP_API_ORIGIN || 'https://api.medpobeda.com' }),
}));
app.use('/api/auth', publicAuthRouter);
app.use('/api/auth', studentBookmarksRouter);
app.use('/api/auth', studentAnswersRouter);
app.use('/api/student', studentProfileRouter);
app.use('/api/student', studentDashboardRouter);
app.use('/api/public', publicCommonExtRouter);
app.use('/api/admin', adminExtensionsRouter);

// --- SPA fallback: any non-API, non-media route serves the built SPA ---
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/media/')) {
    return next(); // Let 404 handler / error middleware respond
  }
  if (config.env === 'production') {
    const indexPath = path.join(ROOT, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  }
  next();
});

// --- JSON 404 for any unmatched API route ---
app.use((req, res) => {
  return res.status(404).json({ error: 'Not found.' });
});

// --- Final error handler (must be last middleware) ---
app.use(errorHandler);

// --- Start server ---
const port = config.port;
app.listen(port, () => {
  console.log(`[MedPobeda] Server listening on :${port} (${config.env})`);
});

export default app;
