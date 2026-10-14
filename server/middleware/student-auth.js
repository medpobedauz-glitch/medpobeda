// MedPobeda — student (public user) auth helpers.
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';

const BCRYPT_ROUNDS = 12;

export function hashStudentPassword(plain) {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function verifyStudentPassword(plain, hash) {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function getStudentById(id) {
  return db.prepare(
    'SELECT id, full_name, contact, contact_type, preferred_lang, curriculum_id, status, created_at FROM students WHERE id = ?'
  ).get(id) || null;
}

export function getStudentByContact(contact) {
  return db.prepare('SELECT * FROM students WHERE contact = ?').get(contact) || null;
}

// Resolves req.student from the session; blocks suspended students mid-session.
export function attachStudent(req, res, next) {
  if (req.session && req.session.student && req.session.student.id) {
    const fresh = getStudentById(req.session.student.id);
    if (fresh && fresh.status === 'active') {
      req.student = fresh;
    } else {
      req.session.student = null;
    }
  }
  next();
}