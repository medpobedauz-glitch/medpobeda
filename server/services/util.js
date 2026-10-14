// MedPobeda — title-case / safe-string helpers used across the server.
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert arbitrary user strings into stable URL slugs.
export function slugify(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'item';
}

export function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
}

export function truncate(str, n = 100) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}