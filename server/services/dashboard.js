// MedPobeda — admin dashboard real database counts.
import { db } from '../db/index.js';

export function getDashboard() {
  const count = (q, ...p) => db.prepare(q).get(...p)?.n ?? 0;

  const totalCurricula = count('SELECT COUNT(*) AS n FROM curricula');
  const totalSubjects = count('SELECT COUNT(*) AS n FROM subjects');
  const totalModules = count('SELECT COUNT(*) AS n FROM modules');
  const totalTopics = count('SELECT COUNT(*) AS n FROM topics');
  const draftQuestions = count("SELECT COUNT(*) AS n FROM questions WHERE status = 'draft'");
  const reviewQuestions = count("SELECT COUNT(*) AS n FROM questions WHERE status = 'review'");
  const publishedQuestions = count("SELECT COUNT(*) AS n FROM questions WHERE status = 'published'");
  const archivedQuestions = count("SELECT COUNT(*) AS n FROM questions WHERE status = 'archived'");

  const missingTranslationCount = count(`
    SELECT COUNT(*) AS n FROM questions q
    WHERE q.status IN ('draft', 'review', 'published')
      AND NOT EXISTS (
        SELECT 1 FROM question_translations qt
        WHERE qt.question_id = q.id AND qt.lang = 'uz' AND qt.question_text <> ''
      )
  `);

  const recentlyEdited = db.prepare(`
    SELECT q.id, q.difficulty, q.status, q.updated_at,
           u.display_name AS editor
    FROM questions q
    LEFT JOIN users u ON u.id = q.updated_by
    ORDER BY q.updated_at DESC
    LIMIT 8
  `).all();

  const publishedByLang = (lang) => count(`
    SELECT COUNT(*) AS n FROM questions q
    JOIN question_translations qt ON qt.question_id = q.id
    WHERE q.status = 'published' AND qt.lang = ? AND qt.question_text <> ''
  `, lang);

  const recentContent = db.prepare(`
    SELECT 'curriculum' AS type, id, updated_at FROM curricula
    UNION ALL SELECT 'subject', id, updated_at FROM subjects
    UNION ALL SELECT 'module', id, updated_at FROM modules
    UNION ALL SELECT 'topic', id, updated_at FROM topics
    UNION ALL SELECT 'question', id, updated_at FROM questions
    ORDER BY updated_at DESC
    LIMIT 6
  `).all();

  return {
    totalCurricula,
    totalSubjects,
    totalModules,
    totalTopics,
    draftQuestions,
    reviewQuestions,
    publishedQuestions,
    archivedQuestions,
    publishedUz: publishedByLang('uz'),
    publishedRu: publishedByLang('ru'),
    publishedEn: publishedByLang('en'),
    missingTranslationCount,
    recentlyEdited,
    recentContent,
    counts: {
      curricula: totalCurricula, subjects: totalSubjects, modules: totalModules, topics: totalTopics,
    },
  };
}