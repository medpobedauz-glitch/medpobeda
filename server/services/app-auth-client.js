// Adapter for the supplied Java AuthController/AuthService contract.
// Tokens are opaque (the Java backend encrypts its JWT). No signing secret here.
export class AppAuthError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createAppAuthClient({
  baseUrl = 'https://api.medpobeda.com', fetchImpl = globalThis.fetch,
  timeoutMs = 10000, ttlMs = 21600000, now = Date.now,
} = {}) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash) {
    throw new Error('App API must be an HTTPS origin without credentials or a path.');
  }
  return {
    async login(email, password) {
      const startedAt = now();
      let response, profile;
      try {
        response = await fetchImpl(new URL('/api/auth/login', base), {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      } catch {
        throw new AppAuthError(502, 'App login service is unavailable. Try again later.');
      }
      if (!response.ok) {
        if ([400, 401, 403, 404].includes(response.status)) {
          throw new AppAuthError(401, 'Unable to sign in with these app credentials.');
        }
        if (response.status === 429) throw new AppAuthError(429, 'Too many attempts. Try again later.');
        throw new AppAuthError(502, 'App login service is unavailable. Try again later.');
      }
      try { profile = await response.json(); } catch {
        throw new AppAuthError(502, 'App login service returned an invalid response.');
      }
      const token = (response.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
      // The UserDetailDTO definition is missing from the reference ZIP. Require a
      // stable ID rather than guessing an identity from email or a local row ID.
      if (!token || /\s/.test(token) || token.length > 16384 ||
          !profile || Array.isArray(profile) ||
          !['string', 'number'].includes(typeof profile.id) || !String(profile.id).trim() ||
          (typeof profile.id === 'number' && !Number.isSafeInteger(profile.id))) {
        throw new AppAuthError(502, 'App login response needs a token and stable user ID.');
      }
      return {
        token, expiresAt: startedAt + ttlMs,
        // Deliberate allowlist: do not return the raw backend profile to a browser.
        profile: {
          provider: 'medpobeda-app', id: String(profile.id),
          email: typeof profile.email === 'string' ? profile.email : email,
          firstName: typeof profile.firstName === 'string' ? profile.firstName : '',
          lastName: typeof profile.lastName === 'string' ? profile.lastName : '',
        },
      };
    },
  };
}
