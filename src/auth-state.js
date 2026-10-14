// MedPobeda — student authentication state (public side).
// Cached around GET /api/auth/me so the router, header and gated pages
// can share one live view of who is signed in (with zero duplicate calls).
let cachePromise = null;   // Promise<student|null>
let resolved = null;       // last known student (or null)
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => { try { fn(resolved); } catch (e) { /* listener error */ } });
}

// Fetch (or re-fetch) the current signed-in student from the server.
export function refreshStudent() {
  cachePromise = fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((r) => {
      if (!r.ok) throw new Error('not authenticated');
      return r.json();
    })
    .then((d) => {
      resolved = d.student || null;
      notify();
      return resolved;
    })
    .catch(() => {
      resolved = null;
      notify();
      return null;
    });
  return cachePromise;
}

// Async: returns the current student object or null (starts a fetch once).
export function student() {
  if (!cachePromise) return refreshStudent();
  return cachePromise;
}

// Sync: last known student (null until the first fetch resolves).
export function currentStudent() {
  return resolved;
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Gate helper: resolves to the student, otherwise redirects to the login page
// (preserving the intended destination via ?next=) and resolves to null.
export function requireStudent(nextPath) {
  return student().then((s) => {
    if (s) return s;
    const lang = document.documentElement.lang || 'uz';
    const next = encodeURIComponent(nextPath || ('/' + lang + '/qbank'));
    window.location.replace('/' + lang + '/login?next=' + next);
    return null;
  });
}

// Builds a same-origin login URL that returns to `path` after sign-in.
export function loginUrl(nextPath) {
  const lang = document.documentElement.lang || 'uz';
  const next = encodeURIComponent(nextPath || ('/' + lang + '/qbank'));
  return '/' + lang + '/login?next=' + next;
}

// Signs the student out: POST /api/auth/logout (CSRF-protected), then clears
// the client-side auth cache so the header/pages flip to the guest state.
export async function logout() {
  // The logout endpoint is CSRF-protected; /me hands out the session's token.
  let csrf = '';
  try {
    csrf = (await (await fetch('/api/auth/me', { credentials: 'same-origin' })).json()).csrfToken || '';
  } catch (e) { /* not signed in / network hiccup — still try the logout call */ }
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    });
  } catch (e) { /* server unreachable: session cookie stays until expiry */ }
  cachePromise = null;
  resolved = null;
  notify();
  return true;
}