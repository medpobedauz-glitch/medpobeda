# MedPobeda free deployment

## Architecture

Vercel serves the frontend and 3D assets. `/api/*`, `/media/*` and `/health` proxy to a Render **Free** Docker web service. Cookies stay on the frontend origin.

Turso stores the SQLite-compatible database, including accounts, content and sessions. Its official `libsql` driver preserves the existing synchronous API. Network queries serialize work in the web process, so this setup is intended for an initial, small deployment. Supabase stores images in a private bucket; the backend serves them through the existing URLs without exposing credentials. Render's disk is temporary upload staging only.

`render.yaml` creates no paid compute or persistent disk. Stay on Free plans. Check current quotas: [Render](https://render.com/docs/free), [Turso](https://turso.tech/pricing), [Supabase](https://supabase.com/pricing). Render sleeps after inactivity; Supabase may pause inactive projects. Quota exhaustion can interrupt service. No automatic paid upgrade is configured here.

## Database and storage

1. Create a Turso Free **libSQL / SQLite-compatible** database; leave the new TursoDB engine off. Use Mumbai, near Render Singapore. Create a database-scoped read/write token for the backend.
2. Create a Supabase Free organization and project. The user sets its database password privately. This app uses Storage only, not Supabase database/auth APIs.
3. Obtain the project URL and legacy **service_role** API key. Use a project dedicated to this app because the service key is privileged. The app creates `medpobeda-media` as a private bucket on startup, restricted to supported image types and the app's size limit. An existing public bucket is rejected.

Set these secrets only on the backend, never in Git, Vercel or `VITE_*` variables:

```text
TURSO_DATABASE_URL=libsql://YOUR-DATABASE.turso.io
TURSO_AUTH_TOKEN=PRIVATE-DATABASE-TOKEN
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PRIVATE-SERVICE-ROLE-KEY
```

## Render backend

1. Create a Blueprint from `medpobedauz-glitch/medpobeda`, branch `main`.
2. Confirm Free compute, no disk and estimated cost **$0**. Set the four variables above and `PUBLIC_ORIGIN` to the eventual frontend HTTPS origin. Render generates a separate session secret.
3. Deploy. Migrations run against Turso on startup. Verify `/health` returns status `ok`.
4. Free Render has no private shell. Run `npm run create-admin` locally against Turso with private environment variables: the Turso URL/token, `DATABASE_DRIVER=libsql`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ characters) and optional `ADMIN_NAME`. Avoid putting credentials in command history. The command refuses to overwrite an existing account. Remove `ADMIN_PASSWORD` afterwards. Never run the development seed against the cloud database.

`EPHEMERAL_HOST=true` refuses a local database, local image storage or enabled PDF staging on startup. This prevents accidental data loss on free hosting. Local development retains SQLite and disk storage defaults.

## Vercel frontend

After the backend is live:

```sh
node scripts/configure-vercel.mjs https://YOUR-BACKEND.onrender.com
```

Commit the generated `vercel.json` and deploy to the intended Vercel project. Framework: Vite; build: `npm run build`; output: `dist`; Node: 22. Set Render's `PUBLIC_ORIGIN` to the final frontend URL. Verify public login/logout, admin editing, uploads and anatomy. Keep backend secrets off Vercel.

## Data and limitations

The cloud database starts empty. Existing local accounts, questions and uploads are not copied automatically. Copying private data requires an explicit decision about what to transfer and a consistent backup. Local absolute image paths cannot be copied unchanged into cloud media metadata.

PDF import is disabled in free cloud hosting because source PDFs and resume checkpoints need durable private storage, and processing can exceed service memory. Process PDFs locally. Ordinary Q Bank editing, CSV import/export, images, login and progress use cloud persistence.

Ollama is not included: AI classification/Q Bank assistance need a separately hosted provider. Manual editing remains available. The Java app adapter stays disabled. Keep private database exports and media backups outside these services.

## Verification

```sh
npm run build
node scripts/test-production-deployment.mjs
DATABASE_DRIVER=libsql node scripts/test-production-deployment.mjs
node scripts/test-cloud-storage.mjs
```

Tests use temporary data and synthetic accounts. Production checks cover secret validation, admin creation, proxy cookies, SPA routing and persistent sessions. A local mock of Supabase checks private bucket creation, upload permissions/CSRF, validation, media URLs, HEAD, restart recovery, failure cleanup and deletion. Local driver/mock tests do not replace a live cloud check.
