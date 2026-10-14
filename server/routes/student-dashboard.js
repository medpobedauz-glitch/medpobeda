// MedPobeda — student dashboard API routes.
import { Router } from 'express';
import * as dashboard from '../services/student-dashboard.js';
import * as achievements from '../services/achievements.js';
import * as profile from '../services/student-profile.js';
import { evaluateAchievements } from '../services/achievements.js';

const router = Router();

// Require student auth
router.use((req, res, next) => {
  if (!req.student) return res.status(401).json({ error: 'Please sign in.' });
  next();
});

function langOf(req) {
  return ['uz', 'ru', 'en'].includes(req.query.lang) ? req.query.lang : (req.student?.preferred_lang || 'uz');
}

// GET /api/student/dashboard
router.get('/dashboard', (req, res) => {
  const lang = langOf(req);
  const data = dashboard.getDashboard(req.student.id, lang);
  // Award any newly-earned achievements
  const newAchievements = evaluateAchievements(req.student.id);
  data.new_achievements = newAchievements;
  res.json(data);
});

// GET /api/student/progress
router.get('/progress', (req, res) => {
  res.json({
    subject_progress: dashboard.getSubjectProgress(req.student.id),
    topic_progress: dashboard.getTopicProgress(req.student.id),
  });
});

// GET /api/student/activity
router.get('/activity', (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  res.json({ activity: dashboard.getRecentActivity(req.student.id, days) });
});

// GET /api/student/bookmarks (re-export for convenience)
router.get('/bookmarks', (req, res) => {
  const lang = langOf(req);
  const { db } = require('../db/index.js');
  const visible = `SELECT q.id, q.question_id, c.slug AS curriculum, s.slug AS subject,
    m.slug AS module, t.slug AS topic FROM questions q
    JOIN topics t ON t.id=q.topic_id JOIN modules m ON m.id=t.module_id
    JOIN subjects s ON s.id=m.subject_id JOIN curriculum_subjects cs ON cs.subject_id=s.id
    JOIN curricula c ON c.id=cs.curriculum_id
    WHERE q.status='published' AND t.status='published' AND m.status='published'
    AND s.status='published' AND c.status='published'`;
  const rows = db.prepare(`SELECT v.*, qt.question_text, b.created_at FROM (${visible}) v
    JOIN student_question_bookmarks b ON b.question_id=v.id AND b.student_id=?
    JOIN question_translations qt ON qt.question_id=v.id AND qt.lang=? AND qt.question_text<>''
    GROUP BY v.id ORDER BY b.created_at DESC, v.id DESC`).all(req.student.id, lang);
  res.json({ bookmarks: rows });
});

// GET /api/student/mistakes
router.get('/mistakes', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  res.json({ mistakes: dashboard.getMistakes(req.student.id, limit) });
});

// GET /api/student/achievements
router.get('/achievements', (req, res) => {
  const lang = langOf(req);
  res.json({
    earned: achievements.listStudentAchievements(req.student.id, lang),
    all: achievements.listAchievements({ lang }),
  });
});

export default router;
