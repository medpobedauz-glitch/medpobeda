import { sanitizeExplanationBlocks } from '../../shared/explanations.js';
let explanationEditorHtml, mountExplanationEditor;
// MedPobeda — Admin: fast question authoring.
// One screen: pick Curriculum → Subject → Module → Topic, type the question in
// up to 3 languages (tabs), mark the correct option, then save as draft or
// advance the workflow (submit for review / publish) from the list below.
import '../styles/question-features.css';
import { mountQuestionTools } from '../components/question-tools.js';
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const LANGS = ['uz', 'ru', 'en'];
const LANG_LABELS = { uz: 'O‘zbek', ru: 'Русский', en: 'English' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_OPTIONS = 8;
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const state = {
  ctx: null,
  subjectCurricula: new Map(), // subjectId -> [curriculumId]
  role: '',
  sel: { curriculum: '', subject: '', module: '', topic: '' },
  difficulty: 'medium',
  lang: 'uz',
  options: [],
  texts: {},
  questionImageMediaId: null,
  questionImagePreview: null,
  explanationImageMediaId: null,
  explanationImagePreview: null,
  reference: '',
  pdfSource: null,
};

function blankTexts() {
  const t = {};
  for (const l of LANGS) t[l] = { text: '', expl: '', note: '' };
  return t;
}

function blankOptions() {
  return OPTION_KEYS.slice(0, 4).map((key, i) => ({ key, uz: '', ru: '', en: '', correct: i === 0 }));
}

function resetForm() {
  state.editId = null;
  state.publicId = '';
  state.status = 'draft';
  state.difficulty = 'medium';
  state.lang = 'uz';
  state.options = blankOptions();
  state.texts = blankTexts();
  state.questionImageMediaId = null;
  state.questionImagePreview = null;
  state.explanationImageMediaId = null;
  state.explanationImagePreview = null;
  state.reference = '';
  state.pdfSource = null;
  state.cms={question_type:'single_best',status:'draft',source_id:null,tags:[]};
}

export function renderAdminQuestions() {
  resetForm();
  const contentHtml =
    '<div class="admin-topbar"><h1>Questions</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<form id="qs-search-form" class="admin-actions"><label for="qs-search">Question ID</label><input class="form-input" id="qs-search" placeholder="Search by Question ID…"><button class="btn" type="submit">Search</button></form>' +
    '<div id="qs-search-results" aria-live="polite"></div>' +
    '<div class="admin-cascade">' +
    '<div class="form-field"><label class="form-label" for="qs-curriculum">Curriculum</label><select class="form-input" id="qs-curriculum"></select></div>' +
    '<div class="form-field"><label class="form-label" for="qs-subject">Subject</label><select class="form-input" id="qs-subject" disabled></select></div>' +
    '<div class="form-field"><label class="form-label" for="qs-module">Module</label><select class="form-input" id="qs-module" disabled></select></div>' +
    '<div class="form-field"><label class="form-label" for="qs-topic">Topic</label><select class="form-input" id="qs-topic" disabled></select></div>' +
    '<div class="form-field"><label class="form-label" for="qs-difficulty">Difficulty</label><select class="form-input" id="qs-difficulty">' +
    DIFFICULTIES.map((d) => '<option value="' + d + '"' + (d === 'medium' ? ' selected' : '') + '>' + d + '</option>').join('') +
    '</select></div>' +
    '</div>' +
    '<p class="admin-hint" id="qs-topic-hint"></p>' +
    '<div id="qs-editor"></div>' +
    '<div class="admin-section-title">Questions in this topic</div>' +
    '<div id="qs-list"><p class="admin-empty">Select a topic to see its questions.</p></div>' +
    '<details class="admin-section" id="qs-tools"><summary>Question management — search, review, sources, CSV</summary><div id="qs-tools-body"></div></details>';

  return adminPage('questions', contentHtml, () => {
    document.title = 'Questions — Admin — MedPobeda';
    initQuestionsPage();
  });
}

// ---- Bootstrap: load hierarchy context + wire cascade -----------------------
async function initQuestionsPage() {
  ({ explanationEditorHtml, mountExplanationEditor } = await import('../components/explanation-editor.js'));
  const user = await requireAdmin();
  if (!user) return;
  state.role = user.role;
  document.getElementById('admin-identity').textContent =
    (user.display_name || user.email) + ' · ' + user.role;

  // One call gives the whole hierarchy; a second maps subjects → curricula.
  const [ctxRes, subjRes, cmsRes] = await Promise.all([
    adminFetch('/api/admin/questions/context'),
    adminFetch('/api/admin/content/subjects'),
    adminFetch('/api/admin/qbank/context'),
  ]);
  state.ctx = ctxRes.ok ? await ctxRes.json() : { curricula: [], subjects: [], modules: [], topics: [] };
  state.cmsContext=cmsRes.ok?await cmsRes.json():{sources:[],types:[],statuses:[]};
  mountQuestionTools(document.getElementById('qs-tools-body'),{edit:editQuestion,context:state.cmsContext,onChange:renderList});
  const subjectRows = subjRes.ok ? await subjRes.json() : [];
  for (const s of subjectRows) {
    state.subjectCurricula.set(s.id, (s.curricula || []).map((c) => c.id));
  }

  document.getElementById('qs-search-form').addEventListener('submit', searchQuestions);
  renderCascade();
  renderEditor();
  renderList();

  const deps = { subject: 'curriculum', module: 'subject', topic: 'module' };
  for (const kind of ['curriculum', 'subject', 'module', 'topic']) {
    document.getElementById('qs-' + kind).addEventListener('change', (e) => {
      resetForm();
      state.sel[kind] = e.target.value;
      for (const k2 of ['subject', 'module', 'topic']) {
        if (deps[k2] === kind || deps[deps[k2]] === kind) state.sel[k2] = '';
      }
      renderCascade();
      renderEditor();
      renderList();
    });
  }
  document.getElementById('qs-difficulty').addEventListener('change', (e) => {
    state.difficulty = e.target.value;
  });
}

function optionsFor(kind) {
  const c = state.ctx;
  if (kind === 'curriculum') return c.curricula || [];
  if (kind === 'subject') {
    const cid = Number(state.sel.curriculum);
    return (c.subjects || []).filter((s) => cid?(state.subjectCurricula.get(s.id) || []).includes(cid):!(state.subjectCurricula.get(s.id)||[]).length);
  }
  if (kind === 'module') return (c.modules || []).filter((m) => String(m.subject_id) === String(state.sel.subject));
  if (kind === 'topic') return (c.topics || []).filter((t) => String(t.module_id) === String(state.sel.module));
  return [];
}

function renderCascade() {
  const deps = { subject: 'curriculum', module: 'subject', topic: 'module' };
  for (const kind of ['curriculum', 'subject', 'module', 'topic']) {
    const el = document.getElementById('qs-' + kind);
    const items = optionsFor(kind);
    const value = state.sel[kind];
    el.innerHTML = '<option value="">— select —</option>' +
      items.map((it) => '<option value="' + it.id + '"' + (String(it.id) === String(value) ? ' selected' : '') + '>' +
        esc(it.name || it.slug) + '</option>').join('');
    el.disabled = kind !== 'curriculum' && kind!=='subject' && !state.sel[deps[kind]];
    if (value && !items.some((it) => String(it.id) === String(value))) state.sel[kind] = '';
  }
  const topic = (state.ctx.topics || []).find((t) => String(t.id) === String(state.sel.topic));
  document.getElementById('qs-topic-hint').textContent = topic
    ? 'Topic "' + (topic.name || topic.slug) + '" currently has ' + (topic.questionCount ?? 0) + ' question(s). New questions are saved as drafts first.'
    : 'Pick a topic to start adding questions.';
}

// ---- Editor: language tabs + options + save buttons -------------------------
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderEditor() {
  const el = document.getElementById('qs-editor');
  if (!state.sel.topic) {
    el.innerHTML = '';
    return;
  }
  const lang = state.lang;
  const t = state.texts[lang];
  el.innerHTML =
    '<p>Question ID: <strong>' + esc(state.publicId || 'Assigned automatically on save') + '</strong></p>' +
    imageField('question', 'Question Image') +
    '<div class="admin-tabs">' +
    LANGS.map((l) => '<button type="button" class="admin-tab' + (l === lang ? ' admin-tab--active' : '') +
      (state.texts[l].text.trim() ? ' admin-tab--filled' : '') + '" data-lang="' + l + '">' + LANG_LABELS[l] + '</button>').join('') +
    (lang !== 'uz' ? '<button type="button" class="admin-tab" id="qs-copy-uz" title="Prefill this language from Uzbek">⧉ Copy from UZ</button>' : '') +
    '</div>' +
    '<div class="form-field"><label class="form-label" for="qs-text">Question text (' + lang.toUpperCase() + ') *</label>' +
    '<textarea class="form-input" id="qs-text" rows="3">' + esc(t.text) + '</textarea></div>' +
    '<div class="admin-section-title">Answer options — mark the correct answer(s)</div>' +
    state.options.map((o, i) =>
      '<div class="admin-opt-row">' +
      '<strong>' + o.key + '</strong>' +
      '<input class="form-input" data-opt="' + i + '" value="' + esc(o[lang]) + '" placeholder="Option ' + o.key + ' (' + lang.toUpperCase() + ')">' +
      '<label class="admin-correct"><input type="' + (state.cms.question_type==='multiple_correct'?'checkbox':'radio') + '" name="qs-correct" data-correct="' + i + '"' + (o.correct ? ' checked' : '') + '> correct</label>' +
      '</div>').join('') +
    (state.options.length < MAX_OPTIONS
      ? '<button type="button" class="btn" id="qs-add-option" style="margin-top:.35rem">+ Add option</button>' : '') +
    (state.options.length>2?'<button type="button" class="btn" id="qs-remove-option">Remove last option</button>':'') +
    '<div class="form-field" style="margin-top:1rem"><label class="form-label">Explanation (' + lang.toUpperCase() + ') — required before publish</label>' +
    explanationEditorHtml() + '</div>' +
    imageField('explanation', 'Explanation Image') +
    (state.pdfSource?'<p class="admin-hint">PDF source: '+esc(state.pdfSource.pdf)+' · question pages '+esc(state.pdfSource.question_pages.join(', '))+' · solution pages '+esc(state.pdfSource.solution_pages.join(', '))+' <a href="/api/admin/pdf-import/'+Number(state.pdfSource.import_id)+'/source" target="_blank">Open PDF</a></p>':'')+
    '<div class="form-field"><label class="form-label" for="qs-reference">Reference / Source (optional)</label><input class="form-input" id="qs-reference" maxlength="2000" value="' + esc(state.reference) + '"></div>' +
    '<div class="form-field"><label class="form-label" for="qs-note">Internal note (optional)</label>' +
    '<input class="form-input" id="qs-note" value="' + esc(t.note) + '"></div>' +
    metadataHtml() + '<div id="qs-msg"></div>' +
    '<div class="admin-actions">' +
    '<button type="button" class="btn btn--primary" id="qs-save">' + (state.editId ? 'Save changes' : 'Save draft') + '</button>' +
    '<button type="button" class="btn" id="qs-save-review">Save &amp; submit for review</button>' +
    '<button type="button" class="btn" id="qs-translate" title="Translate this tab\'s content into the other two languages">🌐 Auto-translate &amp; fill other languages</button>' +
    '<label><input type="checkbox" id="qs-retranslate"> Replace existing translations</label>' +
    '<button type="button" class="btn" id="qs-reset">Clear form</button>' +
    '</div>';

  mountExplanationEditor(el.querySelector('.ex-author'), { blocks: t.blocks || [], label: 'Explanation (' + lang.toUpperCase() + ')', imageId: state.explanationImageMediaId, onChange: (blocks, text) => { t.blocks = blocks; t.expl = text; } });
  bindImages(el);
  el.querySelector('#qs-type').value=state.cms.question_type;
  el.querySelector('#qs-source').value=state.cms.source_id||'';
  el.querySelector('#qs-workflow').value=state.cms.status;
  el.querySelector('#qs-type').onchange=e=>{state.cms.question_type=e.target.value;renderEditor();};
  el.querySelector('#qs-source').onchange=e=>state.cms.source_id=Number(e.target.value)||null;
  el.querySelector('#qs-workflow').onchange=e=>state.cms.status=e.target.value;
  el.querySelector('#qs-tags').oninput=e=>state.cms.tags=e.target.value.split(',').map(x=>x.trim()).filter(Boolean);
  el.querySelector('#qs-reference').addEventListener('input', e => { state.reference = e.target.value; });
  el.querySelectorAll('.admin-tab[data-lang]').forEach((tab) => {
    tab.addEventListener('click', () => { state.lang = tab.dataset.lang; renderEditor(); });
  });
  document.getElementById('qs-copy-uz')?.addEventListener('click', () => {
    state.texts[lang] = structuredClone(state.texts.uz);
    for (const o of state.options) o[lang] = o.uz;
    renderEditor();
  });
  el.querySelector('#qs-text').addEventListener('input', (e) => { state.texts[lang].text = e.target.value; });
  el.querySelector('#qs-note').addEventListener('input', (e) => { state.texts[lang].note = e.target.value; });
  el.querySelectorAll('[data-opt]').forEach((input) => {
    input.addEventListener('input', (e) => { state.options[Number(e.target.dataset.opt)][lang] = e.target.value; });
  });
  el.querySelectorAll('[data-correct]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const idx = Number(e.target.dataset.correct);
      if(state.cms.question_type==='multiple_correct')state.options[idx].correct=e.target.checked;else state.options.forEach((o, i) => { o.correct = i === idx; });
    });
  });
  document.getElementById('qs-add-option')?.addEventListener('click', () => {
    state.options.push({ key: OPTION_KEYS[state.options.length], uz: '', ru: '', en: '', correct: false });
    renderEditor();
  });
  document.getElementById('qs-remove-option')?.addEventListener('click',()=>{state.options.pop();renderEditor();});
  document.getElementById('qs-reset').addEventListener('click', () => { resetForm(); renderEditor(); });
  document.getElementById('qs-save').addEventListener('click', () => saveQuestion('draft'));
  document.getElementById('qs-save-review').addEventListener('click', () => saveQuestion('submit_review'));
  document.getElementById('qs-translate').addEventListener('click', autofillFromSource);
}

// ---- Auto-translate: fill the other two languages from the current tab ------
async function autofillFromSource() {
  const src=state.lang,btn=document.getElementById('qs-translate');
  const replace=document.getElementById('qs-retranslate').checked;
  const original=JSON.stringify({texts:state.texts,options:state.options,editId:state.editId});
  const texts=structuredClone(state.texts),options=structuredClone(state.options);
  btn.disabled=true;btn.textContent='Translating…';
  try {
    for(const target of LANGS.filter(l=>l!==src)){
      const fields=[];
      for(const key of ['text','note'])if(texts[src][key].trim()&&(replace||!texts[target][key].trim()))fields.push({obj:texts[target],key,value:texts[src][key]});
      for(const option of options)if(option[src].trim()&&(replace||!option[target].trim()))fields.push({obj:option,key:target,value:option[src]});
      if(fields.length){
        const res=await adminFetch('/api/admin/translate',{method:'POST',body:JSON.stringify({source:src,target,texts:fields.map(f=>f.value)})});
        const data=await res.json();
        if(!res.ok||data.translations?.length!==fields.length||data.translations.some(t=>typeof t!=='string'||!t.trim()))throw Error(data.error||'Translation failed.');
        fields.forEach((f,i)=>f.obj[f.key]=data.translations[i]);
      }
      if(replace||!(texts[target].blocks||[]).length)await translateExplanation(src,target,texts);
    }
    if(original!==JSON.stringify({texts:state.texts,options:state.options,editId:state.editId}))throw Error('The form changed during translation. Your edits are preserved; translate again.');
    state.texts=texts;state.options=options;state.cms.status='review';renderEditor();
    flash('Missing language fields filled from '+src.toUpperCase()+'. Review before saving. Existing translations were '+(replace?'replaced.':'preserved.'),true);
  } catch(e){flash(e.message||'Translation failed. Original content is unchanged; you can edit manually.',false);}
  finally{btn.disabled=false;btn.textContent='🌐 Auto-translate & fill other languages';}
}

// ---- Save: POST the question, optionally advance the workflow ---------------
function buildPayload() {
  const translations = {};
  for (const l of LANGS) {
    const t = state.texts[l];
    if (t.text.trim() || t.expl.trim() || t.note.trim() || t.blocks) {
      translations[l] = {
        question_text: t.text.trim(),
        explanation_blocks: t.blocks || [],
        question_image_alt: t.imageAlt || '',
        note: t.note.trim(),
      };
    }
  }
  return {
    cms:state.cms,
    topic_id: Number(state.sel.topic),
    difficulty: state.difficulty,
    status: state.status || 'draft',
    question_image_media_id: state.questionImageMediaId,
    explanation_image_media_id: state.explanationImageMediaId,
    reference: state.reference,
    translations,
    options: state.options.map((o, i) => ({
      option_key: o.key,
      is_correct: o.correct,
      display_order: i,
      translations: { uz: o.uz.trim(), ru: o.ru.trim(), en: o.en.trim() },
    })),
  };
}

function flash(msg, ok) {
  document.getElementById('qs-msg').innerHTML =
    '<div class="admin-msg ' + (ok ? 'admin-msg--ok' : 'admin-msg--err') + '">' + esc(msg) + '</div>';
}

async function saveQuestion(flow) {
  const msgEl = document.getElementById('qs-msg');
  msgEl.innerHTML = '';
  const payload = buildPayload();
  if (!Object.values(payload.translations).some(tr=>tr.question_text)) {
    flash('Question text is required in at least one language.', false);
    return;
  }
  if (state.options.filter((o) => o.correct).length < 1 || (state.cms.question_type!=='multiple_correct'&&state.options.filter((o) => o.correct).length !== 1)) {
    flash('Mark exactly one correct answer.', false);
    return;
  }
  try {
    document.getElementById('qs-save').disabled = true;
    document.getElementById('qs-save-review').disabled = true;
    const res = await adminFetch('/api/admin/questions' + (state.editId ? '/' + state.editId : ''), { method: state.editId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { flash(data.error || 'Save failed (' + res.status + ').', false); return; }
    const id = data.id;
    state.editId = id;
    state.publicId = data.question_id || state.publicId;
    // An old running backend may silently drop formats it does not recognise.
    // Verify persisted content before clearing the only in-memory draft.
    const verifyRes = await adminFetch('/api/admin/questions/' + id);
    if (!verifyRes.ok) { flash('Saved, but could not verify the content. Your form is preserved. Please try saving again.', false); return; }
    const saved = await verifyRes.json();
    const explanationsMatch = Object.entries(payload.translations).every(([lang, tr]) =>
      JSON.stringify(saved.translations?.[lang]?.explanation_blocks || []) === JSON.stringify(sanitizeExplanationBlocks(tr.explanation_blocks)));
    const extrasMatch = (saved.reference || '') === payload.reference.trim()
      && (saved.question_image_media_id || null) === payload.question_image_media_id
      && (saved.explanation_image_media_id || null) === payload.explanation_image_media_id;
    if (!explanationsMatch || !extrasMatch) {
      flash('The server did not preserve the explanation or image/source fields. Your form is still here. Restart the backend with the latest code, then save again.', false);
      return;
    }
    state.publicId = saved.question_id;
    state.cms=saved.cms||state.cms;
    if (flow === 'submit_review') {
      const r2 = await adminFetch('/api/admin/questions/' + id + '/submit_review', { method: 'POST', body: '{}' });
      if (!r2.ok) {
        const d2 = await r2.json().catch(() => ({}));
        flash('Saved as draft, but submit for review failed: ' + (d2.error || r2.status), false);
        renderList();
        return;
      }
      state.status = 'review';
    } else {

    }
    const savedId = state.publicId;
    resetForm();
    renderEditor();
    flash('Question ' + savedId + ' saved' + (flow === 'submit_review' ? ' and submitted for review.' : '.'), true);
    renderList();
  } catch {
    flash('Network error.', false);
  } finally {
    document.getElementById('qs-save').disabled = false;
    document.getElementById('qs-save-review').disabled = false;
  }
}

// ---- Topic question list + workflow buttons ---------------------------------
function actionButtons(q) {
  const isApprover = state.role === 'super_admin' || state.role === 'reviewer';
  const btn = (action, label, cls) =>
    '<button type="button" class="btn ' + cls + '" data-qaction="' + action + '" data-qid="' + q.id + '" style="padding:.25rem .7rem;font-size:.8rem">' + label + '</button>';
  const buttons = [btn('edit', 'Edit', '')];
  if (q.status === 'draft' && state.role !== 'reviewer') buttons.push(btn('submit_review', 'Submit for review', ''));
  if (q.status === 'review' && isApprover) {
    if(q.cms?.workflow_status!=='approved')buttons.push(btn('cms_approve','Approve',''));
    buttons.push(btn('cms_reject','Reject',''));
    buttons.push(btn('publish', 'Publish', 'btn--primary'));
    buttons.push(btn('draft', 'Back to draft', ''));
  }
  if (q.status === 'published' && isApprover) {
    buttons.push(btn('unpublish', 'Unpublish', ''));
  }
  return buttons.join(' ');
}

function renderList() {
  const el = document.getElementById('qs-list');
  if (!state.sel.topic) {
    el.innerHTML = '<p class="admin-empty">Select a topic to see its questions.</p>';
    return;
  }
  adminFetch('/api/admin/questions?group_by=topic&group_id='+encodeURIComponent(state.sel.topic)).then(async (res) => {
    if (!res.ok) { el.innerHTML = '<p class="admin-empty">Failed to load questions.</p>'; return; }
    const all = await res.json();
    const rows = all.filter((q) => String(q.topic_id) === String(state.sel.topic));
    if (!rows.length) { el.innerHTML = '<p class="admin-empty">No questions in this topic yet — add the first one above.</p>'; return; }
    el.innerHTML =
      '<table class="admin-table"><thead><tr>' +
      '<th>#</th><th>Status</th><th>Languages ready</th><th>Difficulty</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      rows.map((q) => {
        const langs = (q.completeness?.langs || [])
          .map((l) => '<span class="admin-badge ' + (l.complete ? 'admin-badge--published' : 'admin-badge--draft') + '">' + l.lang + '</span>').join(' ');
        return '<tr><td><strong>' + esc(q.question_id) + '</strong><p>' + esc((q.question_text || '').slice(0, 120)) + '</p></td>' +
          '<td>' + statusBadge(q.cms?.workflow_status||q.status) + '</td>' +
          '<td>' + langs + '</td>' +
          '<td>' + q.difficulty + '</td>' +
          '<td>' + actionButtons(q) + '</td></tr>';
      }).join('') + '</tbody></table>';

    el.querySelectorAll('[data-qaction]').forEach((b) => {
      b.addEventListener('click', async () => {
        if (b.dataset.qaction === 'edit') { await editQuestion(b.dataset.qid); return; }
        b.disabled = true;
        try {
          if(b.dataset.qaction.startsWith('cms_')){const row=rows.find(q=>String(q.id)===b.dataset.qid);const r=await adminFetch('/api/admin/qbank/bulk',{method:'POST',body:JSON.stringify({ids:[row.id],versions:{[row.id]:row.cms.version},status:b.dataset.qaction==='cms_approve'?'approved':'rejected'})});if(!r.ok)flash((await r.json()).error,false);return;}
          const res2 = await adminFetch('/api/admin/questions/' + b.dataset.qid + '/' + b.dataset.qaction,
            { method: 'POST', body: JSON.stringify({ publish_lang: 'uz' }) });
          const d2 = await res2.json().catch(() => ({}));
          if (!res2.ok) {
            const errs = Array.isArray(d2.errors) ? d2.errors.join(' ') : '';
            flash('Action failed: ' + (errs || d2.error || res2.status), false);
          }
        } finally {
          renderList();
        }
      });
    });
  });
}

function statusBadge(status) {
  return '<span class="admin-badge admin-badge--' + (status === 'published' ? 'published' : 'draft') + '">' + status.replace('_', ' ') + '</span>';
}
function imageField(kind, label) {
  const id = state[kind + 'ImageMediaId'];
  return '<div class="form-field"><label class="form-label" for="qs-' + kind + '-image">' + label + ' (optional)</label>' +
    '<input class="form-input" type="file" id="qs-' + kind + '-image" accept="image/png,image/jpeg,image/gif,image/webp">' +
    '<small>PNG, JPEG, GIF or WebP; up to 8 MB (server limit also applies).</small>' +
    (id ? '<img class="question-media" src="/api/public/media/' + id + '" alt="' + label + ' preview"><button type="button" class="btn" data-remove-image="' + kind + '">Remove image</button>' : '') + '</div>';
}
function bindImages(el) {
  for (const kind of ['question', 'explanation']) {
    el.querySelector('#qs-' + kind + '-image').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        flash('Choose a PNG, JPEG, GIF or WebP image up to 8 MB.', false); e.target.value = ''; return;
      }
      const controls = [...el.querySelectorAll('button, input, textarea')];
      controls.forEach(c => c.disabled = true);
      try {
        const form = new FormData(); form.append('file', file);
        const res = await adminFetch('/api/admin/media/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image upload failed.');
        state[kind + 'ImageMediaId'] = data.id;
        renderEditor();
      } catch (err) { flash(err.message || 'Image upload failed. Try again.', false); }
      finally { controls.forEach(c => c.disabled = false); }
    });
  }
  el.querySelectorAll('[data-remove-image]').forEach(b => b.addEventListener('click', () => {
    state[b.dataset.removeImage + 'ImageMediaId'] = null; renderEditor();
  }));
}
async function searchQuestions(e) {
  e.preventDefault();
  const el = document.getElementById('qs-search-results');
  const value = document.getElementById('qs-search').value.trim();
  if (!value) { el.textContent = 'Enter a Question ID.'; return; }
  el.textContent = 'Searching…';
  try {
    const res = await adminFetch('/api/admin/questions?question_id=' + encodeURIComponent(value));
    if (!res.ok) throw new Error();
    const rows = await res.json();
    el.innerHTML = rows.length ? rows.map(q => '<p><strong>' + esc(q.question_id) + '</strong> ' + esc(q.question_text) + ' <button type="button" class="btn" data-edit="' + q.id + '">Edit</button></p>').join('') : '<p>No question found.</p>';
    el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editQuestion(b.dataset.edit)));
  } catch { el.textContent = 'Could not search questions. Please try again.'; }
}
async function editQuestion(id) {
  try {
    const res = await adminFetch('/api/admin/questions/' + id);
    if (!res.ok) throw new Error();
    const q = await res.json();
    resetForm();
    state.editId = q.id; state.publicId = q.question_id; state.status = q.status;
    state.cms=q.cms||state.cms;
    if(state.role==='content_editor'&&['approved','published','rejected'].includes(state.cms.status))state.cms.status='review';
    state.difficulty = q.difficulty;
    state.questionImageMediaId = q.question_image_media_id;
    state.explanationImageMediaId = q.explanation_image_media_id;
    state.reference = q.reference || '';
    state.pdfSource = q.pdf_source || null;
    const subjectId = q.tree.subject.id;
    state.sel = { curriculum: String((state.subjectCurricula.get(subjectId) || [])[0] || ''), subject: String(subjectId), module: String(q.tree.module.id), topic: String(q.topic_id) };
    for (const l of LANGS) {
      const tr = q.translations[l];
      if (tr) state.texts[l] = { text: tr.question_text, expl: tr.explanation_blocks.filter(b => b.type === 'paragraph').map(b => b.text).join('\n\n'), blocks: tr.explanation_blocks, note: tr.note, imageAlt: tr.question_image_alt };
    }
    state.options = q.options.map(o => ({ key: o.option_key, correct: Boolean(o.is_correct), uz: o.translations.uz || '', ru: o.translations.ru || '', en: o.translations.en || '' }));
    renderCascade(); renderEditor(); renderList();
    document.getElementById('qs-difficulty').value = q.difficulty;
    document.getElementById('qs-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch { document.getElementById('qs-search-results').textContent = 'Could not open question. Please try again.'; }
}

// Translate text runs without discarding marks, paragraph/list attributes, or media.
async function translateExplanation(source, target, texts=state.texts) {
  const blocks = structuredClone(texts[source].blocks || []);
  const runs = [];
  const collect = (obj, key) => { if (typeof obj[key] === 'string' && obj[key].trim()) runs.push({obj,key}); };
  for (const block of blocks) {
    if (block.type === 'rich_text') {
      block.delta.ops = block.delta.ops.flatMap(op => typeof op.insert === 'string' ? op.insert.split(/(\n|\u2028)/).filter(Boolean).map(insert=>({...op,insert})) : [op]);
      for (const op of block.delta.ops) collect(op,'insert');
    } else if (block.type === 'paragraph' || block.type === 'heading') collect(block,'text');
    else if (block.type === 'list') block.items.forEach((_,i)=>collect(block.items,i));
    else if (block.type === 'table') block.rows.forEach(row=>row.forEach((_,i)=>collect(row,i)));
    else if (block.type === 'image') { collect(block,'caption'); collect(block,'alt'); }
  }
  if (!runs.length) return;
  // The existing translation endpoint accepts bounded batches.
  for (let i=0; i<runs.length; i+=20) {
    const batch = runs.slice(i,i+20);
    const res = await adminFetch('/api/admin/translate', {method:'POST',body:JSON.stringify({source,target,texts:batch.map(r=>r.obj[r.key])})});
    const data = await res.json();
    if (!res.ok || data.translations?.some(t=>typeof t !== 'string') || data.translations?.length !== batch.length) throw new Error('Translation failed');
    batch.forEach((run,j)=>{ const original = run.obj[run.key]; run.obj[run.key] = (original.match(/^\s*/)?.[0] || '') + data.translations[j].trim() + (original.match(/\s*$/)?.[0] || ''); });
  }
  texts[target].blocks = blocks;
  texts[target].expl = runs.map(r=>r.obj[r.key]).join(' ');
}

function metadataHtml(){
 const c=state.cmsContext,review=state.role==='super_admin'||state.role==='reviewer';
 return '<details class="admin-section"><summary>Source, question type & review status</summary><div class="admin-cascade">'+
 '<div class="form-field"><label for="qs-type">Question type</label><select class="form-input" id="qs-type">'+c.types.map(t=>'<option value="'+esc(t.key)+'">'+esc(t.name)+'</option>').join('')+'</select></div>'+
 '<div class="form-field"><label for="qs-source">Source</label><select class="form-input" id="qs-source"><option value="">Optional</option>'+c.sources.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('')+'</select></div>'+
 '<div class="form-field"><label for="qs-workflow">Review status</label><select class="form-input" id="qs-workflow">'+c.statuses.filter(t=>review||!['approved','published','rejected'].includes(t)).map(t=>'<option value="'+esc(t)+'">'+esc(t.toUpperCase())+'</option>').join('')+'</select></div>'+
 '<div class="form-field"><label for="qs-tags">Tags</label><input class="form-input" id="qs-tags" value="'+esc((state.cms.tags||[]).join(', '))+'"></div></div>'+
 (state.cms.sources||[]).map(s=>'<p class="admin-hint">Retained source: '+esc(s.metadata?.source?.name||'')+' · '+esc(s.source_reference)+'</p>').join('')+'</details>';
}
