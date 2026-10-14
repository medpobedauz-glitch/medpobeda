# MedPobeda deployment

## Architecture

Vercel serves the Vite frontend and 3D assets. `/api/*`, `/media/*` and `/health` proxy to one Render Docker web service. Cookies stay on the frontend origin. The backend also serves the complete built site directly.

The Render service mounts a persistent disk at `/var/data` for SQLite, sessions, uploads and PDF jobs. Do not use a free ephemeral service for this data. Keep a single backend instance with SQLite. Review paid compute and disk costs before applying `render.yaml`.

## Backend

1. Sign in to Render and create a Blueprint from `medpobedauz-glitch/medpobeda`, branch `main`.
2. Review the `medpobeda-api` service and disk cost. Set `PUBLIC_ORIGIN` to the eventual frontend HTTPS origin. Render generates a separate session secret; local `.env` is never uploaded.
3. Deploy. Migrations run on startup, when the persistent disk is mounted. Verify `/health` returns status `ok`.
4. In the private backend shell, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ characters) and optional `ADMIN_NAME`, then run `npm run create-admin`. Remove `ADMIN_PASSWORD` afterwards. The command refuses to overwrite an existing account. Never run the development seed in production.

## Frontend

After the backend is live:

```sh
node scripts/configure-vercel.mjs https://YOUR-BACKEND.onrender.com
```

This writes `vercel.json` with the actual backend URL. Commit it and import the GitHub repository into the intended Vercel account. Framework: Vite; build: `npm run build`; output: `dist`; Node: 22. Set Render's `PUBLIC_ORIGIN` to the final frontend URL. Verify login/logout, admin editing, uploads and anatomy on the public deployment.

Do not deploy the frontend as a complete site before the backend exists: API requests would not work. Large PDF uploads may exceed proxy limits; use the backend's HTTPS admin URL directly for those uploads.

## Data and limitations

Production starts with an empty database. Existing local accounts/content/uploads have not been copied. Any migration must use a consistent SQLite backup plus matching uploads, transferred privately, never committed to Git.

The Python PDF extraction runtime and Tesseract are included. Automatic AI taxonomy classification and AI Q Bank assistance require a separately provisioned local Ollama service; the Docker image does not include one. Manual editing remains available. The Java app login adapter remains disabled by default.

512 MB is an initial small service size, not a capacity guarantee; large PDF jobs may need more memory. Disk-backed Render services have a brief interruption on deployment. Maintain application-consistent SQLite backups and copy backups off the service; disk snapshots alone are not a complete database backup plan.

## Local verification

```sh
npm run build
node scripts/test-production-deployment.mjs
```

The production smoke check uses temporary storage and tests secure cookies behind the HTTPS proxy, admin creation, SPA routing and session persistence across restart. It never modifies the local application database.
