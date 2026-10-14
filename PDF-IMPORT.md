# PDF Qbank Import

The existing Admin Panel now has **PDF Qbank Import** at `/en/admin/pdf-import` (also `/uz/` and `/ru/`). The existing website, learning routes and question editor are retained.

## Using it

1. Select the subject explicitly and the **language of the PDF text**. For the supplied Anatomy PDF, choose Anatomy and **English**. Upload one or several PDFs (up to 10, 512 MB each by default).
2. Run a sample. For this Anatomy book, pages **5–24** cover the first chapter, its answer table and all 12 solutions. These are PDF page numbers, not printed page labels.
3. Click Review, open questions, compare source previews, answers and images. Confirm that you checked the sample, then Approve sample.
4. Run full processing. Pause/resume uses cached pages; it does not duplicate staged questions or overwrite saved reviews.
5. AI suggestions use local Ollama and existing taxonomy IDs. Create missing Topics/Sub-topics in Taxonomy Manager. Suggestions never approve a question.
6. Filter, correct text/options/answers/explanations/source page numbers and image placement, then approve. Questions with extraction warnings require a review note; incomplete questions cannot be approved.
7. Select approved **full-run** questions and Add Selected to Qbank. They become **drafts** with permanent MP007 IDs. Publish through the existing Questions workflow.

Taxonomy Manager reuses the application's existing hierarchy: Subject → Module (labelled Topic here) → Topic (labelled Sub-topic here). It does not create competing taxonomy tables. Existing curriculum membership is managed through the existing curriculum tools.

## Local setup

```sh
python3 -m venv .venv-pdf
.venv-pdf/bin/pip install -r server/pdf_import/requirements.txt
ollama pull gemma3:1b
# Start Ollama using the installed app, or: ollama serve
npm run db:migrate
npm run build
npm start
```

PyMuPDF is installed in this workspace and the installed local `gemma3:1b` model was verified. Configuration is documented in `.env.example`: `PDF_PYTHON`, `PDF_IMPORT_DIR`, `PDF_MAX_UPLOAD_MB`, `PDF_OLLAMA_URL`, `PDF_OLLAMA_MODEL`, `PDF_CLASSIFICATION_THRESHOLD` and `PDF_ENABLE_OCR`.

Only loopback Ollama endpoints are accepted; cloud model names and remote model metadata are rejected, and HTTP redirects are disabled. Model downloads are separate from classification. In a deployed installation, “local” means the application server's machine. A small local model's confidence is self-reported and is not a measured accuracy score. Invalid IDs and uncertain responses remain reviewable. Ollama failure leaves extraction available for manual classification. Pause during classification takes effect after the current model call returns (up to 90 seconds).

## Standalone extraction

```sh
.venv-pdf/bin/python server/pdf_import/main.py \
  '/path/to/book.pdf' --subject Anatomy \
  --start-page 5 --end-page 24 --output '/path/to/sample-output'
```

Omit the page range for the full book. Re-run the same command and output directory to resume. A changed file, range, OCR setting or parser version requires a new output directory. Outputs: `questions.json`, `questions.ndjson`, `images/`, `errors.json`, `extraction_report.json` and `checkpoint.sqlite`. The JSON carries original question numbers, source filename, question/answer/solution pages, image roles, warnings and unassigned taxonomy. AI suggestions and subsequent admin corrections live in the staging database; extraction downloads preserve the original extraction result.

Extraction reads pages incrementally, caches page events in SQLite, then matches scoped question numbers against separate answer tables and solutions. Images are deduplicated by content hash. Unknown layouts, conflicting answers, missing content, uncertain image associations and vector graphics are reported. Text is extracted, never medically generated. This is a reusable conservative parser, **not a guarantee of lossless extraction from arbitrary PDFs**. Scanned pages need optional Tesseract OCR, which is not installed here; vector illustrations and unusual tables may need manual image attachment or editing.

Uploaded source PDFs and extracted artifacts are private under `storage/pdf-imports`, accessed through authenticated admin routes. Approved media is copied into the existing media library only when added to Qbank. Additional question images render in Learn; provenance is visible when editing the imported question. Existing media deletion checks also protect PDF-linked media.

## Validation performed

- Anatomy: 1,934 pages processed; 1,071 candidates, 1,140 unique images; 705 candidates have extraction warnings. Candidate counts are not a claim that every question was perfectly reconstructed. The first chapter's 12 answers matched both the source answer table and individual solutions.
- Physiology: pages 5–24 processed; 21 candidates, 5 images; 11 candidates flagged. Same extractor, no subject-specific page rules.
- Full source validation output is at `/tmp/medpobeda-anatomy-full-v6`; compact reports are under `storage/pdf-validation/`.
- `node scripts/test-pdf-import.mjs`: isolated database and generated PDF; upload validation, auth/CSRF, duplicate uploads, sample gate, cross-page options, explanation answer regression, image extraction/retention, review approval, draft-only commit, provenance, idempotency, resume, report downloads, previews and foreign keys.
- Existing question feature and rich explanation regression suites passed; production build passed with existing Vite chunk warnings.

Migration `007_pdf_import.sql` is additive. A backup of the local database before applying it is at `storage/backups/before-pdf-import-2026-09-12.sqlite`. No extracted Anatomy questions were added to the live Qbank during validation.
