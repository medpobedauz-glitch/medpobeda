// Verifies the anatomy dashboard data against the real model assets.
// - every available card points to an existing GLB file
// - every modelId/preset resolves to a real structure-index entry
// - coming-soon cards do not reference models that already exist
// - viewer param generation is sane
// - dashboard i18n keys have full en/uz/ru parity
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url).pathname;
const index = JSON.parse(fs.readFileSync(root + 'public/models/structure-index.json', 'utf8')).structures;

const { ANATOMY_SECTIONS, ANATOMY_CARDS, cardToViewerParams } = await import(root + 'src/data/anatomy-dashboard.js');

let available = 0, soon = 0;
for (const section of ANATOMY_SECTIONS) {
  assert(section.id && section.title && Array.isArray(section.cards) && section.cards.length, 'section shape: ' + section.id);
  for (const card of section.cards) {
    assert(card.id && card.title.en && card.title.uz && card.title.ru, 'trilingual title: ' + card.id);
    assert(['available', 'coming-soon'].includes(card.status), 'status: ' + card.id);
    if (card.status === 'available') {
      available++;
      assert(card.file, 'available card needs a file: ' + card.id);
      assert(fs.existsSync(root + 'public/models/' + card.file), 'GLB exists: ' + card.file);
      if (card.modelId) {
        assert(index[card.modelId] || card.preset === 'skull',
          'modelId resolves in structure-index: ' + card.id + ' → ' + card.modelId);
        const entry = index[card.modelId];
        if (entry && card.system) assert.equal(entry.system, card.system, 'system matches index: ' + card.id);
        if (entry && card.layer) assert.equal(entry.layer, card.layer, 'layer matches index: ' + card.id);
      }
      const params = cardToViewerParams(card);
      assert(params && params.includes('topic=' + card.id), 'viewer params: ' + card.id);
    } else {
      soon++;
      // A whole-organ proxy is intentionally unavailable as an exact topic model.
      assert(card.proxy || !card.modelId || !index[card.modelId],
        'coming-soon card references an existing model (should be available): ' + card.id);
    }
  }
}

// Section counts match the approved curriculum.
const expected = { bones: 4, joints: 6, muscles: 17, arteries: 4, heart: 1, veins: 4,
  nervous: 5, lymphoid: 8, senses: 3, respiratory: 4, digestive: 15, urinary: 5, endocrine: 5 };
assert.equal(ANATOMY_SECTIONS.length, Object.keys(expected).length);
for (const [id, n] of Object.entries(expected)) {
  assert.equal(ANATOMY_SECTIONS.find(s => s.id === id)?.cards.length, n, 'section size: ' + id);
}
assert.equal(ANATOMY_CARDS.length, 81);

// i18n parity for dashboard keys.
const en = (await import(root + 'src/i18n/en.js')).en;
const uz = (await import(root + 'src/i18n/uz.js')).uz;
const ru = (await import(root + 'src/i18n/ru.js')).ru;
const keys = Object.keys(en).filter(k => k.startsWith('anat3d.dashboard.'));
for (const k of keys) {
  assert(k in uz, 'missing uz key: ' + k);
  assert(k in ru, 'missing ru key: ' + k);
}

console.log(`anatomy dashboard data OK — ${ANATOMY_SECTIONS.length} sections, ${ANATOMY_CARDS.length} cards (${available} available, ${soon} coming soon), ${keys.length} i18n keys × 3 languages`);
