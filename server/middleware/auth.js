// MedPobeda — auth helpers: password hashing, session user resolution, roles.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { config } from '../config.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function getUserById(id) {
  return db.prepare(
    'SELECT id, email, display_name, role, status, last_login_at, created_at FROM users WHERE id = ?'
  ).get(id) || null;
}

export function bootstrapSessionUser(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    const fresh = getUserById(req.session.user.id);
    if (fresh && fresh.status === 'active') {
      req.user = fresh;
    } else {
      // Suspended or deleted mid-session: force logout.
      req.session.user = null;
    }
  }
  next();
}

// Loads the csrf token into the session once per session.
export function ensureCsrf(req, res, next) {
  if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

// Generates an audit record for an admin action.
export function audit(userId, action, entityType, entityId, entityLabel, details, ip) {
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, entity_label, details, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    action,
    entityType || '',
    entityId ?? null,
    entityLabel || '',
    details ? JSON.stringify(details) : null,
    ip || ''
  );
}

export const ROLES = ['super_admin', 'content_editor', 'reviewer'];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  reviewer: 'Reviewer',
};

// Role capability map (used server-side for authorization).
export const ROLE_PERMS = {
  super_admin: ['read', 'write', 'review', 'publish', 'media', 'users', 'audit', 'delete'],
  content_editor: ['read', 'write', 'media', 'submit_review'],
  reviewer: ['read', 'review', 'publish'],
};

export function can(role, perm) {
  const perms = ROLE_PERMS[role] || [];
  return perms.includes(perm);
}