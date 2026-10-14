# Question management in the existing admin

Open `/uz/admin/questions` (also `/en/` and `/ru/`). The original navigation stays **Dashboard → Curricula → Subjects → Modules → Topics → Questions**. Existing hierarchy records, names, ordering and curriculum membership are retained. Continue managing hierarchy from those existing pages.

Manual entry uses the original question editor: Uzbek, Russian and English tabs; question and explanation images; Quill rich explanation formatting and preview; additional answer options; references; and auto-translation. Drafts can begin in any of the three languages. The `/admin/qbank` route is a compatibility alias for this same editor, not a second editor.

“Source, question type & review status” is an optional collapsed editor section. It adds source selection, tags, five question types and the six editorial statuses. Source metadata and previous references remain attached after edits. Important edits keep version snapshots and reject stale saves.

“Question management — search, review, sources, CSV” is an optional collapsed section below the existing topic list. It contains repository search/filters, counts, preview, bulk workflow changes, moving questions to a selected existing Topic, duplicate review, edit history, source management and CSV import/export. Its Edit action opens the same original editor above. Rejected and merged questions remain stored.

CSV import requires column mapping and preview before confirmation, with a user-bound expiring preview token and idempotent confirmation. Import requires a source and creates REVIEW records. Export supports all, filtered, selected, approved or published questions and UTF-8 text. CSV hierarchy labels retain the original interchange convention: **Subject / Topic / Subtopic corresponds to the existing admin's Subject / Module / Topic**. Source names must already exist. CSV currently covers English and Uzbek; Russian content remains fully editable and stored through the existing editor. Limits: 5 MB / 2,000 rows per import; 500 IDs per bulk request.

Auto-translate still fills the other two language tabs from the active tab and preserves rich formatting. Existing target content is preserved unless “Replace existing translations” is explicitly selected. The source language is never overwritten. Failed or conflicting translations leave the draft unchanged. The existing editor retains its original translation service. Optional Question Bank AI assistance uses local Ollama, configured by `QBANK_AI_PROVIDER`, `QBANK_OLLAMA_URL` and `QBANK_OLLAMA_MODEL` in `.env.example`. The local model must already be installed and running. Set `QUESTION_TRANSLATION_PROVIDER=ollama` only if you explicitly want the existing editor to use local Ollama too. The small local model is not reliable enough to treat its translations as approved. AI is optional; manual editing, review and CSV do not depend on it. All machine translations require staff review.

The `/api/admin/qbank` service extends existing question records rather than creating a second repository. It maps the existing Subject → Module → Topic hierarchy into the requested conceptual Subject → Topic → Subtopic API. Existing `/api/admin/questions` authoring routes preserve structured explanations and all three languages while saving the extra metadata atomically. Question types and source/history metadata live in additive tables from migration 008.

## Verification

- `npm run build`
- `node scripts/test-central-qbank.mjs`: isolated CRUD, source/history retention, permissions, stale edits, review validation, duplicate decisions, CSV preview/idempotency/UTF-8, translation direction/preservation/conflicts, and original three-language rich editor API round trips.
- `node scripts/test-question-features.mjs`: existing IDs, images/uploads, rich explanations, publication, bookmarks and student isolation.
- `node scripts/test-pdf-import.mjs`: existing PDF staging, source retention and idempotent commits.
- `node scripts/test-rich-explanations.mjs`: rich-text sanitization, semantic rendering and legacy compatibility.
- Browser check on a disposable database: original sidebar and cascade, language switching, manual English/Russian entry, save/reopen with retained text, options and rich explanations, and image/formatting controls present.

Migration 008 was applied locally after backup to `storage/backups/before-central-qbank-1789214097748.sqlite`; all seven existing questions were retained and foreign-key checks passed. The previously documented migration 001 checksum mismatch predates this module.
