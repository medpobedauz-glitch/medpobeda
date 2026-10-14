Question additions use the existing Express, SQLite, student sessions, admin form, and media uploader.

- Public IDs are allocated by database triggers using a dedicated persistent counter. Inserts, including duplication, receive new IDs; updates cannot change them. Migration 006 backfills missing IDs and preserves existing valid IDs. The migration handles databases both with and without the partially added fields in migration 001.
- Question and explanation images reference the existing media table. Removing an image detaches it from the question; shared media files are preserved. The media library prevents deletion of images still referenced by explanations.
- Admin search accepts an exact public ID without case sensitivity. Edit preserves the existing ID, workflow status, and structured explanation blocks when unchanged.
- Students see explanations, sources, and public IDs after answering. Bookmarks use the existing student identity and a unique student/question key, with CSRF-protected writes. Account links open the saved question in the existing practice page.

Validation:

```
npm run build
node scripts/test-question-features.mjs
npm run db:status
```

The regression suite uses a temporary database and upload directory. It covers historical schema variants, migration idempotence, ID permanence and non-reuse, concurrent creation, search, both image references, invalid/oversized uploads, editing, duplication, publishing, image-only explanations, bookmark persistence, student isolation, and CSRF enforcement.

Browser checks covered search/edit/save, explanation timing, bookmark toggling and account links, normal topic navigation, and mobile/tablet layout. Browser file selection was restricted by the automation tool; multipart uploads were tested through the API.

Local migration 006 was applied after a SQLite backup to `storage/medpobeda.sqlite.before-question-features-1789152058563.bak`; all 5 existing questions remain. The pre-existing checksum mismatch for migration 001 is unchanged (its source had been edited before this work). Migration 006 has a matching checksum.

Restart an already-running backend to load the new routes. Server startup automatically applies pending migrations in other installations.

Student layout and community responses (September 2026):

- Practice content and its top bar use a centered 880px maximum-width column. Question text and question/explanation images are centered. Next sits on the right, above the explanation.
- After answering, each option shows a small circular percentage: the share of learners who selected that option. An accompanying summary shows total learners and exact-answer correctness/incorrectness percentages. Counts include the current learner.
- Migration 009 records one first answer per signed-in learner per question content revision. Retakes and duplicate requests cannot inflate the counts. Changes to question text, options, keys or question images start a new cohort; source/status/explanation-only changes preserve it. Historical cohorts stay stored. Old practice totals cannot reconstruct option choices and are not backfilled.
- POST `/api/auth/questions/:publicId/answer` requires student authentication and CSRF, validates published hierarchy and content revision, validates option keys and calculates correctness on the server. The response contains aggregate counts only. Multi-select option percentages may sum above 100%; full-answer correctness requires an exact key set.
- Percentage loading failures show a retry action while leaving Next available. Late responses cannot populate a different question. All new user-facing text is available in Uzbek, Russian and English.
- Verification: `node scripts/test-question-answers.mjs`, existing question-feature and central-bank regressions, and production build. Desktop (1470px) and mobile (390px) browser checks verified centered question/image, right-side Next, circles showing 50/50/0/0 for two test learners, no horizontal overflow and clean next-question state.
- Local migration backup: `storage/backups/before-question-answers-1789236813416.sqlite`. All seven existing questions remain; live response statistics start empty and accumulate from real answers.
