// MedPobeda — CSRF protection middleware.
// All admin state-changing requests must present the session-bound token.
import crypto from 'node:crypto';

export function csrfProtection(req, res, next) {
  if (!req.session || !req.session.csrfToken) {
    return res.status(403).json({ error: 'CSRF token missing. Refresh the page and try again.' });
  }
  const token = req.headers['x-csrf-token'] || req.body?.csrf_token || '';
  let matches = false;
  try {
    matches = crypto.timingSafeEqual(
      Buffer.from(String(token)),
      Buffer.from(req.session.csrfToken)
    );
  } catch {
    matches = false;
  }
  if (!matches) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}