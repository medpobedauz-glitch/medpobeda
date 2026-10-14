# MedPobeda app integration — implementation status

The website Q Bank is **not yet connected** to the app. The existing website
login, questions and dashboard continue to use SQLite. No app data was changed.

## Implemented preparation

A server-side login adapter follows the supplied Java reference contract:

- `POST /api/app/auth/login` accepts `{email, password}` and calls the app's
  `POST /api/auth/login`. The origin must match `PUBLIC_ORIGIN`.
- The response's `Authorization` header is an opaque encrypted token. The
  website does not generate/decrypt tokens or need the JWT signing secret.
- Tokens stay in the existing server-side session store. The browser receives
  an HttpOnly session cookie and a small allowlisted profile, never the token.
- App identity is stored under `appAuth`, separate from local `student` IDs.
- `GET /api/app/auth/session` returns the login profile snapshot until six-hour
  expiry. It does not assert that the upstream session is still valid.
- `POST /api/app/auth/logout` removes the website's app session using CSRF
  protection. It does not revoke app tokens on other devices.
- `GET /api/app/auth/status` explicitly reports that Q Bank/progress are not
  connected. No generic arbitrary-path proxy is exposed.

The connector is disabled by default. No existing UI points to it yet. Turning
it on alone does not integrate the Q Bank or replace the existing website login.

## Why activation is pending

The supplied `AuthService.login` re-encodes the submitted password before
matching and throws on a match. The intended check is:

```java
if (!passwordEncoder.matches(payload.getPassword(), user.getPassword())) {
    throw new InvalidUserException("PASSWORD_NOT_MATCHED");
}
```

Verify/fix this in the running backend before enabling login. No attempts were
made to bypass authentication or test wrong passwords against real accounts.
The authorization filter also compares each token with the latest login time,
so another device's login can invalidate the first session. Both-device support
needs a backend session design change. The supplied registration code logs the
password and OTP; remove that logging before use. Shared signing/encryption/API
secrets should be rotated by the backend owner, not copied into the website.

On 2026-10-01 the public `/v3/api-docs` request returned HTTP 400 with a Java
`ControllerAdviceBean` method error, so no endpoint contract could be obtained
there. The reference ZIP lacks DTO definitions, security configuration, Q Bank
controllers/services, answer submission, bookmarks and dashboard endpoints.

## Required to finish

Supply the full app backend source or working API documentation including login
DTO/profile DTO, current-profile validation, question hierarchy and pagination,
attempt start/resume, answer submission, completion/scoring, bookmarks and
dashboard/statistics. These can all come in one backend ZIP; separate answers
are not required. A test account is also needed for end-to-end validation.

Then replace the website Q Bank/login/dashboard data layer as a unit. Do not
map app IDs directly to local SQLite rows or show local progress as synced app
progress. Preserve original app question/attempt IDs and use the app's scoring
and subscription checks. Test an app attempt on the website, a website attempt
on the app, and a question added through the admin panel on both platforms.

After backend verification, server-only `.env` settings for testing the adapter:

```dotenv
MEDPOBEDA_APP_LOGIN_ENABLED=true
MEDPOBEDA_APP_API_ORIGIN=https://api.medpobeda.com
PUBLIC_ORIGIN=http://localhost:3000
```

Keep disabled until ready. No PostgreSQL credentials are needed for API login.

## Validation

Run `node --test scripts/test-app-auth.mjs`. Tests use a fake upstream and an
isolated temporary SQLite session database; they never touch app users or the
website's existing database. Run `npm run build` for frontend compilation.
