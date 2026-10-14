// MedPobeda — student dashboard data services.
import { db } from '../db/index.js';
import { getStudentStats, getStudyStreak } from './student-profile.js';

// Progress by subject: accuracy per subject slug
export function getSubjectProgress(studentId) {
  return db.prepare(`
    SELECT s.slug AS subject_slug, s.display_order,
           COUNT(*) AS attempted,
           SUM(a.is_correct) AS correct,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*), 1) AS accuracy
    FROM student_question_answers a
    JOIN questions q ON q.id = a.question_id
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.student_id = ?
    GROUP BY s.id
    ORDER BY s.display_order ASC
  `).all(studentId);
}

// Progress by topic within subjects
export function getTopicProgress(studentId) {
  return db.prepare(`
    SELECT s.slug AS subject_slug, t.slug AS topic_slug, t.display_order,
           COUNT(*) AS attempted,
           SUM(a.is_correct) AS correct,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*), 1) AS accuracy
    FROM student_question_answers a
    JOIN questions q ON q.id = a.question_id
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.student_id = ?
    GROUP BY t.id
    ORDER BY s.display_order ASC, t.display_order ASC
  `).all(studentId);
}

// Recent activity grouped by day
export function getRecentActivity(studentId, days = 14) {
  return db.prepare(`
    SELECT DATE(a.created_at) AS day,
           COUNT(*) AS questions_answered,
           SUM(a.is_correct) AS correct,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*), 1) AS accuracy
    FROM student_question_answers a
    WHERE a.student_id = ? AND a.created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(a.created_at)
    ORDER BY day DESC
  `).all(studentId, days);
}

// Continue learning: most recent topic attempted
export function getContinueLearning(studentId) {
  const row = db.prepare(`
    SELECT s.slug AS subject_slug, s.display_order AS s_order,
           t.slug AS topic_slug, t.display_order AS t_order,
           m.slug AS module_slug,
           a.created_at
    FROM student_question_answers a
    JOIN questions q ON q.id = a.question_id
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.student_id = ?
    ORDER BY a.created_at DESC
    LIMIT 1
  `).get(studentId);
  return row || null;
}

// Weak areas: topics with accuracy below threshold (min 3 attempts)
export function getWeakAreas(studentId, threshold = 50, minAttempts = 3) {
  return db.prepare(`
    SELECT s.slug AS subject_slug, t.slug AS topic_slug,
           COUNT(*) AS attempted,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*), 1) AS accuracy
    FROM student_question_answers a
    JOIN questions q ON q.id = a.question_id
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.student_id = ?
    GROUP BY t.id
    HAVING COUNT(*) >= ? AND (100.0 * SUM(a.is_correct) / COUNT(*)) < ?
    ORDER BY accuracy ASC
    LIMIT 10
  `).all(studentId, minAttempts, threshold);
}

// Mistakes: questions answered incorrectly (first wrong attempt)
export function getMistakes(studentId, limit = 20) {
  return db.prepare(`
    SELECT q.question_id, qt.question_text, a.created_at,
           s.slug AS subject_slug, t.slug AS topic_slug, m.slug AS module_slug
    FROM student_question_answers a
    JOIN questions q ON q.id = a.question_id
    JOIN question_translations qt ON qt.question_id = q.id AND qt.lang = 'uz' AND qt.question_text <> ''
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    JOIN subjects s ON s.id = m.subject_id
    WHERE a.student_id = ? AND a.is_correct = 0
    ORDER BY a.created_at DESC
    LIMIT ?
  `).all(studentId, limit);
}

// Performance over time: questions answered per day for charting
export function getPerformanceSeries(studentId, days = 30) {
  return db.prepare(`
    SELECT DATE(a.created_at) AS day,
           COUNT(*) AS questions_answered,
           SUM(a.is_correct) AS correct,
           ROUND(100.0 * SUM(a.is_correct) / COUNT(*), 1) AS accuracy
    FROM student_question_answers a
    WHERE a.student_id = ? AND a.created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(a.created_at)
    ORDER BY day ASC
  `).all(studentId, days);
}

// Bookmarks count
export function getBookmarkCount(studentId) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM student_question_bookmarks WHERE student_id = ?').get(studentId);
  return row?.n ?? 0;
}

// Assemble full dashboard payload
export function getDashboard(studentId, lang = 'uz') {
  const stats = getStudentStats(studentId);
  const streak = getStudyStreak(studentId);
  return {
    stats,
    streak,
    subject_progress: getSubjectProgress(studentId),
    topic_progress: getTopicProgress(studentId),
    recent_activity: getRecentActivity(studentId),
    continue_learning: getContinueLearning(studentId),
    weak_areas: getWeakAreas(studentId),
    bookmark_count: getBookmarkCount(studentId),
  };
}
