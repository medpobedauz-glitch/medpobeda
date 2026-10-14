// MedPobeda — SQLite-backed session store for express-session.
// Sessions live in the database so revoking a login is server-side and instant.
import session from 'express-session';
import { db } from '../db/index.js';
import { config } from '../config.js';

function serialize(session) {
  // Persist only safe, serializable fields.
  return JSON.stringify({
    user: session.user || null,
    student: session.student || null,
    // Server-only app token; never use its ID as a local students table key.
    appAuth: session.appAuth || null,
  });
}

function deserialize(data) {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export class SqliteSessionStore extends session.Store {
  // express-session's createSession expects sess.cookie; our serialized data
  // may not include it (anonymous or pre-login sessions). Provide a default.
  createSession(req, sess) {
    if (!sess.cookie) {
      sess.cookie = { maxAge: config.sessionTtlHours * 60 * 60 * 1000, originalMaxAge: config.sessionTtlHours * 60 * 60 * 1000 };
    }
    return super.createSession(req, sess);
  }

  // express-session calls this to load a session by ID.
  get(sid, callback) {
    let row;
    try {
      row = db.prepare('SELECT data, user_id, student_id, csrf_token, expires_at FROM sessions WHERE id = ?').get(sid);
    } catch (err) {
      return callback(err);
    }
    if (!row) { return callback(null, null); }
    const expires = new Date(row.expires_at);
    const now = Date.now();
    if (expires.getTime() <= now) {
      try { db.prepare('DELETE FROM sessions WHERE id = ?').run(sid); } catch { /* ignore */ }
      return callback(null, null);
    }
    const sess = deserialize(row.data);
    if (!sess.cookie) {
      // Rebuild cookie metadata from the DB expiry so Store.createSession
      // (which reads sess.cookie.expires) does not throw.
      const expires = new Date(row.expires_at);
      sess.cookie = {
        expires,
        originalMaxAge: Math.max(0, expires.getTime() - Date.now()),
      };
    }
    // Restore the CSRF token from the sessions.csrf_token column — serialize()
    // intentionally drops it from the JSON blob, but clients hold the token
    // issued at login, so it must survive a restart unchanged.
    if (!sess.csrfToken && row.csrf_token) {
      sess.csrfToken = row.csrf_token;
    }
    // Same for the student identity (belt and braces with the JSON blob).
    if (!sess.student && row.student_id) {
      sess.student = { id: row.student_id };
    }
    return callback(null, sess);
  }

  set(sid, session, callback) {
    const data = serialize(session);
    const expiresAt = session.cookie && session.cookie.expires
      ? new Date(session.cookie.expires).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      db.prepare(`
        INSERT INTO sessions (id, user_id, student_id, csrf_token, ip, user_agent, expires_at, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          student_id = excluded.student_id,
          csrf_token = excluded.csrf_token,
          ip = excluded.ip,
          user_agent = excluded.user_agent,
          expires_at = excluded.expires_at,
          data = excluded.data
      `).run(
        sid,
        session.user?.id ?? null,
        session.student?.id ?? null,
        session.csrfToken ?? '',
        session.ip ?? '',
        session.ua ?? '',
        expiresAt,
        data,
      );
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sid);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  touch(sid, session, callback) {
    this.set(sid, session, callback);
  }

  length(callback) {
    try {
      const row = db.prepare('SELECT COUNT(*) AS n FROM sessions').get();
      return callback(null, row?.n ?? 0);
    } catch (err) {
      return callback(err);
    }
  }

  clear(callback) {
    try {
      db.prepare('DELETE FROM sessions').run();
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }
}
