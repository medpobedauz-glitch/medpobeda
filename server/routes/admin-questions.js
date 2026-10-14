// MedPobeda — admin question routes (MCQ editor).
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit } from '../middleware/auth.js';
import * as content from '../services/content.js';
import * as hier from '../services/hierarchy.js';
import * as qRead from '../services/questions.js';
import { createQuestion, updateQuestion, duplicateQuestion } from '../services/question-write.js';
import { changeQuestionStatus } from '../services/question-status.js';
import {saveQuestion as saveCentralQuestion, fullQuestion as centralQuestion} from '../services/central-qbank.js';
import { translateTexts } from '../services/translate.js';
import { translateTextBatch } from '../services/qbank-ai.js';

const router = Router();
function validateExtras(req, res, next) {
  for (const field of ['question_image_media_id', 'explanation_image_media_id']) {
    const id = req.body?.[field];
    if (id != null && (!Number.isInteger(id) || !db.prepare("SELECT id FROM media WHERE id = ? AND status = 'active'").get(id))) {
      return res.status(400).json({ error: 'Choose a valid uploaded image.' });
    }
  }
  if (req.body?.reference != null && (typeof req.body.reference !== 'string' || req.body.reference.length > 2000)) return res.status(400).json({ error: 'Reference must be at most 2,000 characters.' });
  next();
}
function saveAuthored(req,id=null){
 const body=req.body,topic=db.prepare('SELECT t.id,t.module_id,m.subject_id FROM topics t JOIN modules m ON m.id=t.module_id WHERE t.id=?').get(Number(body.topic_id));
 if(!topic){const e=new Error('Choose a valid topic.');e.cmsSafe=true;throw e;}
 return saveCentralQuestion({version:body.cms.version,subject_id:topic.subject_id,topic_id:topic.module_id,subtopic_id:topic.id,
  question_type:body.cms.question_type,status:body.cms.status,source_id:body.cms.source_id,tags:body.cms.tags,
  difficulty:body.difficulty,source_reference:body.reference,editor_translations:body.translations,
  options:body.options,correct_answer:(body.options||[]).filter(o=>o.is_correct).map(o=>o.option_key).join(','),
  question_image_media_id:body.question_image_media_id,explanation_image_media_id:body.explanation_image_media_id},req.user,id);
}
const bad = (res, msg, details) => res.status(400).json({ error: msg, details: details || undefined });

// POST /translate — auto-translation for question authoring.
router.post('/translate', requireRole('write'), csrfProtection, async (req, res) => {
  const source = String(req.body?.source || '');
  const target = String(req.body?.target || '');
  if (!['uz', 'ru', 'en'].includes(source) || !['uz', 'ru', 'en'].includes(target) || source === target) {
    return bad(res, 'Invalid language pair.');
  }
  const translations = await (process.env.QUESTION_TRANSLATION_PROVIDER==='ollama'?translateTextBatch:translateTexts)(req.body?.texts, source, target);
  if (translations.every((t) => t === null)) {
    return res.status(502).json({ error: 'Translation service is unavailable right now. Please fill the other languages manually.' });
  }
  return res.json({ translations });
});

// List with filters: curriculum / subject / module / topic / difficulty / status
router.get('/questions', requireRole('read'), (req, res) => {
  const groupBy = req.query.group_by || null; // topic | module | subject | curriculum
  const groupId = req.query.group_id ? Number(req.query.group_id) : null;
  const difficulty = req.query.difficulty || null;
  const status = req.query.status || null;

  const rows = qRead.listQuestions({ groupBy, groupId, difficulty, status, questionId: req.query.question_id }).map((q) => {
    const completeness = qRead.getQuestionCompleteness(q);
    return {
      ...q,
      completeness,
      cms:db.prepare('SELECT version,workflow_status FROM question_cms WHERE question_id=?').get(q.id),
      editor: db.prepare('SELECT display_name FROM users WHERE id = ?').get(q.updated_by)?.display_name || '',
      optionCount: db.prepare('SELECT COUNT(*) AS n FROM question_options WHERE question_id = ?').get(q.id)?.n || 0,
      hasQuestionImage: Boolean(q.question_image_media_id),
    };
  });
  return res.json(rows);
});

// Hierarchy breadcrumb context for the editor + dropdown filters.
router.get('/questions/context', requireRole('read'), (req, res) => {
  const curricula = content.listCurricula({}).map((c) => ({ id: c.id, slug: c.slug, name: c.translations?.uz?.name || c.slug }));
  const subjects = content.listSubjects({}).map((s) => ({ id: s.id, slug: s.slug, name: s.translations?.uz?.name || s.slug }));
  const modules = content.listModules({}).map((m) => ({ id: m.id, slug: m.slug, name: m.translations?.uz?.name || m.slug, subject_id: m.subject_id }));
  const topics = content.listTopics({}).map((t) => ({ id: t.id, slug: t.slug, name: t.translations?.uz?.name || t.slug, module_id: t.module_id }));
  return res.json({ curricula, subjects, modules, topics });
});

// Full single question (for editor).
router.get('/questions/:id', requireRole('read'), (req, res) => {
  const q = qRead.getQuestionFull(Number(req.params.id));
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  const tree = {
    topic: content.getById('topic', q.topic_id),
    module: content.getById('module', content.getById('topic', q.topic_id)?.module_id),
    subject: content.getById('subject', content.getById('module', content.getById('topic', q.topic_id)?.module_id)?.subject_id),
  };
  const cms=centralQuestion(q.id);
  return res.json({ ...q, cms:{version:cms.version,status:cms.status,question_type:cms.question_type,source_id:cms.source_id,tags:cms.tags,sources:cms.sources}, tree, completeness: qRead.getQuestionCompleteness(q) });
});

// Create
router.post('/questions', requireRole('write'), csrfProtection, validateExtras, (req, res) => {
  const topicId = Number(req.body?.topic_id);
  if (!Number.isInteger(topicId) || !content.getById('topic', topicId)) return bad(res, 'A valid topic is required.');
  const id = req.body.cms ? saveAuthored(req).id : createQuestion({ topicId, payload: req.body, user: req.user });
  audit(req.user.id, 'create', 'question', id, 'Question #' + id, { topicId }, req.ip);
  return res.status(201).json({ id, question_id: qRead.getQuestion(id).question_id });
});

// Update (save draft / submit review / publish etc.)
router.put('/questions/:id', requireRole('write'), csrfProtection, validateExtras, (req, res) => {
  const id = Number(req.params.id);
  const q = req.body.cms ? saveAuthored(req,id) : updateQuestion({ questionId: id, payload: req.body, user: req.user });
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  audit(req.user.id, 'update', 'question', id, 'Question #' + id, { status: q.status }, req.ip);
  return res.json({ ok: true, id, question_id: q.question_id });
});

// Workflow transitions.
router.post('/questions/:id/:action', (req, res, next) => req.params.action === 'duplicate' ? next('route') : next(), requireRole('publish', 'submit_review'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const action = req.params.action;
  if (!['publish', 'unpublish', 'submit_review', 'archive', 'draft'].includes(action)) {
    return bad(res, 'Unknown action.');
  }
  const result = changeQuestionStatus({ questionId: id, action, payload: req.body, user: req.user });
  if (!result.ok) return res.status(400).json({ error: result.error, errors: result.errors || undefined });
  if (action === 'archive') audit(req.user.id, 'archive', 'question', id, 'Question #' + id, {}, req.ip);
  else audit(req.user.id, action, 'question', id, 'Question #' + id, { status: result.status }, req.ip);
  return res.json({ ok: true, status: result.status });
});

// Duplicate
router.post('/questions/:id/duplicate', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const newId = duplicateQuestion({ questionId: id, user: req.user });
  if (!newId) return res.status(404).json({ error: 'Question not found.' });
  audit(req.user.id, 'duplicate', 'question', newId, 'Duplicated from #' + id, { fromId: id }, req.ip);
  return res.status(201).json({ id: newId });
});

router.use((err,req,res,next)=>err.cmsSafe?res.status(err.status||400).json({error:err.message}):next(err));
export default router;