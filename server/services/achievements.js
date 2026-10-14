// MedPobeda — achievement evaluation and services.
import { db } from '../db/index.js';
import { getStudentStats, getStudyStreak } from './student-profile.js';

export function listAchievements({ status = 'active', lang = 'uz' } = {}) {
  const nameCol = lang === 'en' ? 'name_en' : lang === 'ru' ? 'name_ru' : 'name_uz';
  const descCol = lang === 'en' ? 'description_en' : lang === 'ru' ? 'description_ru' : 'description_uz';
  return db.prepare(
    `SELECT id, slug, ${nameCol} AS name, ${descCol} AS description, icon, metric, threshold, status FROM achievements WHERE status = ? ORDER BY threshold ASC`
  ).all(status);
}

export function listStudentAchievements(studentId, lang = 'uz') {
  const nameCol = lang === 'en' ? 'name_en' : lang === 'ru' ? 'name_ru' : 'name_uz';
  const descCol = lang === 'en' ? 'description_en' : lang === 'ru' ? 'description_ru' : 'description_uz';
  return db.prepare(`
    SELECT a.slug, a.${nameCol} AS name, a.${descCol} AS description, a.icon, a.metric, a.threshold, sa.earned_at
    FROM student_achievements sa
    JOIN achievements a ON a.id = sa.achievement_id
    WHERE sa.student_id = ?
    ORDER BY sa.earned_at DESC
  `).all(studentId);
}

// Evaluate and award achievements based on current stats. Returns newly earned slugs.
export function evaluateAchievements(studentId) {
  const stats = getStudentStats(studentId);
  const streak = getStudyStreak(studentId);
  const earned = listStudentAchievements(studentId).map(a => a.slug);
  const all = listAchievements();
  const newlyEarned = [];

  const metricValues = {
    questions_answered: stats.total_questions,
    streak_days: streak.current,
    accuracy: stats.accuracy,
  };

  const insert = db.prepare('INSERT OR IGNORE INTO student_achievements (student_id, achievement_id) VALUES (?, ?)');
  for (const a of all) {
    if (earned.includes(a.slug)) continue;
    const value = metricValues[a.metric] || 0;
    if (a.metric === 'accuracy' && stats.total_questions < 10) continue; // min sample for accuracy
    if (value >= a.threshold) {
      insert.run(studentId, a.id);
      newlyEarned.push(a.slug);
    }
  }
  return newlyEarned;
}

// Admin services
export function addAchievement(fields) {
  const info = db.prepare(
    'INSERT INTO achievements (slug, name_uz, name_ru, name_en, description_uz, description_ru, description_en, icon, metric, threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(fields.slug, fields.nameUz || '', fields.nameRu || '', fields.nameEn || '',
    fields.descUz || '', fields.descRu || '', fields.descEn || '',
    fields.icon || '', fields.metric || '', fields.threshold || 0);
  return db.prepare('SELECT * FROM achievements WHERE id = ?').get(info.lastInsertRowid);
}

export function updateAchievement(id, fields) {
  db.prepare(
    `UPDATE achievements SET name_uz = COALESCE(?, name_uz), name_ru = COALESCE(?, name_ru), name_en = COALESCE(?, name_en),
     description_uz = COALESCE(?, description_uz), description_ru = COALESCE(?, description_ru), description_en = COALESCE(?, description_en),
     icon = COALESCE(?, icon), metric = COALESCE(?, metric), threshold = COALESCE(?, threshold), status = COALESCE(?, status) WHERE id = ?`
  ).run(fields.nameUz || null, fields.nameRu || null, fields.nameEn || null,
    fields.descUz || null, fields.descRu || null, fields.descEn || null,
    fields.icon || null, fields.metric || null, fields.threshold ?? null, fields.status || null, id);
  return db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
}
