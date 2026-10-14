// MedPobeda — seed script for testing the API.
// Creates a super_admin user + test content (curriculum → subject → module → topic → question).
import { config } from '../server/config.js';
import { db } from '../server/db/index.js';
import { hashPassword } from '../server/middleware/auth.js';
import { createQuestion } from '../server/services/question-write.js';

const ADMIN_EMAIL = 'admin@medpobeda.local';
const ADMIN_PASSWORD = 'TestPass123';

const tx = db.transaction(() => {
  // --- Admin user ---
  db.prepare('DELETE FROM users WHERE email = ?').run(ADMIN_EMAIL);
  const userId = db.prepare(
    'INSERT INTO users (email, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, ?)'
  ).run(ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), 'Test Admin', 'super_admin', 'active').lastInsertRowid;

  // --- Curriculum (published) ---
  const curriculumId = db.prepare(
    'INSERT INTO curricula (slug, status, display_order) VALUES (?, ?, ?)'
  ).run('mb-test-curriculum', 'published', 1).lastInsertRowid;
  const langs = ['uz', 'ru', 'en'];
  const curriculumNames = { uz: 'Fizika', ru: 'Физика', en: 'Physics' };
  for (const lang of langs) {
    db.prepare(
      'INSERT INTO curriculum_translations (curriculum_id, lang, name, short_desc, long_desc) VALUES (?, ?, ?, ?, ?)'
    ).run(curriculumId, lang, curriculumNames[lang], 'Test curriculum', '');
  }

  // --- Subject: Anatomy ---
  const subjId = db.prepare(
    'INSERT INTO subjects (slug, status, display_order) VALUES (?, ?, ?)'
  ).run('anatomy', 'published', 1).lastInsertRowid;
  db.prepare('INSERT INTO curriculum_subjects (curriculum_id, subject_id, display_order) VALUES (?, ?, ?)')
    .run(curriculumId, subjId, 1);
  const subjNames = { uz: 'Anatomiya', ru: 'Анатомия', en: 'Anatomy' };
  for (const lang of langs) {
    db.prepare('INSERT INTO subject_translations (subject_id, lang, name, short_desc, long_desc) VALUES (?, ?, ?, ?, ?)')
      .run(subjId, lang, subjNames[lang], '', '');
  }

  // --- Module: Upper Limb ---
  const modId = db.prepare(
        'INSERT INTO modules (subject_id, slug, status, display_order) VALUES (?, ?, ?, ?)'
  ).run(subjId, 'anatomy-upper-limb', 'published', 1).lastInsertRowid;
  const modNames = { uz: 'Yuqori chovqon', ru: 'Верхний конечность', en: 'Upper Limb' };
  for (const lang of langs) {
    db.prepare('INSERT INTO module_translations (module_id, lang, name, description) VALUES (?, ?, ?, ?)')
      .run(modId, lang, modNames[lang], '');
  }

  // --- Topic: Bones ---
  const topicId = db.prepare(
        'INSERT INTO topics (module_id, slug, status, display_order) VALUES (?, ?, ?, ?)'
  ).run(modId, 'bones', 'published', 1).lastInsertRowid;
  const topicNames = { uz: 'Soylaklar', ru: 'Кости', en: 'Bones' };
  for (const lang of langs) {
    db.prepare('INSERT INTO topic_translations (topic_id, lang, name, description) VALUES (?, ?, ?, ?)')
      .run(topicId, lang, topicNames[lang], '');
  }

  // --- Question: single-best MCQ ---
  const qid = createQuestion({
    topicId,
    payload: {
      difficulty: 'medium',
      status: 'published',
      translations: {
                uz: { question_text: "Qaysi qat shaxsaniy organimdir?" },
        en: { question_text: 'Which of the following is a paired organ?' },
      },
      options: [
        { option_key: 'A', translations: { uz: 'Yurak', en: 'Heart' } },
        { option_key: 'B', translations: { uz: 'Qolun', en: 'Lungs' } },
        { option_key: 'C', translations: { uz: 'Kalfa', en: 'Rib' } },
        { option_key: 'D', translations: { uz: 'Bosh', en: 'Head' } },
      ],
      explanation_blocks: [],
    },
    user: { id: userId },
  });

  console.log('Seed complete.');
  console.log('  Admin:', ADMIN_EMAIL, '/', ADMIN_PASSWORD);
  console.log('  Curriculum:', curriculumId, 'mb-test-curriculum');
  console.log('  Subject:', subjId, 'anatomy');
  console.log('  Module:', modId, 'anatomy-upper-limb');
  console.log('  Topic:', topicId, 'bones');
  console.log('  Question:', qid);
  return userId;
});

const result = tx();
db.close();