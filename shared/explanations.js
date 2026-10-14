import { sanitizeDelta, renderDelta } from './rich-explanation.js';
// MedPobeda — explanation content model: structured JSON blocks.
// Explanations are stored as an ordered array of safe block objects and rendered
// with a strict allowlist. This prevents arbitrary HTML/script injection while
// supporting paragraphs, headings, lists, tables and images.

// Allowed block types.
export const BLOCK_TYPES = ['paragraph', 'heading', 'list', 'table', 'image', 'rich_text'];

// Sanitizes/validates a raw explanation payload into safe canonical blocks.
export function sanitizeExplanationBlocks(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const type = raw.type;
    if (!BLOCK_TYPES.includes(type)) continue;
    if (type === 'rich_text') {
      const delta = sanitizeDelta(raw.delta);
      if (delta.ops.some(o => o.insert.trim())) out.push({type, delta});
    } else if (type === 'paragraph') {
      if (typeof raw.text !== 'string' || !raw.text.trim()) continue;
      out.push({ type: 'paragraph', text: inlineSanitize(raw.text) });
    } else if (type === 'heading') {
      const level = raw.level === 'h2' ? 'h2' : 'h3';
      if (typeof raw.text !== 'string' || !raw.text.trim()) continue;
      out.push({ type: 'heading', level, text: inlineSanitize(raw.text) });
    } else if (type === 'list') {
      const ordered = Boolean(raw.ordered);
      if (!Array.isArray(raw.items)) continue;
      const items = raw.items
        .map((it) => (typeof it === 'string' ? inlineSanitize(it.trim()) : null))
        .filter(Boolean);
      if (!items.length) continue;
      out.push({ type: 'list', ordered, items });
    } else if (type === 'table') {
      if (!Array.isArray(raw.rows)) continue;
      const rows = raw.rows
        .map((row) => {
          if (!Array.isArray(row)) return null;
          const cells = row
            .map((c) => (typeof c === 'string' ? inlineSanitize(c.trim()) : ''))
            .slice(0, 8);
          return cells.length ? cells : null;
        })
        .filter(Boolean)
        .slice(0, 50);
      if (!rows.length) continue;
      out.push({ type: 'table', rows });
    } else if (type === 'image') {
      const mediaId = Number(raw.mediaId);
      if (!Number.isInteger(mediaId) || mediaId <= 0) continue;
      out.push({
        type: 'image',
        mediaId,
        caption: typeof raw.caption === 'string' ? inlineSanitize(raw.caption) : '',
        alt: typeof raw.alt === 'string' ? inlineSanitize(raw.alt) : '',
      });
    }
  }
  return out;
}

// Inline content: allow only plain text with basic inline markers.
// We render this later through an escaper + allowlist; here we ensure no markup.
export function inlineSanitize(str) {
  return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Renders safe block content to sanitized HTML for display.
// Only the allowed tags below survive; anything else is stripped by escaping.
export function renderExplanationBlocks(blocks) {
  const esc = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const h = (s) => esc(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return (blocks || []).map((b) => {
    switch (b.type) {
      case 'rich_text':
        return renderDelta(b.delta);
      case 'paragraph':
        return '<p>' + h(b.text) + '</p>';
      case 'heading':
        return '<' + (b.level === 'h2' ? 'h2' : 'h3') + '>' + h(b.text) + '</' + (b.level === 'h2' ? 'h2' : 'h3') + '>';
      case 'list':
        return (b.ordered ? '<ol>' : '<ul>') +
          b.items.map((it) => '<li>' + h(it) + '</li>').join('') +
          (b.ordered ? '</ol>' : '</ul>');
      case 'table':
        return '<table><tbody>' +
          b.rows.map((row) =>
            '<tr>' + row.map((cell) => '<td>' + h(cell) + '</td>').join('') + '</tr>'
          ).join('') +
          '</tbody></table>';
      case 'image':
        return '<figure>' +
          '<img src="/api/public/media/' + Number(b.mediaId) + '" alt="' + h(b.alt) + '" loading="lazy">' +
          (b.caption ? '<figcaption>' + h(b.caption) + '</figcaption>' : '') +
          '</figure>';
      default:
        return '';
    }
  }).join('');
}