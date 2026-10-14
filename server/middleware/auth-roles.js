// MedPobeda — role-based authorization for admin routes and APIs.
import { can } from './auth.js';

export function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.accepts('json')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

export function requireRole(...perms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const ok = perms.some((p) => can(req.user.role, p));
    if (!ok) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}