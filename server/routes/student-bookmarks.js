import { Router } from 'express';
import { db } from '../db/index.js';
import { csrfProtection } from '../middleware/csrf.js';
const router = Router();
// The same published hierarchy rules as the learning API.
const visible = `SELECT q.id, q.question_id, c.slug AS curriculum, s.slug AS subject,
 m.slug AS module, t.slug AS topic FROM questions q
 JOIN topics t ON t.id=q.topic_id JOIN modules m ON m.id=t.module_id
 JOIN subjects s ON s.id=m.subject_id JOIN curriculum_subjects cs ON cs.subject_id=s.id
 JOIN curricula c ON c.id=cs.curriculum_id
 WHERE q.status='published' AND t.status='published' AND m.status='published'
 AND s.status='published' AND c.status='published'`;
router.use('/bookmarks', (req, res, next) => {
  if (!req.student) return res.status(401).json({ error: 'Please sign in to use bookmarks.' });
  next();
});
router.get('/bookmarks', (req, res) => {
  const lang = ['uz','ru','en'].includes(req.query.lang) ? req.query.lang : 'uz';
  const rows = db.prepare(`SELECT v.*, qt.question_text, b.created_at FROM (${visible}) v
    JOIN student_question_bookmarks b ON b.question_id=v.id AND b.student_id=?
    JOIN question_translations qt ON qt.question_id=v.id AND qt.lang=? AND qt.question_text<>''
    GROUP BY v.id ORDER BY b.created_at DESC, v.id DESC`).all(req.student.id, lang);
  res.json({ bookmarks: rows });
});
router.put('/bookmarks/:id', csrfProtection, (req, res) => {
  const q = db.prepare(visible + ' AND q.question_id=? COLLATE NOCASE LIMIT 1').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  db.prepare('INSERT OR IGNORE INTO student_question_bookmarks (student_id, question_id) VALUES (?, ?)').run(req.student.id, q.id);
  res.json({ bookmarked: true });
});
router.delete('/bookmarks/:id', csrfProtection, (req, res) => {
  db.prepare(`DELETE FROM student_question_bookmarks WHERE student_id=? AND question_id IN
    (SELECT id FROM questions WHERE question_id=? COLLATE NOCASE)`).run(req.student.id, req.params.id);
  res.json({ bookmarked: false });
});
export default router;
