// MedPobeda — student profile services.
import { db } from '../db/index.js';
import * as universities from './universities.js';

export function getStudentProfile(studentId) {
  const s = db.prepare(`
    SELECT s.id, s.full_name, s.first_name, s.last_name, s.contact, s.contact_type,
           s.phone, s.preferred_lang, s.curriculum_id, s.status, s.created_at, s.updated_at,
           s.university_id, s.study_year, s.program_id, s.photo_media_id,
           u.name AS university_name, u.city AS university_city,
           p.slug AS program_slug, p.name_uz AS program_name_uz, p.name_ru AS program_name_ru, p.name_en AS program_name_en
    FROM students s
    LEFT JOIN universities u ON u.id = s.university_id
    LEFT JOIN programs p ON p.id = s.program_id
    WHERE s.id = ?
  `).get(studentId);
  return s || null;
}

export function getProgramName(program, lang = 'uz') {
  if (!program) return null;
  if (lang === 'en') return program.program_name_en || program.program_name_uz;
  if (lang === 'ru') return program.program_name_ru || program.program_name_uz;
  return program.program_name_uz;
}

export function updateStudentProfile(studentId, fields) {
  const allowed = ['first_name', 'last_name', 'phone', 'university_id', 'study_year', 'program_id', 'preferred_lang'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }
  if (!sets.length) return getStudentProfile(studentId);
  sets.push("updated_at = datetime('now')");
  params.push(studentId);
  db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  // Sync full_name from first + last
  if (fields.first_name !== undefined || fields.last_name !== undefined) {
    const s = getStudentProfile(studentId);
    const fn = (fields.first_name ?? s.first_name) || '';
    const ln = (fields.last_name ?? s.last_name) || '';
    const fullName = (fn + ' ' + ln).trim() || s.contact;
    db.prepare("UPDATE students SET full_name = ? WHERE id = ?").run(fullName, studentId);
  }
  return getStudentProfile(studentId);
}

export function setProfilePhoto(studentId, mediaId) {
  db.prepare("UPDATE students SET photo_media_id = ?, updated_at = datetime('now') WHERE id = ?").run(mediaId, studentId);
  return getStudentProfile(studentId);
}

export function removeProfilePhoto(studentId) {
  db.prepare("UPDATE students SET photo_media_id = NULL, updated_at = datetime('now') WHERE id = ?").run(studentId);
  return getStudentProfile(studentId);
}

// Derived statistics from student_question_answers
export function getStudentStats(studentId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS total_attempts,
           SUM(is_correct) AS correct_count,
           COUNT(DISTINCT DATE(created_at)) AS active_days
    FROM student_question_answers
    WHERE student_id = ?
  `).get(studentId) || { total_attempts: 0, correct_count: 0, active_days: 0 };
  
  const total = row.total_attempts || 0;
  const correct = row.correct_count || 0;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    total_questions: total,
    correct,
    incorrect,
    accuracy,
    active_days: row.active_days || 0,
  };
}

// Study streak — consecutive days with ≥1 answer ending today or yesterday
export function getStudyStreak(studentId) {
  const rows = db.prepare(`
    SELECT DISTINCT DATE(created_at) AS day
    FROM student_question_answers
    WHERE student_id = ?
    ORDER BY day DESC
  `).all(studentId).map(r => r.day);

  if (!rows.length) return { current: 0, longest: 0 };

  const days = new Set(rows);
  
  // Current streak
  let current = 0;
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  // Allow streak to start yesterday if no activity today yet
  const today = d.toISOString().slice(0, 10);
  if (!days.has(today)) {
    d.setDate(d.getDate() - 1);
  }
  while (days.has(d.toISOString().slice(0, 10))) {
    current++;
    d.setDate(d.getDate() - 1);
  }

  // Longest streak
  let longest = 0;
  let run = 0;
  let prev = null;
  const sorted = [...days].sort();
  for (const day of sorted) {
    if (prev) {
      const diff = (new Date(day) - new Date(prev)) / (1000 * 60 * 60 * 24);
      if (diff === 1) { run++; } else { run = 1; }
    } else { run = 1; }
    if (run > longest) longest = run;
    prev = day;
  }

  return { current, longest };
}
