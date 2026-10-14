// MedPobeda — public read-only API (student-facing learning flow).
// Only published content is exposed. Draft/review/archived stays hidden.
import { Router } from 'express';
import { db } from '../db/index.js';
import * as content from '../services/content.js';
import * as hier from '../services/hierarchy.js';

export const router = Router();

// Verify the whole published chain for a learn URL.
export function publicChain({ curriculumSlug, subjectSlug, moduleSlug, topicSlug }) {
  const curriculum = content.getBySlug('curriculum', curriculumSlug);
  if (!curriculum || curriculum.status !== 'published') return null;
  if (subjectSlug) {
    const subject = content.getBySlug('subject', subjectSlug);
    if (!subject || subject.status !== 'published') return null;
    const link = db.prepare('SELECT * FROM curriculum_subjects WHERE curriculum_id = ? AND subject_id = ?')
      .get(curriculum.id, subject.id);
    if (!link) return null;
    if (moduleSlug) {
      const module = content.getBySlug('module', moduleSlug);
      if (!module || module.status !== 'published' || module.subject_id !== subject.id) return null;
      if (topicSlug) {
        const topic = content.getBySlug('topic', topicSlug);
        if (!topic || topic.status !== 'published' || topic.module_id !== module.id) return null;
        return { curriculum, subject, module, topic };
      }
      return { curriculum, subject, module };
    }
    return { curriculum, subject };
  }
  return { curriculum };
}

function tr(kind, id, lang) {
  const t = content.getTranslations(kind, id);
  return t[lang] || null;
}

export function curriculumPublic(curriculum, lang) {
  const t = tr('curriculum', curriculum.id, lang);
  return {
    id: curriculum.id, slug: curriculum.slug, status: curriculum.status,
    name: t?.name, short_desc: t?.short_desc, long_desc: t?.long_desc,
  };
}

export function subjectPublic(subject, lang) {
  const t = tr('subject', subject.id, lang);
  return {
    id: subject.id, slug: subject.slug, status: subject.status,
    name: t?.name, short_desc: t?.short_desc, long_desc: t?.long_desc,
  };
}

export function modulePublic(module, lang) {
  const t = tr('module', module.id, lang);
  return { id: module.id, slug: module.slug, status: module.status, name: t?.name, description: t?.description };
}

export function topicPublic(topic, lang) {
  const t = tr('topic', topic.id, lang);
  return { id: topic.id, slug: topic.slug, status: topic.status, name: t?.name, description: t?.description };
}