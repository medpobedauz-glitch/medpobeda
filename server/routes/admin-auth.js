// MedPobeda — admin auth routes.
import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import { verifyPassword } from '../middleware/auth.js';
import { audit } from '../middleware/auth.js';
import { ensureCsrf } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Current admin identity + fresh CSRF token (used by the admin UI).
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  ensureCsrf(req, res, () => {});
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      display_name: req.user.display_name,
      role: req.user.role,
    },
    csrfToken: req.session.csrfToken,
  });
});

router.post('/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
    // Same generic error for unknown email / wrong password / suspended.
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);
  req.session.user = { id: user.id };
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');

  audit(user.id, 'login', 'user', user.id, user.email, { email: user.email }, req.ip);
  return res.json({
    user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role },
    csrfToken: req.session.csrfToken,
  });
});

router.post('/logout', csrfProtection, (req, res) => {
  const uid = req.user?.id;
  if (uid) audit(uid, 'logout', 'user', uid, 'logout', {}, req.ip);
  req.session.destroy(() => {
    return res.json({ ok: true });
  });
});

export default router;