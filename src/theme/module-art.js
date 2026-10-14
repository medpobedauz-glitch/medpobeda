import { qbankArtHtml } from './qbank-art.js';

// Exact section identities: titles/locales never change the chosen illustration.
// The legacy anatomy-upper-limb slug actually belongs to General Anatomy.
export const anatomyModuleImages = Object.freeze({
  'anatomy-upper-limb': 'general',
  'anatomy-bones-joints-cartilage': 'bones',
  'anatomy-muscles-tendons': 'muscles',
  'anatomy-cardiovascular-lymphatic-nervous': 'systems',
  'osteologiya-va-artrologiya': 'osteology',
  'neyroanatomiya': 'neuro',
  'bosh-va-bo-yin': 'head-neck',
  'yuqori-oyoq-qol': 'upper-limb',
  'pastki-oyoq-qol': 'lower-limb',
  'ko-krak-qafasi': 'ribs',
  'qorin-bo-shlig-i': 'abdomen',
  'chanoq-va-oraliq': 'pelvis',
  'orqa-soha': 'back',
});

export function moduleArtHtml(module, subject) {
  const asset = subject === 'anatomy' ? anatomyModuleImages[module.slug] : null;
  if (!asset) return qbankArtHtml(subject);
  return `<img src="/images/qbank/modules/${asset}.png" alt="" width="112" height="112" loading="lazy" decoding="async">`;
}
