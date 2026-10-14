// The same bounded, text-only format allowlist is used on write and render.
export const TEXT_COLORS = ['#102a43', '#2563eb', '#b02a2a', '#147253', '#9a5415', '#486581'];
export const HIGHLIGHTS = ['#fff3cd', '#e0edf7', '#e3f2e8'];
export const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function sanitizeDelta(input) {
  const ops = [];
  let remaining = 60000;
  for (const op of (Array.isArray(input?.ops) ? input.ops : []).slice(0, 10000)) {
    if (typeof op?.insert !== 'string' || !remaining) continue;
    const insert = op.insert.slice(0, remaining); remaining -= insert.length;
    if (!insert) continue;
    const a = op.attributes || {}, attributes = {};
    for (const k of ['bold','italic','underline']) if (a[k] === true) attributes[k] = true;
    if (TEXT_COLORS.includes(a.color)) attributes.color = a.color;
    if (HIGHLIGHTS.includes(a.background)) attributes.background = a.background;
    if (['small','large'].includes(a.size)) attributes.size = a.size;
    if ([2,3].includes(a.header)) attributes.header = a.header;
    if (['bullet','ordered'].includes(a.list)) attributes.list = a.list;
    if (['center','right','justify'].includes(a.align)) attributes.align = a.align;
    ops.push({ insert, ...(Object.keys(attributes).length ? { attributes } : {}) });
  }
  if (ops.length && !ops.at(-1).insert.endsWith('\n')) ops.push({insert:'\n'});
  return { ops };
}
export function renderDelta(input) {
  const delta = sanitizeDelta(input);
  let html = '', line = '', list = '';
  const closeList = () => { if (list) html += '</' + list + '>'; list = ''; };
  const flush = a => {
    const kind = a.list === 'ordered' ? 'ol' : a.list === 'bullet' ? 'ul' : '';
    if (list !== kind) { closeList(); if (kind) { html += '<' + kind + '>'; list = kind; } }
    const tag = kind ? 'li' : a.header ? 'h' + a.header : 'p';
    html += '<' + tag + (a.align ? ' class="ex-align-' + a.align + '"' : '') + '>' + (line || '<br>') + '</' + tag + '>';
    line = '';
  };
  for (const op of delta.ops) {
    const a = op.attributes || {};
    const parts = op.insert.split('\n');
    parts.forEach((part, i) => {
      if (i) flush(a);
      let text = escapeHtml(part).replace(/\u2028/g, '<br>');
      if (text) {
        if (a.bold) text = '<strong>' + text + '</strong>';
        if (a.italic) text = '<em>' + text + '</em>';
        if (a.underline) text = '<u>' + text + '</u>';
        const style = [a.color && 'color:' + a.color, a.background && 'background-color:' + a.background].filter(Boolean).join(';');
        if (style || a.size) text = '<span' + (style ? ' style="' + style + '"' : '') + (a.size ? ' class="ex-size-' + a.size + '"' : '') + '>' + text + '</span>';
        line += text;
      }
    });
  }
  if (line) flush({});
  closeList();
  return html;
}
