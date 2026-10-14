import { muscleControlsHtml, muscleInfoHtml, muscleText } from '../components/muscle-controls.js';
import { muscleRecord, muscleMatches } from '../data/muscular-atlas.js';
import { topicIds } from '../data/anatomy-topic.js';
// Existing Anatomy 3D route. Uses the site's shell and language switcher.
import { t, getLang, langPath, onLangChange } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { skullRecord } from '../data/skull-anatomy.js';
import { ANATOMY_CONTENT, contentFor as baseContentFor } from '../data/anatomy-content.js';
import { ANATOMY_PROVIDER, SYSTEMS, PRESETS, ORGAN_SYSTEMS } from '../data/anatomy-provider.js';
import { ANATOMY_SECTIONS, lname } from '../data/anatomy-dashboard.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx = key => t('atlas.'+key);
const button = (key, symbol='', extra='') => `<button type="button" class="anat3d-ctrl-btn" data-action="${key}" ${extra}>${symbol ? `<span aria-hidden="true">${symbol}</span>` : ''}<span>${esc(tx(key))}</span></button>`;
const readJSON = (key,fallback,store=localStorage) => { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } };

// When the viewer is opened from a dashboard card (?topic=...), the header
// becomes Anatomy › Section › Card with the card's own title and blurb.
function viewerHeaderHtml() {
  const topicId = new URLSearchParams(window.location.search).get('topic');
  const card = topicId && ANATOMY_SECTIONS.flatMap(s => s.cards).find(c => c.id === topicId);
  if (!card) {
    return pageHeaderHtml({breadcrumbKey:'nav.anatomy-3d',titleKey:'anat3d.title',ledeKey:'anat3d.lede',badgeKey:'anat3d.badge'});
  }
  const lang = getLang();
  const section = ANATOMY_SECTIONS.find(s => s.cards.some(c => c.id === card.id));
  const sectionTitle = section ? (t('anat3d.dashboard.sectionTitle.' + section.id) || lname(section.title, lang)) : t('nav.anatomy');
  const title = lname(card.title, lang);
  return (
    '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    '<div class="breadcrumb__inner">' +
    '<a href="' + langPath('') + '" class="breadcrumb__link">' + esc(t('common.breadcrumb.home')) + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<a href="' + langPath('anatomy') + '" class="breadcrumb__link">' + esc(t('nav.anatomy')) + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<span class="breadcrumb__current" aria-current="page">' + esc(title) + '</span>' +
    '</div>' +
    '</nav>' +
    '<header class="page-header">' +
    '<div class="page-header__inner">' +
    '<p class="page-header__eyebrow">' + esc(sectionTitle) + '</p>' +
    '<h1 class="page-header__title">' + esc(title) + '</h1>' +
    (card.blurb ? '<p class="page-header__lede">' + esc(lname(card.blurb, lang)) + '</p>' : '') +
    '</div>' +
    '</header>'
  );
}

export function renderAnatomy3D() {
 return { immersive:true, titleKey:'anat3d.title',descKey:'meta.anatomy-3d',activePage:'anatomy-3d',
 bodyHtml: '<section class="anat3d" id="anatomy-atlas"></section>',init };
}
function init() {
 const root = document.getElementById('anatomy-atlas'); if (!root) return;
 root.classList.toggle('atlas-topic',new URLSearchParams(location.search).has('topic'));
 let infoRequested=false, preserveDissectionCamera=false;
 let viewer, index={}, selected=null, disposed=false, ready=false, busy=0, dialogMode=null, quizAnswer=null;
 let state = readJSON('medpobeda-anatomy-view',null,sessionStorage);
 let saved = new Set([].concat(readJSON('medpobeda-anatomy-saved',[])).filter(id=>typeof id==='string'));
 const abort = new AbortController();
 const contentFor = id => skullRecord(index[id]) || baseContentFor(id);
 const info = id => contentFor(id)?.info[getLang()] || contentFor(id)?.info.en;
 const name = id => {
   const base = info(id)?.n;
   if (!base) return index[id]?.name || id;
   return base + (/_(left|right)$/.test(id) ? ' · '+tx(id.endsWith('_left')?'left':'right') : '');
 };
 const compatibleId = id => index[id] ? id : index[id+'_left'] ? id+'_left' : null;
 const status = text => { const el=root.querySelector('#atlas-status'); if (el) el.textContent=text; };
 const run = async fn => {
   if (!ready) return; busy++;
   try { await fn(); } catch (error) { if (!disposed) { console.error('[Anatomy3D]',error); status(tx('loadError')); } }
   finally { busy--; }
 };
 const muscleButton=(key,extra='')=>`<button type="button" class="anat3d-ctrl-btn" data-action="${key}" ${key==='hideMuscle'?'aria-keyshortcuts="Delete Backspace"':''} ${extra}>${esc(muscleText(key,getLang()))}</button>`;
 function shell() {
   const oldViewer=root.querySelector('#anat3d-viewer');
   root.innerHTML=`<div class="anat3d-layout">
    <details class="anat3d-panel atlas-sidebar" open><summary>${esc(tx('systems'))}</summary>
     <div class="atlas-sidebar-content"><div class="atlas-presets" aria-label="${esc(tx('presets'))}">${PRESETS.map(id=>`<button type="button" class="anat3d-ctrl-btn" data-preset="${id}">${esc(tx(id))}</button>`).join('')}</div>
     <div class="atlas-system-list">${SYSTEMS.map(id=>`<div class="atlas-system" data-system-row="${id}"><label><input type="checkbox" data-system="${id}"><span>${esc(tx(id))}</span></label><label class="atlas-opacity" hidden><span>${esc(tx('opacity'))}</span><input type="range" min="0" max="100" value="100" data-opacity="${id}" aria-label="${esc(tx(id)+' · '+tx('opacity'))}"><output>100%</output></label></div>`).join('')}</div>
     <details class="atlas-saved"><summary>${esc(tx('savedList'))}</summary><div id="atlas-saved-list"></div></details></div>
    </details>
    <div class="anat3d-viewer-wrap">
     <div class="atlas-toolbar"><a class="anat3d-ctrl-btn atlas-back" href="${langPath('anatomy')}" aria-label="${esc(t('nav.anatomy'))}">←</a><div class="anat3d-search"><div class="anat3d-search__box"><input type="search" id="anat3d-search" placeholder="${esc(tx('search'))}" aria-label="${esc(tx('search'))}" autocomplete="off" aria-controls="anat3d-search-results"></div><div class="anat3d-search__results" id="anat3d-search-results" hidden></div></div>${button('reset','↺')}${button('fit','◎')}${button('fullscreen','⛶')}${button('help','?')}</div>
     <div class="atlas-view-angles" aria-label="${esc(tx('rotate'))}">${button('viewFront')}${button('viewBack')}${button('viewLeft')}${button('viewRight')}<button type="button" class="anat3d-ctrl-btn" data-action="viewSuperior">${esc(muscleText('superior',getLang()))}</button><button type="button" class="anat3d-ctrl-btn" data-action="viewInferior">${esc(muscleText('inferior',getLang()))}</button><span id="atlas-count"></span></div><div id="atlas-canvas-slot"></div>
     <div class="atlas-dissection" aria-label="${esc(muscleText('dissection',getLang()))}">${muscleButton('revealAbs')}${muscleButton('undo','disabled')}<details><summary><span>${esc(muscleText('hidden',getLang()))}</span> <span id="atlas-hidden-count">0</span></summary><div id="atlas-hidden-list"></div></details></div><p id="atlas-dissection-note" class="atlas-dissection-note" role="status" hidden></p>
     <div class="anat3d-controls">${button('rotate','↻','aria-pressed="true"')}${button('pan','✥','aria-pressed="false"')}${button('zoomIn','+')}${button('zoomOut','−')}${button('explode','↗','aria-pressed="false"')}${button('restore','↶')}${button('showAll')}</div>
     <p class="atlas-interaction-hint">${esc(tx('interactionHint'))}</p><p id="atlas-status" class="atlas-status" role="status" aria-live="polite"></p>
    </div>
    <aside class="anat3d-panel anat3d-info" id="anat3d-info" aria-label="${esc(tx('description'))}"><div class="anat3d-info__body" id="anat3d-info-content"></div></aside>
   </div>
   <div class="atlas-attribution"><p class="atlas-skull-note">${esc(tx('skullLimit'))}</p><details><summary>${esc(tx('source'))}</summary><p><a href="${ANATOMY_PROVIDER.sourceUrl}" target="_blank" rel="noopener">${esc(ANATOMY_PROVIDER.attribution)}</a> · <a href="${ANATOMY_PROVIDER.licenseUrl}" target="_blank" rel="noopener">CC BY 4.0</a></p><p>Abdominal supplement: <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noopener">Z-Anatomy</a> / BodyParts3D, via BodyExplorer · <a href="/models/ABDOMINAL-LICENSE.txt" target="_blank" rel="noopener">CC BY-SA 4.0 · credits &amp; modifications</a></p><p>${esc(tx('modified'))} <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noopener">human-atlas</a></p></details><p>${esc(tx('disclaimer'))}</p></div>
   <dialog class="atlas-dialog" id="atlas-dialog"><div id="atlas-dialog-content"></div></dialog>`;
   const slot=root.querySelector('#atlas-canvas-slot');
   if (oldViewer) slot.replaceWith(oldViewer);
   else slot.outerHTML=`<div class="anat3d-viewer" id="anat3d-viewer" aria-label="${esc(t('anat3d.title'))}"><div class="anat3d-viewer__notice" id="anat3d-loading"><div class="anat3d-spinner"></div><span>${esc(tx('loading'))}</span><progress max="100" value="0" aria-label="${esc(tx('loading'))}"></progress></div><div class="anat3d-viewer__error" id="anat3d-error" hidden><h3></h3><p></p></div><div class="atlas-hover" hidden></div></div>`;
   root.querySelector('#anat3d-viewer').setAttribute('aria-label',t('anat3d.title'));
   root.querySelector('#anat3d-loading span').textContent=tx('loading');
   root.querySelector('#anat3d-viewer').classList.toggle('atlas-skull-canvas',!!state?.skullMode);
   root.querySelector('#anat3d-loading progress').setAttribute('aria-label',tx('loading'));
   if (matchMedia('(max-width: 900px)').matches) root.querySelector('.atlas-sidebar').open=false;
   mountMuscleControls(); renderInfo(); renderSaved(); sync(state); wire();
   root.querySelectorAll('[data-system],[data-preset],[data-opacity],#anat3d-search').forEach(el=>el.disabled=!ready);
   if (dialogMode) renderDialog();
 }
 function mountMuscleControls() {
   root.querySelector('.muscle-controls')?.remove();
   root.querySelector('.anat3d-layout').insertAdjacentHTML('afterbegin',muscleControlsHtml(index,getLang(),viewer?.topicIds));
   const controls=root.querySelector('.muscle-controls');
   controls.addEventListener('toggle',()=>{root.classList.toggle('muscle-controls-open',controls.open);viewer?.resize();});
   root.classList.remove('muscle-controls-open');
 }
 function sync(next) {
   if (!next) next={systems:['skeletal',...ORGAN_SYSTEMS],opacities:{}};
   state=next;
   root.classList.toggle('atlas-muscular-mode',next.systems.includes('muscular'));
   const filters=next.muscleFilters;
   if(filters){
     root.querySelectorAll('[data-muscle-region]').forEach(el=>el.checked=filters.regions.includes(el.dataset.muscleRegion));
     root.querySelectorAll('[data-muscle-layer]').forEach(el=>el.checked=filters.layers.includes(el.dataset.muscleLayer));
     root.querySelector('[data-muscle-side]').value=filters.side;
     root.querySelector('[data-muscle-context]').checked=filters.context;
     root.querySelector('[data-muscle-quality]').checked=!!viewer?.qualityRenderer;
     root.querySelectorAll('[data-muscle-system]').forEach(el=>el.checked=next.systems.includes(el.dataset.muscleSystem));
     root.querySelectorAll('[data-muscle-visible]').forEach(el=>{el.checked=!next.hiddenIds?.includes(el.dataset.muscleVisible);const record=muscleRecord(el.dataset.muscleVisible,index[el.dataset.muscleVisible]);el.closest('.muscle-structure-row').hidden=!muscleMatches(record,filters);});
   }
   root.classList.toggle('atlas-skull-mode',!!next.skullMode);
   root.querySelectorAll('[data-preset="skull"]').forEach(el=>el.setAttribute('aria-pressed',String(!!next.skullMode)));
   root.querySelector('#atlas-count').textContent=t('atlas.visible',{count:next.visibleCount??0});
   root.querySelectorAll('[data-action="restore"]').forEach(el=>el.disabled=!next.isolatedId&&!next.hiddenIds?.length);
   root.querySelector('[data-action="undo"]').disabled=!next.canUndo;
   const hidden=(next.hiddenIds||[]).filter(id=>index[id]);
   root.querySelector('#atlas-hidden-count').textContent=hidden.length;
   root.querySelector('#atlas-hidden-list').innerHTML=hidden.map(id=>`<div><span>${esc(name(id))}</span><button type="button" data-restore-structure="${esc(id)}">${esc(muscleText('show',getLang()))}</button></div>`).join('');
   root.querySelector('[data-action="revealAbs"]').hidden=!Object.entries(index).some(([id,e])=>/rectus abdominis/i.test(e.name)&&(!viewer?.topicIds||viewer.topicIds.has(id)));
   const obliques=Object.entries(index).filter(([id,e])=>/external oblique|internal oblique/i.test(e.name)&&(!viewer?.topicIds||viewer.topicIds.has(id)));
   const note=root.querySelector('#atlas-dissection-note');note.hidden=obliques.length!==4||!obliques.every(([id])=>hidden.includes(id));note.textContent=muscleText('absNote',getLang());
   root.querySelectorAll('[data-system]').forEach(el=>{
     el.checked=next.systems.includes(el.dataset.system);
     const row=el.closest('.atlas-system'); row.querySelector('.atlas-opacity').hidden=!el.checked;
     const range=row.querySelector('[data-opacity]'); range.value=Math.round((next.opacities[el.dataset.system]??1)*100); range.nextElementSibling.textContent=range.value+'%';
   });
   root.querySelector('[data-action="explode"]').setAttribute('aria-pressed',String(!!next.exploded));
   try { sessionStorage.setItem('medpobeda-anatomy-view',JSON.stringify(next)); } catch {}
 }
 async function locate(id) {
   root.querySelector('#anat3d-search').blur();
   if(matchMedia('(max-width:900px)').matches)root.querySelector('.atlas-sidebar').open=false;
   if (await viewer.focusStructure(id)) { selected=['skull','teeth'].includes(id)?null:id;renderInfo(); }
   else {viewer.selectStructure(null);selected=id;renderInfo();status(tx('unavailable'));}
   root.querySelector('#anat3d-search-results').hidden=true;
 }
 function field(key,value) { return `<div class="anat3d-info__field"><div class="anat3d-info__label">${esc(tx(key))}</div><div class="anat3d-info__value">${esc(value)}</div></div>`; }
 function renderInfo() {
   const el=root.querySelector('#anat3d-info-content'); const panel=el.parentElement;
   const layoutChanged=root.classList.contains('has-selection')!==!!selected || root.classList.contains('info-expanded')!==!!(selected&&infoRequested);
   root.classList.toggle('has-selection',!!selected);
   root.classList.toggle('info-expanded',!!(selected&&infoRequested));
   panel.classList.toggle('is-open',!!selected);
   const preserve=preserveDissectionCamera;
   if(layoutChanged)requestAnimationFrame(()=>{if(!disposed&&viewer?.renderer){viewer.resize();if(preserve)return;if(selected)viewer.focusSelected();else viewer.fitVisible();}});
   if (!selected) { el.innerHTML=`<div class="anat3d-info__empty"><div class="atlas-empty-symbol" aria-hidden="true">◎</div>${esc(tx('select'))}</div>`; return; }
   const content=contentFor(selected), entry=index[selected], i=info(selected);
   if (!entry) return;
   const selectionBadge=entry.system==='muscular'?`<p class="muscle-selection-badge"><span aria-hidden="true"></span>${esc(muscleText('selected',getLang()))}</p>`:'';
   if(!infoRequested){
    el.innerHTML=`${selectionBadge}<div class="atlas-compact-title"><h2 class="anat3d-info__name">${esc(name(selected))}</h2>${button('clear','×')}</div>
     <div class="atlas-info-actions">${button('info','ⓘ')}${button('focus','◎',entry.file?'':'disabled')}${button('isolate','◇',entry.file?'':'disabled')}${entry.system==='muscular'?muscleButton('hideMuscle'):''}</div>`;
    return;
   }
   const muscle=muscleRecord(selected,entry);
   if(muscle){
     el.innerHTML=`${selectionBadge}${button('closeInfo','⌄')}${button('clear','×')}<h2 class="anat3d-info__name">${esc(muscle.name)}</h2><div class="atlas-info-actions">${button('focus','◎')}${button('isolate','◇')}${button('hide','−')}${button('restore','↶')}</div><div class="anat3d-info__grid">${muscleInfoHtml(muscle,getLang())}</div><p class="atlas-review">${esc(tx('review'))}</p><details><summary>${esc(tx('source'))}</summary>${entry.sourceParts.map(p=>esc(p.id+' / '+p.conceptId+' · '+p.name)).join('<br>')}</details>`;
     return;
   }
   if(entry.skull){
     const related=content?.relatedNames?.length?Object.entries(index).filter(([rid,e])=>e.skull && rid!==selected && content.relatedNames.some(name=>name.toLowerCase()===e.name.replace(/^(Left|Right) /,'').toLowerCase())).map(([rid])=>rid):(content?.related||[]).map(compatibleId).filter(Boolean);
     el.innerHTML=`${button('clear','×')}<p class="atlas-selection-caption">${esc(tx('skull'))}</p><h2 class="anat3d-info__name">${esc(name(selected))}</h2>${content?.latinName?`<p class="atlas-latin" lang="la">${esc(content.latinName)}</p>`:''}
      <div class="atlas-info-actions">${button(infoRequested?'closeInfo':'info','ⓘ')}${button('focus','◎')}${button('isolate','◇')}</div>
      ${infoRequested?`<div class="anat3d-info__grid">${field('systems',tx(entry.system))}${field('description',i?.d||tx('notAvailable'))}${field('location',i?.l||tx('notAvailable'))}${field('function',i?.f||tx('notAvailable'))}${field('features',i?.features?.join(' · ')||tx('notAvailable'))}${field('articulations',related.length?related.map(name).join(' · '):tx('notAvailable'))}${field('clinical',i?.clinical||tx('notAvailable'))}
       ${related.length?`<div class="anat3d-info__chips">${related.map(rid=>`<button type="button" class="anat3d-info__chip" data-locate="${rid}">${esc(name(rid))}</button>`).join('')}</div>`:''}
       <p class="atlas-review">${esc(tx('review'))}</p>${content?.referenceUrl?`<a class="atlas-reference" href="${content.referenceUrl}" target="_blank" rel="noopener">${esc(tx('readMore'))}</a>`:''}
       <details class="atlas-source-ids"><summary>${esc(tx('source'))}</summary>${entry.sourceParts.map(p=>esc(p.id+' / '+p.conceptId+' · '+p.name)).join('<br>')}</details></div>`:''}
      <div class="atlas-info-actions">${button('showAll')}${button('resetCamera')}</div>`;
     return;
   }
   el.innerHTML=`${button('closeInfo','⌄')}${button('clear','×')}<h2 class="anat3d-info__name">${esc(name(selected))}</h2>${content?`<p class="atlas-latin" lang="la">${esc(content.latinName)}</p>`:`<p>${esc(tx('sourceName'))}: ${esc(entry.name)}</p>`}<div class="anat3d-info__system">${esc(tx(entry.system))}</div>
    <div class="atlas-info-actions">${button(saved.has(selected)?'saved':'save','♡')}${button('isolate','◎',entry.file?'':'disabled')}${button('hide','−',entry.file?'':'disabled')}</div>
    ${!entry.file?`<p class="atlas-review">${esc(tx('unavailable'))}</p>`:''}<div class="anat3d-info__grid">${content ? field('region',tx(content.region))+field('description',i.d)+field('function',i.f)+field('location',i.l) : `<p>${esc(tx('missing'))}</p>`}
    ${content?.related?.length?`<div>${field('related','')}<div class="anat3d-info__chips">${content.related.map(compatibleId).filter(Boolean).map(id=>`<button type="button" class="anat3d-info__chip" data-locate="${id}">${esc(name(id))}</button>`).join('')}</div></div>`:''}</div>
    <div class="atlas-info-actions">${button('lesson','',content?'':'disabled')}${button('mcq','',content?'':'disabled')}</div>
    <p class="atlas-review">${esc(tx('review'))}</p><details class="atlas-source-ids"><summary>${esc(tx('source'))}</summary><p>BodyParts3D 4.0 · ${esc(selected)}</p><p>${entry.sourceParts.map(p=>esc(p.id+' / '+p.conceptId)).join(', ')}</p></details>`;
 }
 function renderSaved() {
   root.querySelector('#atlas-saved-list').innerHTML=[...saved].filter(id=>index[id]).map(id=>`<button type="button" class="anat3d-info__chip" data-locate="${esc(id)}">${esc(name(id))}</button>`).join('') || `<p>${esc(tx('empty'))}</p>`;
 }
 const normalize=s=>s.toLocaleLowerCase().normalize('NFKC').replace(/[’‘ʻʼ`']/g,"'");
 function search() {
   const q=normalize(root.querySelector('#anat3d-search').value.trim()); const results=root.querySelector('#anat3d-search-results');
   results.hidden=!q; if (!q) return;
   const matches=Object.entries(index).filter(([id])=>!viewer?.topicIds || viewer.topicIds.has(id)).filter(([id,e])=>!state?.skullMode || e.skull || ['skull','teeth'].includes(id)).map(([id,e])=>{
     const c=contentFor(id);
     const names=[id,e.name,...(muscleRecord(id,e)?.aliases||[]),...(c?.aliases||[]),c?.latinName,...Object.values(c?.info||{}).map(i=>i.n)].filter(Boolean).map(normalize);
     const source=normalize(e.sourceParts.flatMap(p=>[p.id,p.conceptId,p.name]).join(' '));
     const score=names.some(n=>n===q)?4:names.some(n=>n.startsWith(q))?3:names.some(n=>n.includes(q))?2:source.includes(q)?1:0;
     return {id,e,score};
   }).filter(m=>m.score).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id)).slice(0,30).map(m=>[m.id,m.e]);
   results.innerHTML=matches.length?matches.map(([id,e])=>`<button type="button" class="anat3d-search__item" data-locate="${id}"><span>${esc(name(id))}</span><span class="anat3d-search__tag">${esc(tx(e.system))}</span></button>`).join(''):`<p class="anat3d-search__empty">${esc(tx('empty'))}</p>`;
 }
 function renderDialog() {
   const dialog=root.querySelector('#atlas-dialog'), body=root.querySelector('#atlas-dialog-content');
   let html=`<button type="button" class="anat3d-ctrl-btn" data-action="closeDialog">× ${esc(tx('close'))}</button>`;
   if (dialogMode==='help') html+=`<h2>${esc(tx('help'))}</h2><p>${esc(tx('helpText'))}</p>`;
   else if (selected && contentFor(selected)) {
     const c=contentFor(selected), i=info(selected);
     html+=`<h2>${esc(tx(dialogMode))} · ${esc(name(selected))}</h2>`;
     if (dialogMode==='lesson') html+=`<p lang="la">${esc(c.latinName)}</p><div class="anat3d-info__grid">${field('description',i.d)}${field('function',i.f)}${field('location',i.l)}</div><p><a href="${c.referenceUrl}" target="_blank" rel="noopener">${esc(tx('readMore'))}</a></p>${button('mcq')}`;
     else {
       const choices=[c,...ANATOMY_CONTENT.filter(s=>s.id!==c.id && s.system===c.system),...ANATOMY_CONTENT.filter(s=>s.system!==c.system)].slice(0,4).sort((a,b)=>a.id.localeCompare(b.id));
       html+=`<h3>${esc(tx('identify'))}</h3><p>${esc(i.f)}</p>${choices.map(choice=>`<button type="button" class="anat3d-quiz__opt ${quizAnswer?choice.id===c.id?'is-correct':choice.id===quizAnswer?'is-wrong':'':''}" data-answer="${choice.id}" ${quizAnswer?'disabled':''}>${esc(choice.info[getLang()].n)}</button>`).join('')}`;
       if (quizAnswer) html+=`<p role="status">${esc(tx(quizAnswer===c.id?'correct':'incorrect'))}: <strong>${esc(i.n)}</strong>. ${esc(i.d)}</p>`;
     }
     html+=`<p class="atlas-review">${esc(tx('review'))}</p>`;
   }
   body.innerHTML=html; if (!dialog.open) dialog.showModal();
 }
 function wire() {
   root.querySelector('#anat3d-search').addEventListener('input',search);
   root.querySelector('#anat3d-search').addEventListener('keydown',e=>{
     const result=root.querySelector('#anat3d-search-results');
     if (e.key==='Escape') result.hidden=true;
     if (e.key==='ArrowDown') { e.preventDefault(); result.querySelector('button')?.focus(); }
     if (e.key==='Enter' && !result.hidden) { const id=result.querySelector('[data-locate]')?.dataset.locate; if(id) run(()=>locate(id)); }
   });
   root.querySelector('#atlas-dialog').addEventListener('close',()=>{dialogMode=null;quizAnswer=null;});
 }
 async function action(key) {
   if(key==='info'||key==='closeInfo'){infoRequested=key==='info';renderInfo();return;}
   if(key==='clear'){infoRequested=false;selected=null;viewer?.selectStructure(null);renderInfo();return;}
   if(key==='help') {dialogMode='help';renderDialog();return;}
   if(key==='closeDialog') {root.querySelector('#atlas-dialog').close();return;}
   if(key==='close') {selected=null;viewer?.selectStructure(null);renderInfo();return;}
   if(key==='fullscreen') {
     if(document.fullscreenElement) await document.exitFullscreen();
     else if(root.requestFullscreen) await root.requestFullscreen();
     else root.classList.toggle('atlas-expanded');
     return;
   }
   if(key==='save'||key==='saved') {
     const next=new Set(saved); if(next.has(selected))next.delete(selected);else next.add(selected);
     try {localStorage.setItem('medpobeda-anatomy-saved',JSON.stringify([...next]));saved=next;renderInfo();renderSaved();} catch {status(tx('storageError'));} return;
   }
   if(key==='lesson'||key==='mcq') {dialogMode=key;quizAnswer=null;renderDialog();return;}
   if(!ready)return;
   if(key==='reset') {viewer.resetView();root.querySelectorAll('[data-action="rotate"],[data-action="pan"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action==='rotate')));}
   if(key==='showAll') {await viewer.setPreset(viewer.skullMode?'skull':'all');}
   if(key==='focus')viewer.focusSelected();
   if(key==='resetCamera')viewer.resetCamera();
   if(key==='isolate')viewer.isolateSelected();
   if(key==='hide'||key==='hideMuscle'||key==='undo'||key==='revealAbs'){
     preserveDissectionCamera=true;
     if(key==='undo')viewer.undoDissection();else if(key==='revealAbs'){
       viewer.revealAbdominals();const note=root.querySelector('#atlas-dissection-note');note.textContent=muscleText('absNote',getLang());note.hidden=false;
     }else viewer.hideSelected();
     preserveDissectionCamera=false;
   }
   if(key==='restore')viewer.restoreContext();
   if(key==='fit')viewer.fitVisible();
   if(key.startsWith('view'))viewer.setView(key.slice(4).toLowerCase());
   if(key==='explode')viewer.toggleExplode();
   if(key==='zoomIn')viewer.zoom(.8); if(key==='zoomOut')viewer.zoom(1.25);
   if(key==='pan'||key==='rotate') {viewer.setControlMode(key);root.querySelectorAll('[data-action="rotate"],[data-action="pan"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===key)));}
 }
 shell();
 root.addEventListener('click',e=>{
   const el=e.target.closest('button'); if(!el)return;
   if(el.dataset.action) {Promise.resolve(action(el.dataset.action)).catch(()=>status(tx('loadError')));return;}
   if(el.dataset.preset){if(matchMedia('(max-width:900px)').matches)root.querySelector('.atlas-sidebar').open=false;run(()=>viewer.setPreset(el.dataset.preset));}
   if(el.dataset.restoreStructure){preserveDissectionCamera=true;viewer?.showStructure(el.dataset.restoreStructure,true);preserveDissectionCamera=false;return;}
   if(el.dataset.locate)run(()=>locate(el.dataset.locate));
   if(el.dataset.answer) {quizAnswer=el.dataset.answer;renderDialog();}
 },{signal:abort.signal});
 root.addEventListener('change',e=>{
   const el=e.target,d=el.dataset;
   if(!ready)return;
   if(d.muscleRegion||d.muscleLayer){const key=d.muscleRegion?'regions':'layers',value=d.muscleRegion||d.muscleLayer;const values=new Set(viewer.muscleFilters[key]);if(el.checked)values.add(value);else values.delete(value);viewer.setMuscleFilters({[key]:[...values]});}
   if('muscleQuality' in d)run(()=>viewer.setDetailedLighting(el.checked));
   if('muscleSide' in d)viewer.setMuscleFilters({side:el.value});
   if('muscleContext' in d)viewer.setMuscleFilters({context:el.checked});
   if(d.muscleVisible){preserveDissectionCamera=true;viewer.showStructure(d.muscleVisible,el.checked);preserveDissectionCamera=false;}
   if(d.muscleSystem)run(()=>viewer.setSystemEnabled(d.muscleSystem,el.checked));
   if(e.target.dataset.system)run(()=>viewer.setSystemEnabled(e.target.dataset.system,e.target.checked));},{signal:abort.signal});
 root.addEventListener('keydown',e=>{
   if(!ready||!viewer.enabledSystems.has('muscular')||e.target.closest('input,textarea,select,[contenteditable="true"]')||e.altKey)return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey&&viewer.dissectionHistory.length){e.preventDefault();action('undo');}
   else if((e.key==='Delete'||e.key==='Backspace')&&!e.ctrlKey&&!e.metaKey&&viewer.selectedId){e.preventDefault();action('hideMuscle');}
 },{signal:abort.signal});
 root.addEventListener('input',e=>{if(e.target.dataset.opacity && ready)viewer.setOpacity(e.target.dataset.opacity,Number(e.target.value)/100);},{signal:abort.signal});
 document.addEventListener('click',e=>{if(!e.target.closest('.anat3d-search'))root.querySelector('#anat3d-search-results').hidden=true;},{signal:abort.signal});
 const unsubscribe=onLangChange(()=>{
   // Keep the live canvas and selection when the site emits its language event.
   shell();
   if(viewer){Object.assign(viewer.dom,{webglTitle:t('anat3d.viewer.failed'),webglMsg:t('anat3d.viewer.failed2'),modelTitle:tx('loadError'),modelMsg:tx('loadError'),retryLabel:t('anat3d.viewer.webgl.retry'),detailsLabel:t('anat3d.viewer.webgl.details'),contextLostTitle:t('anat3d.viewer.contextlost'),contextLostMsg:t('anat3d.viewer.contextlost2'),webglTips:t('anat3d.viewer.webgl.tips'),vscodeTip:t('anat3d.viewer.env.vscode')});
    if(!viewer.dom.error.hidden){if(viewer._state.context==='lost')viewer.showContextLost();else if(viewer._state.renderer==='failed')viewer.showWebGLError();else viewer.showModelError();}
    if(viewer.renderer)viewer.resize();
   }
 });
 window.__anatomyViewerDispose=()=>{
   if(disposed)return;disposed=true;unsubscribe();abort.abort();viewer?.dispose();
   root.querySelector('#atlas-dialog')?.close(); window.__anatomyViewerDispose=null;
 };
 import('../three/anatomy-viewer.js').then(({default:Viewer})=>{
   if(disposed||!root.isConnected)return;
   const restored=state;
   viewer=new Viewer(root.querySelector('#anat3d-viewer'),{
     dom:{ loading:root.querySelector('#anat3d-loading'),error:root.querySelector('#anat3d-error'),webglTitle:t('anat3d.viewer.failed'),webglMsg:t('anat3d.viewer.failed2'),modelTitle:tx('loadError'),modelMsg:tx('loadError'),retryLabel:t('anat3d.viewer.webgl.retry'),detailsLabel:t('anat3d.viewer.webgl.details'),contextLostTitle:t('anat3d.viewer.contextlost'),contextLostMsg:t('anat3d.viewer.contextlost2'),webglTips:t('anat3d.viewer.webgl.tips'),vscodeTip:t('anat3d.viewer.env.vscode') },
     onIndex:data=>{index={...data};for(const c of ANATOMY_CONTENT){if(!index[c.id]&&!index[c.id+'_left'])index[c.id]={name:c.info.en.n,system:c.system,file:null,sourceParts:[],availability:'missing'};}mountMuscleControls();renderSaved();},
     onSelect:id=>{if(id!==selected)infoRequested=false;selected=id;renderInfo();
       if(id && !document.body.classList.contains('anatomy-app') && matchMedia('(max-width:900px)').matches)requestAnimationFrame(()=>{
         if(disposed)return;
         const canvasBox=root.querySelector('#anat3d-viewer').getBoundingClientRect();
         window.scrollTo({top:window.scrollY+canvasBox.top-84,behavior:'instant'});
         if(!index[id]?.skull && viewer?.structureMeshes.has(id))viewer.fitMeshes(viewer.structureMeshes.get(id));
       });
     },onState:sync,
     onHover:(id,e)=>{const tip=root.querySelector('.atlas-hover');tip.hidden=!id;if(id){tip.textContent=name(id);const rect=viewer.container.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(rect.width-180,e.clientX-rect.left+12))+'px';tip.style.top=Math.max(8,e.clientY-rect.top-36)+'px';}},
     onProgress:percent=>{if(disposed)return;status(percent===100?'':tx('loading')+(percent===null?'…':' · '+percent+'%'));const progress=root.querySelector('progress');if(percent===null)progress.removeAttribute('value');else progress.value=percent;},
     onReady:async()=>{
       ready=true;root.querySelectorAll('[data-system],[data-preset],[data-opacity],#anat3d-search').forEach(el=>el.disabled=false);
       if(restored && !new URLSearchParams(location.search).has('topic')){
         try{viewer.skullMode=!!restored.skullMode;viewer.enabledSystems=new Set(restored.systems.filter(s=>SYSTEMS.includes(s)));viewer.opacities=restored.opacities;viewer.hiddenStructures=new Set(restored.hiddenIds||[]);viewer.region=restored.region;if(restored.muscleFilters)viewer.muscleFilters=restored.muscleFilters;await viewer.ensureSystems([...viewer.enabledSystems]);if(disposed)return;viewer.applyVisibility();
          if(restored.selectedId && index[restored.selectedId]){if(index[restored.selectedId].file)await viewer.loadFile(index[restored.selectedId].file);if(disposed)return;viewer.selectStructure(restored.selectedId);}
          viewer.isolatedId=restored.isolatedId;viewer.explodeTarget=restored.exploded?1:0;viewer.applyVisibility();if(!viewer.explodeTarget)viewer.fitVisible();
         }catch{status(tx('loadError'));}
       }
       // Handle topic parameter from the dashboard: preset → region → system → focus
       const topicParams = new URLSearchParams(window.location.search);
       const topicId = topicParams.get('topic');
       if (topicId) {
         import('../data/anatomy-dashboard.js').then(async ({ getCard }) => {
           if (disposed) return;
           const card = getCard(topicId);
           if (!card || card.status !== 'available') return;
           viewer.topicIds=topicIds(card,index);
           viewer.topicSystem=card.system;
           viewer.topicContextSystems=card.id==='muscles-all'?['skeletal','skin']:[];
           mountMuscleControls();
           viewer.explodeTarget=0;viewer.opacities={};
           // Deep-links are deterministic: drop any restored isolation/hidden state.
           viewer.skullMode = false;
           viewer.isolatedId = null;
           viewer.hiddenStructures.clear();
           viewer.selectStructure(null);
           if (card.preset === 'skull') {
             await viewer.setPreset('skull');
             return;
           }
           viewer.region = null;
           if (card.system && SYSTEMS.includes(card.system)) {
             viewer.enabledSystems = new Set([card.system]);
           }
           viewer.applyVisibility();
           await viewer.ensureSystems([...viewer.enabledSystems]);
           if (disposed) return;
           if (card.file) await viewer.loadFile(card.file);
           if (disposed) return;
           viewer.applyVisibility();
           if (card.modelId && index[card.modelId]) {
             viewer.selectStructure(card.modelId);
             viewer.fitMeshes(viewer.structureMeshes.get(card.modelId));
           } else if (!viewer.explodeTarget) {
             viewer.fitVisible();
           }
         }).catch(error => {console.error('[Anatomy3D] topic load failed',error);status(tx('loadError'));});
       }
     },
     onRetry:()=>{window.__anatomyViewerDispose?.();init();},
   });
   // Only exposed when explicitly requested for local browser regression checks.
   if(import.meta.env.DEV && new URLSearchParams(location.search).has('debug'))root.__viewer=viewer;
 }).catch(error=>{if(!disposed){status(tx('loadError'));root.querySelector('#anat3d-loading').hidden=true;console.error(error);}});
}
