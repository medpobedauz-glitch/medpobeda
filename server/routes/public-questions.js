// MedPobeda — public topic questions route (published-only, language-aware).
import { questionContentRevision } from '../services/question-answers.js';
import { Router } from 'express';
import { db } from '../db/index.js';
import { renderExplanationBlocks } from '../services/explanations.js';
import { publicChain, curriculumPublic, subjectPublic, modulePublic, topicPublic } from './public-common.js';

const router = Router();
router.get('/media/:id', (req, res) => {
  const m = db.prepare("SELECT storage_path, mime_type FROM media WHERE id=? AND status='active'").get(Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Image not found.' });
  res.type(m.mime_type).sendFile(m.storage_path);
});

// GET /api/public/learn/.../:topic/questions
router.get('/learn/:curriculum/:subject/:module/:topic/questions', (req, res) => {
  const lang = String(req.query.lang || 'uz');
  const chain = publicChain({
    curriculumSlug: req.params.curriculum, subjectSlug: req.params.subject,
    moduleSlug: req.params.module, topicSlug: req.params.topic,
  });
  if (!chain) return res.status(404).json({ error: 'Not found.' });

  const questions = db.prepare(`
    SELECT q.question_id, q.reference, q.explanation_image_media_id, q.id, q.difficulty, q.display_order, q.question_image_media_id,
           qt.question_text, qt.explanation_blocks, qt.question_image_alt,
           m.mime_type
    FROM questions q
    JOIN question_translations qt ON qt.question_id = q.id AND qt.lang = ?
    LEFT JOIN media m ON m.id = q.question_image_media_id
    WHERE q.topic_id = ? AND q.status = 'published' AND qt.question_text <> ''
    ORDER BY q.display_order ASC, q.id ASC
  `).all(lang, chain.topic.id);

  const result = questions.map((q) => {
    const opts = db.prepare(`
      SELECT o.option_key, o.display_order, o.is_correct, ot.text AS option_text
      FROM question_options o
      JOIN question_option_translations ot ON ot.option_id = o.id AND ot.lang = ?
      WHERE o.question_id = ?
      ORDER BY o.display_order ASC
    `).all(lang, q.id);
    let blocks = [];
    try { blocks = JSON.parse(q.explanation_blocks || '[]'); } catch { blocks = []; }
    return {
      id: q.id,
      question_id: q.question_id,
      content_revision: questionContentRevision(q.id),
      reference: q.reference || '',
      explanation_image: q.explanation_image_media_id ? { mediaId: q.explanation_image_media_id } : null,
      bookmarked: Boolean(req.student && db.prepare('SELECT 1 FROM student_question_bookmarks WHERE student_id=? AND question_id=?').get(req.student.id, q.id)),
      question_images: db.prepare("SELECT media_id AS mediaId FROM question_media_links WHERE question_id=? AND role='question' ORDER BY display_order").all(q.id),
      question_type: db.prepare('SELECT question_type FROM question_cms WHERE question_id=?').get(q.id)?.question_type || 'single_best',
      difficulty: q.difficulty,
      question_text: q.question_text,
      question_image: q.question_image_media_id
        ? { mediaId: q.question_image_media_id, alt: q.question_image_alt, mime: q.mime_type }
        : null,
      options: opts.map((o) => ({
        key: o.option_key,
        text: o.option_text,
        is_correct: Boolean(o.is_correct),
      })),
      explanation_blocks: blocks,
      explanation_html: renderExplanationBlocks(blocks),
    };
  });

  return res.json({
    curriculum: curriculumPublic(chain.curriculum, lang),
    subject: subjectPublic(chain.subject, lang),
    module: modulePublic(chain.module, lang),
    topic: topicPublic(chain.topic, lang),
    lang,
    count: result.length,
    questions: result,
    // Session progress stays in the student's memory; nothing is permanently saved yet.
    session_only: true,
  });
});

export default router;