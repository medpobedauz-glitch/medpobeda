// MedPobeda — subject thumbnail artwork.
// Hand-crafted inline SVGs let every QBank subject card show a relevant,
// on-brand illustration (no external images to break or manage).

// Tile colour tints by subject slug (CSS classes live in styles/pages.css).
const TINTS = {
  anatomy: 'blue', gistologiya: 'violet', embriologiya: 'rose',
  biokimyo: 'teal', fiziologiya: 'green', mikrobiologiya: 'green',
  patologiya: 'amber', farmakologiya: 'coral', 'ichki-kasalliklar': 'blue',
  'umumiy-jarrohlik': 'slate', pediatriya: 'coral',
  'akusherlik-va-ginekologiya': 'rose', 'gistologiya-va-embriologiya': 'violet',
  otorinolaringologiya: 'amber', oftalmologiya: 'teal', onkologiya: 'violet',
  'otorinolaringologiya-lor': 'amber',
  urologiya: 'blue', 'shoshilinch-tibbiyot': 'coral', radiologiya: 'slate',
  nevrologiya: 'teal',
};

export function subjectTint(slug) {
  return TINTS[slug] || 'blue';
}

const A = 'stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"';

// A cartoon skull — instantly reads as "anatomy / bones".
const ART_ANATOMY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><rect x="30" y="12" width="36" height="30" rx="15"/></g>' +
  '<g ' + A + '><path d="M26 36c0 9 7 13 16 13l-5 7h22l-5-7c9 0 16-4 16-13"/></g>' +
  '<g ' + A + '><circle cx="41" cy="28" r="4.5"/><circle cx="55" cy="28" r="4.5"/><path d="M48 33l0 6"/></g>' +
  '</svg>';

// ECG pulse line on a soft monitor.
const ART_PHYSIOLOGY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M6 34h18l7-13 8 28 8-40 8 46 7-21h27"/></g>' +
  '<g opacity=".45"><circle cx="16" cy="16" r="3" fill="currentColor"/><circle cx="80" cy="50" r="3" fill="currentColor"/></g>' +
  '</svg>';

// DNA double helix.
const ART_BIOCHEM =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M28 10C46 22 46 42 28 54"/><path d="M68 10C50 22 50 42 68 54"/></g>' +
  '<g ' + A + ' opacity=".55"><path d="M28 22h40M28 32h40M28 42h40"/></g>' +
  '<g opacity=".45"><circle cx="74" cy="14" r="3" fill="currentColor"/><circle cx="22" cy="50" r="3" fill="currentColor"/></g>' +
  '</svg>';

// Microscope with a specimen slide under the objective.
const ART_MICROSCOPE =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><rect x="30" y="40" width="30" height="7" rx="3"/><path d="M36 40V34h6"/><path d="M50 34v6h6"/><path d="M42 34l8-12"/><path d="M42 34l8 12" opacity=".4"/></g>' +
  '<g ' + A + '><circle cx="50" cy="18" r="7"/><path d="M22 53h34"/><path d="M26 53v6h28v-6" opacity=".6"/></g>' +
  '<g opacity=".4"><rect x="48" y="47" width="16" height="6" rx="2" fill="currentColor"/></g>' +
  '</svg>';

// Bacteria — rods and cocci.
const ART_BACTERIA =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g fill="currentColor"><ellipse cx="34" cy="28" rx="14" ry="7"/><ellipse cx="68" cy="44" rx="9" ry="4.5" opacity=".5"/><circle cx="26" cy="18" r="3" opacity=".35"/><circle cx="76" cy="20" r="2.5" opacity=".35"/></g>' +
  '<g ' + A + '><path d="M40 28c-2-7-9-8-12-3"/><path d="M70 46c-2-6-8-7-11-2"/></g>' +
  '</svg>';

// Capsule pill.
const ART_CAPSULE =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><rect x="18" y="24" width="60" height="18" rx="9"/><path d="M46 24v18" opacity=".55"/></g>' +
  '<g opacity=".4"><circle cx="26" cy="50" r="3" fill="currentColor"/><circle cx="74" cy="14" r="3" fill="currentColor"/></g>' +
  '</svg>';

// Magnifying glass over an abnormal cell.
const ART_PATHOLOGY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><circle cx="42" cy="30" r="16"/><path d="M53 41l9 9"/></g>' +
  '<g opacity=".5" ' + A + '><path d="M36 24l6 12M50 22l-7 10"/></g>' +
  '<g opacity=".35"><circle cx="42" cy="30" r="3.5" fill="currentColor"/></g>' +
  '</svg>';

// Heart with a small pulse line (internal medicine / care).
const ART_HEART =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M48 52c-2-9-28-9-28-25 0-9 7-15 16-15 5 0 9 2 12 5 3-3 7-5 12-5 9 0 16 6 16 15 0 16-26 16-28 25z"/></g>' +
  '<g ' + A + ' opacity=".7"><path d="M18 34h10l5-10 8 20 6-14 4 4h8"/></g>' +
  '</svg>';

// Scalpel blade with a cross (surgery).
const ART_SURGERY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M20 50l30-30c6-6 14-4 17 2l-3 3c-4 4-4 9 1 13l6 5-51 7z" opacity=".9"/></g>' +
  '<g ' + A + ' opacity=".55"><path d="M70 16v14M63 23h14"/></g>' +
  '</svg>';

// Friendly teddy face (pediatrics).
const ART_TEDDY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><circle cx="34" cy="24" r="7"/><circle cx="62" cy="24" r="7"/><path d="M48 52c-14 0-22-8-22-18 0-12 10-18 22-18 12 0 22 6 22 18 0 10-8 18-22 18z"/></g>' +
  '<g fill="currentColor"><circle cx="40" cy="34" r="2.8"/><circle cx="56" cy="34" r="2.8"/></g>' +
  '<g ' + A + '><path d="M44 42c3 3 5 3 8 0"/></g>' +
  '</svg>';

// Parent + child with a heartbeat (obstetrics/gynaecology).
const ART_MOTHER =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><circle cx="38" cy="34" r="13"/><circle cx="62" cy="46" r="9"/></g>' +
  '<g ' + A + ' opacity=".65"><path d="M14 40h8l5-9 7 18 6-12 4 3h8"/></g>' +
  '<g opacity=".4"><circle cx="62" cy="18" r="3" fill="currentColor"/></g>' +
  '</svg>';

// Ear (ENT).
const ART_EAR =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M54 10c13 5 19 16 15 27-4 9-14 13-20 8-5-4-7-11-4-16 4-7 12-8 17-4 4 3 4 8 1 12"/></g>' +
  '<g opacity=".4"><path d="M34 22c4-6 8-8 14-8"/><circle cx="26" cy="40" r="3" fill="currentColor"/></g>' +
  '</svg>';

// Eye with iris and sparkle.
const ART_EYE =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><ellipse cx="48" cy="32" rx="27" ry="15"/></g>' +
  '<g fill="currentColor" opacity=".9"><circle cx="48" cy="32" r="7"/></g>' +
  '<g ' + A + ' opacity=".5"><path d="M34 18c-6 6 0 12 6 6M62 46c6-6 0-12-6-6"/></g>' +
  '</svg>';

// Awareness ribbon (oncology).
const ART_RIBBON =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M44 12c4 6 8 12 8 18 0 10-5 12-8 20-3-8-8-10-8-20 0-6 4-12 8-18z" opacity=".9"/><path d="M52 12c-4 6-8 12-8 18 0 10 5 12 8 20 3-8 8-10 8-20 0-6-4-12-8-18z" opacity=".55"/></g>' +
  '<g ' + A + '><path d="M40 50h16" opacity=".8"/></g>' +
  '</svg>';

// Kidney bean with a droplet (urology).
const ART_KIDNEY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M30 24c-9-7-17 1-13 12 4 11 6 14 0 21-2 2-2 6 1 6 11 0 16-9 20-19 3-8 0 8 7 3 8-6 12-14 3-20-4-3-59-7-18-3z" fill="currentColor" fill-opacity=".14"/></g>' +
  '<g ' + A + ' opacity=".6"><path d="M64 14c0 7 4 10 4 10s4-3 4-10c0-2-2-4-4-4s-4 2-4 4z" fill="currentColor"/></g>' +
  '</svg>';

// Emergency cross + pulse.
const ART_EMERGENCY =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M60 16v20M50 26h20" opacity=".9"/></g>' +
  '<g ' + A + '><path d="M6 36h14l7-13 9 26 8-34 8 40 7-17h14"/></g>' +
  '</svg>';

// X-ray film with a glowing bone silhouette (radiology).
const ART_RADIO =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<rect x="20" y="14" width="56" height="38" rx="6" fill="currentColor" fill-opacity=".18"/>' +
  '<g stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round">' +
  '<path d="M48 22v12"/><path d="M42 28h12"/><path d="M48 34l-7 8M48 34l7 8"/></g>' +
  '<g opacity=".45"><circle cx="30" cy="22" r="2.5" fill="currentColor"/><circle cx="68" cy="26" r="2.5" fill="currentColor"/></g>' +
  '</svg>';

// Brain + neuron nodes (neurology).
const ART_BRAIN =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M30 22c-4-11 10-17 18-9 7-7 17-3 13 8 9 4 7 15-1 15 0 7-9 11-16 4-5 5-13 2-13-4-9-2-9-11-1-14z"/></g>' +
  '<g fill="currentColor"><circle cx="22" cy="14" r="3"/><circle cx="76" cy="46" r="3"/></g>' +
  '<g ' + A + ' opacity=".5"><path d="M22 17l10 4M73 43l-9-7"/></g>' +
  '</svg>';

// Cells dividing (embryology).
const ART_CELLS =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><circle cx="36" cy="28" r="12"/></g>' +
  '<g ' + A + ' opacity=".5"><path d="M30 16c14-12 22 2 12 12"/></g>' +
  '<g ' + A + ' opacity=".65"><circle cx="66" cy="42" r="8"/></g>' +
  '<g opacity=".4"><circle cx="74" cy="22" r="5" fill="currentColor"/><circle cx="60" cy="52" r="3" fill="currentColor"/></g>' +
  '</svg>';

// Fallback: medical plus + pulse.
const ART_DEFAULT =
  '<svg viewBox="0 0 96 64" role="img" aria-hidden="true">' +
  '<g ' + A + '><path d="M8 34h16l8-14 10 30 8-22 7 14h15"/></g>' +
  '<g ' + A + ' opacity=".6"><path d="M64 12v18M55 21h18"/></g>' +
  '</svg>';

const ART = {
  anatomy: ART_ANATOMY,
  gistologiya: ART_MICROSCOPE,
  'gistologiya-va-embriologiya': ART_MICROSCOPE,
  embriologiya: ART_CELLS,
  biokimyo: ART_BIOCHEM,
  fiziologiya: ART_PHYSIOLOGY,
  mikrobiologiya: ART_BACTERIA,
  farmakologiya: ART_CAPSULE,
  pharmacology: ART_CAPSULE,
  patologiya: ART_PATHOLOGY,
  pathology: ART_PATHOLOGY,
  'ichki-kasalliklar': ART_HEART,
  'umumiy-jarrohlik': ART_SURGERY,
  pediatriya: ART_TEDDY,
  'akusherlik-va-ginekologiya': ART_MOTHER,
  otorinolaringologiya: ART_EAR,
  'otorinolaringologiya-lor': ART_EAR,
  oftalmologiya: ART_EYE,
  onkologiya: ART_RIBBON,
  urologiya: ART_KIDNEY,
  'shoshilinch-tibbiyot': ART_EMERGENCY,
  radiologiya: ART_RADIO,
  nevrologiya: ART_BRAIN,
};

export function subjectArtHtml(slug) {
  return ART[slug] || ART_DEFAULT;
}