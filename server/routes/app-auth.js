import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { csrfProtection } from '../middleware/csrf.js';
import { createAppAuthClient, AppAuthError } from '../services/app-auth-client.js';

// Separate from /api/auth: remote user IDs must never reach local SQLite routes.
// Disabled until the supplied backend's password check has been fixed/verified.
export function createAppAuthRouter({
  enabled = false, origin = 'http://localhost:3000',
  client = createAppAuthClient(), now = Date.now,
} = {}) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/status', (_req, res) => res.json({
    loginEnabled: enabled, qbankConnected: false, progressConnected: false,
  }));
  router.use((_req, res, next) => enabled ? next() : res.status(503).json({
    error: 'App integration is not activated. Backend verification is pending.',
  }));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20,
    standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again later.' },
  });
  router.post('/login', limiter, async (req, res, next) => {
    if (req.get('origin') !== origin) return res.status(403).json({ error: 'Invalid request origin.' });
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        !password.length || password.length > 1024) {
      return res.status(400).json({ error: 'Enter your app email and password.' });
    }
    try {
      const auth = await client.login(email.trim(), password);
      await new Promise((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
      req.session.appAuth = auth;
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
      await new Promise((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
      res.json({ profile: auth.profile, csrfToken: req.session.csrfToken, expiresAt: auth.expiresAt });
    } catch (error) {
      if (error instanceof AppAuthError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });
  router.get('/session', (req, res) => {
    const auth = req.session.appAuth;
    if (!auth || auth.expiresAt <= now()) {
      delete req.session.appAuth;
      return res.status(401).json({ error: 'Sign in with your app account.' });
    }
    // A snapshot, not upstream revalidation: no profile/me endpoint was supplied.
    res.json({ profile: auth.profile, expiresAt: auth.expiresAt,
      csrfToken: req.session.csrfToken, profileSource: 'login-snapshot' });
  });
  router.post('/logout', csrfProtection, (req, res, next) => {
    delete req.session.appAuth;
    req.session.save(error => error ? next(error) : res.json({ ok: true }));
  });
  return router;
}
