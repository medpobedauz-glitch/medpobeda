// MedPobeda — university and program lookup services.
import { db } from '../db/index.js';

export function listCountries({ status = 'active' } = {}) {
  return db.prepare(
    'SELECT id, name, code, status, display_order FROM countries WHERE status = ? ORDER BY display_order ASC, name ASC'
  ).all(status);
}

export function listUniversities({ countryId = null, status = 'active' } = {}) {
  let sql = 'SELECT u.id, u.name, u.city, u.status, u.country_id, c.name AS country_name, c.code AS country_code FROM universities u JOIN countries c ON c.id = u.country_id WHERE u.status = ?';
  const params = [status];
  if (countryId) { sql += ' AND u.country_id = ?'; params.push(countryId); }
  sql += ' ORDER BY c.display_order ASC, u.name ASC';
  return db.prepare(sql).all(...params);
}

export function getUniversity(id) {
  return db.prepare(
    'SELECT u.id, u.name, u.city, u.status, u.country_id, c.name AS country_name FROM universities u JOIN countries c ON c.id = u.country_id WHERE u.id = ?'
  ).get(id) || null;
}

export function listPrograms({ status = 'active', lang = 'uz' } = {}) {
  const col = lang === 'en' ? 'name_en' : lang === 'ru' ? 'name_ru' : 'name_uz';
  return db.prepare(
    `SELECT id, slug, ${col} AS name, status, display_order FROM programs WHERE status = ? ORDER BY display_order ASC, id ASC`
  ).all(status);
}

export function getProgram(id) {
  return db.prepare(
    'SELECT id, slug, name_uz, name_ru, name_en, status, display_order FROM programs WHERE id = ?'
  ).get(id) || null;
}

// Admin: add university
export function addUniversity({ countryId, name, city }) {
  const info = db.prepare(
    'INSERT INTO universities (country_id, name, city) VALUES (?, ?, ?)'
  ).run(countryId, name.trim(), city?.trim() || '');
  return getUniversity(info.lastInsertRowid);
}

// Admin: edit university
export function updateUniversity(id, { name, city, status }) {
  db.prepare(
    'UPDATE universities SET name = COALESCE(?, name), city = COALESCE(?, city), status = COALESCE(?, status), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name?.trim() || null, city?.trim() || null, status || null, id);
  return getUniversity(id);
}

// Admin: add program
export function addProgram({ slug, nameUz, nameRu, nameEn }) {
  const info = db.prepare(
    'INSERT INTO programs (slug, name_uz, name_ru, name_en) VALUES (?, ?, ?, ?)'
  ).run(slug, nameUz?.trim() || '', nameRu?.trim() || '', nameEn?.trim() || '');
  return getProgram(info.lastInsertRowid);
}

// Admin: edit program
export function updateProgram(id, { nameUz, nameRu, nameEn, status }) {
  db.prepare(
    'UPDATE programs SET name_uz = COALESCE(?, name_uz), name_ru = COALESCE(?, name_ru), name_en = COALESCE(?, name_en), status = COALESCE(?, status), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(nameUz?.trim() || null, nameRu?.trim() || null, nameEn?.trim() || null, status || null, id);
  return getProgram(id);
}
