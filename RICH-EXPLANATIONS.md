Explanation editing now uses Quill 2.0.3, loaded only when opening the admin questions page. The compact toolbar supports bold, italic, underline, a restricted text/highlight palette, font sizes, H2/H3 headings, lists, alignment, undo/redo, and clear formatting. Enter creates semantic paragraphs; Shift+Enter inserts a soft line break. Preview uses the same renderer as student output and includes the separate explanation image.

Storage remains `question_translations.explanation_blocks`. A `rich_text` block contains a text-only Delta. Server-side sanitization allows only supported marks and fixed color/size/alignment values. Rendering escapes text and generates allowed HTML; links, arbitrary HTML, scripts, URL styles, and image embeds are excluded. Images continue through the existing validated media uploader.

Legacy blocks require no migration. Existing tables and block images remain in position as protected editor blocks. Unchanged legacy explanations are saved unchanged; editing converts textual blocks to rich text. Language-tab changes, preview, image changes, and failed saves retain draft blocks in the existing form state. Auto-translation translates text runs while retaining formatting. Question IDs, references, workflow, and student bookmarks are unchanged.

Validation:

- `npm run build`
- `node scripts/test-rich-explanations.mjs` — marks, semantic layout, malicious input, bounded content, and legacy compatibility.
- `node scripts/test-question-features.mjs` — isolated database/API regression, including rich-text creation, edit permanence, publication and student HTML, plus existing image/bookmark checks.
- Browser checks: inline styles/color/highlight/size, headings/lists, undo/redo, clear formatting, preview, language switching, save/reopen, ID permanence, explanation visibility after answering, student semantic output, mobile sizing, bookmarks, and editor boundaries at tablet width.

No database migration is needed. Restart an already-running backend to load the updated shared renderer.

Dependency audit: the existing Vite/esbuild advisories remain. Quill 2.0.3 also has GHSA-v3m3-f69x-jf25 concerning HTML export. This integration does not use Quill HTML export or render its HTML; it stores an allowlisted Delta and uses the shared escaping renderer. See https://github.com/advisories/GHSA-v3m3-f69x-jf25.
