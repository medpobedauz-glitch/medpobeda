// MedPobeda - Shared SVG Icon Library
// Line icons, 24x24 viewBox, stroke-based, aria-hidden by default.
const S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const ICONS = {
  // Curricula
  medicine: '<g ' + S + '><path d="M8.5 3.5h7v4h4v7h-4v4h-7v-4h-4v-7h4z"/><path d="M12 6.5v9M7.5 11h9"/></g>',
  pharmacy: '<g ' + S + '><path d="M9.5 3.5h5v3.2a5.5 5.5 0 0 1 3 4.9v6.9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-6.9a5.5 5.5 0 0 1 3-4.9z"/><path d="M12 10v4M10 12h4"/></g>',
  dentistry: '<g ' + S + '><path d="M7.5 4.5c2.5-1 6.5-1 9 0 1.4.6 2 2 1.6 3.6-.4 1.7-1 2.4-1.3 4.4-.3 1.9-.3 4.3-.9 6-.4 1.2-1.9 1.3-2.3 0-.5-1.6-.4-3.8-1.6-3.8s-1.1 2.2-1.6 3.8c-.4 1.3-1.9 1.2-2.3 0-.6-1.7-.6-4.1-.9-6-.3-2-.9-2.7-1.3-4.4C5.5 6.5 6.1 5.1 7.5 4.5z"/></g>',

  // Subjects
  anatomy: '<g ' + S + '><path d="M12 21c-4.5-3.6-8-6.6-8-10.4C4 7.5 6 5.5 8.5 5.5c1.4 0 2.7.7 3.5 1.8.8-1.1 2.1-1.8 3.5-1.8C18 5.5 20 7.5 20 10.6c0 3.8-3.5 6.8-8 10.4z"/><path d="M12 9v5M9.8 11.2h4.4"/></g>',
  physiology: '<g ' + S + '><path d="M3 12h4l2-5 3 10 2.5-7 1.5 4h5"/></g>',
  biochem: '<g ' + S + '><path d="M9 4.5a3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 0 0 7M9 4.5v14"/><path d="M15 4.5a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 1 0 7M15 4.5v14"/></g>',
  histology: '<g ' + S + '><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></g>',
  micro: '<g ' + S + '><circle cx="12" cy="12" r="6.5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7M12 5.5v-2M12 20.5v-2M5.5 12h-2M20.5 12h-2"/></g>',
  pharmacology: '<g ' + S + '><path d="M10.5 4.5h3v4l3.5 9a2 2 0 0 1-1.9 2.7H8.9A2 2 0 0 1 7 17.5l3.5-9z"/><path d="M8.6 13.5h6.8"/></g>',
  chem: '<g ' + S + '><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><circle cx="12" cy="15.5" r="2.6"/><path d="M10 10.2l1 2.8M14 10.2l-1 2.8"/></g>',
  organchem: '<g ' + S + '><path d="M5 18c3-7 5-10 7-10s4 3 7 10"/><path d="M5 18h14"/><path d="M9 12.5h6"/></g>',
  dentalanatomy: '<g ' + S + '><path d="M7.5 4.5c2.5-1 6.5-1 9 0 1.4.6 2 2 1.6 3.6-.4 1.7-1 2.4-1.3 4.4-.3 1.9-.3 4.3-.9 6-.4 1.2-1.9 1.3-2.3 0-.5-1.6-.4-3.8-1.6-3.8s-1.1 2.2-1.6 3.8c-.4 1.3-1.9 1.2-2.3 0-.6-1.7-.6-4.1-.9-6-.3-2-.9-2.7-1.3-4.4C5.5 6.5 6.1 5.1 7.5 4.5z"/><path d="M9 7h6"/></g>',

  // Features
  video: '<g ' + S + '><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/></g>',
  practice: '<g ' + S + '><path d="M9 11.5l2 2 4.5-4.5"/><rect x="4" y="4" width="16" height="16" rx="3"/></g>',
  book: '<g ' + S + '><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></g>',
  notes: '<g ' + S + '><path d="M6 3.5h9l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z"/><path d="M15 3.5V8h4.5M9 12h6M9 16h6"/></g>',
  review: '<g ' + S + '><path d="M4 12a8 8 0 1 1 2.3 5.6"/><path d="M4 13v4h4"/><path d="M12 8v4l3 2"/></g>',
  dashboard: '<g ' + S + '><rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/></g>',
  progress: '<g ' + S + '><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v4M20.5 12h-4"/></g>',
  streak: '<g ' + S + '><path d="M12 3c1 3-3 4.5-3 8a4.5 4.5 0 0 0 9 0c0-2-1-3.5-2-4.5 0 1.5-1 2.5-2 2.5.5-2-1-5-2-6z"/></g>',
  saved: '<g ' + S + '><path d="M6.5 3.5h11a1 1 0 0 1 1 1V20l-6.5-3.5L5.5 20V4.5a1 1 0 0 1 1-1z"/></g>',
  mistake: '<g ' + S + '><path d="M12 4L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.5"/></g>',
  leaderboard: '<g ' + S + '><path d="M7 21h10M12 17.5V21"/><path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M6 6H3.5a3.5 3.5 0 0 0 3 5M18 6h2.5a3.5 3.5 0 0 1-3 5"/></g>',
  device: '<g ' + S + '><rect x="4" y="3.5" width="12" height="17" rx="2"/><path d="M19 8.5v9a2 2 0 0 1-2 2"/><path d="M8.5 17.5h3"/></g>',
  sync: '<g ' + S + '><path d="M20 12a8 8 0 0 1-13.6 5.7"/><path d="M4 12a8 8 0 0 1 13.6-5.7"/><path d="M17.6 2.5v4h-4M6.4 21.5v-4h4"/></g>',
  shield: '<g ' + S + '><path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="M9.5 12l2 2 3.5-3.5"/></g>',
  globe: '<g ' + S + '><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13.8 13.8 0 0 1 3.6 9A13.8 13.8 0 0 1 12 21a13.8 13.8 0 0 1-3.6-9A13.8 13.8 0 0 1 12 3z"/></g>',
  users: '<g ' + S + '><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.7a3.2 3.2 0 0 1 0 5.6M17.5 14.6a5.5 5.5 0 0 1 3 4.9"/></g>',
  phone: '<g ' + S + '><path d="M6 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4 5.5a2 2 0 0 1 2-2z"/></g>',
  mail: '<g ' + S + '><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></g>',
  pin: '<g ' + S + '><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></g>',
  clock: '<g ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></g>',
  search: '<g ' + S + '><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></g>',
  info: '<g ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.4"/></g>',
  check: '<path ' + S + ' d="M5 12.5l4.5 4.5L19 7.5"/>',
  'arrow-right': '<path ' + S + ' d="M4 12h15M13.5 6L19.5 12l-6 6"/>',
  play: '<path ' + S + ' d="M8 5.5v13l10-6.5z"/>',
  alert: '<g ' + S + '><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5M12 15.5v.5"/></g>',
};

export function icon(name, size = 24) {
  const inner = ICONS[name] || ICONS.info;
  return '<svg class="icon icon--' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' + S + '>' + inner + '</svg>';
}

export default icon;