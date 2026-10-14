// MedPobeda — public learn routes (curriculum -> subject -> module -> topic).
import { Router } from 'express';
import * as content from '../services/content.js';
import * as hier from '../services/hierarchy.js';
import { publicChain, curriculumPublic, subjectPublic, modulePublic, topicPublic } from './public-common.js';

const router = Router();

function langOf(req) {
  return String(req.query.lang || 'uz');
}

// GET /api/public/learn — published curricula list (used by the register form).
router.get('/learn', (req, res) => {
  const lang = langOf(req);
  const rows = content.listCurricula({ status: 'published' }).map((c) => {
    const t = (c.translations || {})[lang] || (c.translations || {}).uz || {};
    return { id: c.id, slug: c.slug, name: t.name || c.slug };
  }).filter((c) => c.name);
  return res.json({ curricula: rows });
});

// GET /api/public/learn/[curriculum]
router.get('/learn/:curriculum', (req, res) => {
  const lang = langOf(req);
  const chain = publicChain({ curriculumSlug: req.params.curriculum });
  if (!chain) return res.status(404).json({ error: 'Not found.' });

  const subjects = hier.getCurriculumSubjects(chain.curriculum.id)
    .filter((s) => s.status === 'published')
    .map((s) => {
      const full = content.getById('subject', s.id);
      return {
        ...subjectPublic(full, lang),
        display_order: s.display_order,
        questionCount: hier.countPublishedQuestionsForSubject(s.id),
      };
    })
    .filter((s) => s.name);

  return res.json({
    curriculum: curriculumPublic(chain.curriculum, lang),
    subjects,
    questionCount: hier.countPublishedQuestionsForCurriculum(chain.curriculum.id),
  });
});

// GET /api/public/learn/[curriculum]/[subject]
router.get('/learn/:curriculum/:subject', (req, res) => {
  const lang = langOf(req);
  const chain = publicChain({ curriculumSlug: req.params.curriculum, subjectSlug: req.params.subject });
  if (!chain) return res.status(404).json({ error: 'Not found.' });

  const modules = content.listModules({ subjectId: chain.subject.id, status: 'published' })
    .map((m) => ({
      ...modulePublic(m, lang),
      questionCount: hier.countPublishedQuestionsForModule(m.id),
      topicCount: hier.countChild('topic', m.id),
    }))
    .filter((m) => m.name);

  return res.json({
    curriculum: curriculumPublic(chain.curriculum, lang),
    subject: subjectPublic(chain.subject, lang),
    modules,
    questionCount: hier.countPublishedQuestionsForSubject(chain.subject.id),
  });
});

// GET /api/public/learn/[curriculum]/[subject]/[module]
router.get('/learn/:curriculum/:subject/:module', (req, res) => {
  const lang = langOf(req);
  const chain = publicChain({
    curriculumSlug: req.params.curriculum, subjectSlug: req.params.subject, moduleSlug: req.params.module,
  });
  if (!chain) return res.status(404).json({ error: 'Not found.' });

  const topics = content.listTopics({ moduleId: chain.module.id, status: 'published' })
    .map((t) => ({
      ...topicPublic(t, lang),
      questionCount: hier.countPublishedQuestionsForTopic(t.id, lang),
    }))
    .filter((t) => t.name);

  return res.json({
    curriculum: curriculumPublic(chain.curriculum, lang),
    subject: subjectPublic(chain.subject, lang),
    module: modulePublic(chain.module, lang),
    topics,
    questionCount: hier.countPublishedQuestionsForModule(chain.module.id),
  });
});

// GET /api/public/learn/[curriculum]/[subject]/[module]/[topic]
router.get('/learn/:curriculum/:subject/:module/:topic', (req, res) => {
  const lang = langOf(req);
  const chain = publicChain({
    curriculumSlug: req.params.curriculum, subjectSlug: req.params.subject,
    moduleSlug: req.params.module, topicSlug: req.params.topic,
  });
  if (!chain) return res.status(404).json({ error: 'Not found.' });

  return res.json({
    curriculum: curriculumPublic(chain.curriculum, lang),
    subject: subjectPublic(chain.subject, lang),
    module: modulePublic(chain.module, lang),
    topic: {
      ...topicPublic(chain.topic, lang),
      questionCount: hier.countPublishedQuestionsForTopic(chain.topic.id, lang),
    },
  });
});

export default router;