import {adminPage,adminFetch,requireAdmin} from '../admin/shell.js';
import '../styles/admin-pdf-import.css';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const option=(id,label)=>'<option value="'+esc(id)+'">'+esc(label)+'</option>';
const select=(id,label)=>'<label class="form-field">'+label+'<select class="form-input" id="'+id+'"></select></label>';
const btn=(action,id,label,disabled=false)=>'<button type="button" class="btn" data-action="'+action+'" data-id="'+id+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
export function renderAdminPdfImport() {
  return adminPage('pdf-import',`<div id="pdf-import-page">
    <div class="admin-topbar"><h1>PDF Qbank Import</h1><button class="btn" id="pi-taxonomy-toggle">Taxonomy Manager</button></div>
    <p class="admin-hint">Extract into a review workspace. Only selected, approved questions enter Qbank as drafts.</p>
    <div id="pi-message" role="status" aria-live="polite"></div>
    <form id="pi-upload" class="pi-fields">
      ${select('pi-subject','Subject')}${select('pi-lang','PDF language')}
      <label class="form-field">PDF files<input class="form-input" id="pi-files" type="file" accept="application/pdf,.pdf" multiple required></label>
      <button class="btn btn--primary" type="submit">+ Upload PDF(s)</button><button class="btn" type="button" id="pi-new-subject">+ Create New Subject</button>
    </form><p class="admin-hint" id="pi-config"></p>
    <section id="pi-taxonomy" hidden><h2 class="admin-section-title">Taxonomy Manager</h2>
      <p class="admin-hint">Uses existing Subjects → Modules (Topics) → Topics (Sub-topics). Existing learning routes stay the same.</p>
      <form id="pi-tax-form" class="pi-fields">${select('pi-tax-kind','Level')}${select('pi-tax-parent','Parent')}${select('pi-tax-existing','Create / edit')}
      <label class="form-field">Name (Uzbek)<input class="form-input" id="pi-tax-name" required maxlength="200"></label>
      <button class="btn" type="submit">Save taxonomy</button></form><div id="pi-tax-tree"></div>
    </section>
    <h2 class="admin-section-title">PDF files</h2><div id="pi-jobs" class="pi-table-wrap">Loading…</div>
    <section><h2 class="admin-section-title">Extracted questions</h2>
    <form id="pi-filters" class="pi-fields">${select('pi-filter-pdf','PDF Source')}${select('pi-filter-mode','Run')}${select('pi-filter-subject','Subject')}${select('pi-filter-module','Topic')}${select('pi-filter-topic','Sub-topic')}${select('pi-filter-status','Classification')}${select('pi-filter-extraction','Extraction')}
      <button class="btn" type="submit">Apply filters</button></form>
    <div class="pi-fields"><label><input type="checkbox" id="pi-select-all"> Select all on this page</label><span id="pi-selection">0 selected</span>
      <button class="btn" id="pi-prev">Previous</button><span id="pi-pagination"></span><button class="btn" id="pi-next">Next</button></div>
    <div id="pi-questions" class="pi-table-wrap"></div>
    <div class="pi-fields pi-bulk">${select('pi-bulk-module','Assign Topic')}${select('pi-bulk-topic','Assign Sub-topic')}
      <label class="form-field">Review note<input class="form-input" id="pi-bulk-note" placeholder="How warnings were checked against the source"></label>
      <button class="btn" id="pi-bulk-assign">Bulk assign</button><button class="btn" id="pi-bulk-approve">Approve selected</button><button class="btn" id="pi-bulk-review">Needs review</button>
      <button class="btn btn--primary" id="pi-add">Add Selected to Qbank</button></div>
    </section><section id="pi-review" hidden></section></div>`,()=>init());
}
async function init() {
  const root=document.getElementById('pdf-import-page');if(!await requireAdmin())return;
  let ctx,jobs=[],rows=[],total=0,offset=0,selected=new Set(),review=null,busy=false,jobInputs=new Map();
  const el=id=>root.querySelector('#'+id);
  const message=(text,ok=false)=>{el('pi-message').className='admin-msg '+(ok?'admin-msg--ok':'admin-msg--err');el('pi-message').textContent=text;};
  async function request(path,method='GET',body) {
    const res=await adminFetch('/api/admin/pdf-import'+path,{method,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed. Please try again.');return data;
  }
  async function perform(fn){if(busy)return;busy=true;try{await fn();}catch(e){message(e.message||'Request failed.');}finally{busy=false;}}
  function fill(id,list,placeholder='— select —'){const node=el(id),old=node.value;node.innerHTML=option('',placeholder)+list.map(x=>option(x.id,x.name||x.filename)).join('');node.value=old;}
  function modules(subject){return ctx.modules.filter(m=>!subject||String(m.subject_id)===String(subject));}
  function topics(module){return ctx.topics.filter(t=>!module||String(t.module_id)===String(module));}
  async function context(){ctx=await request('/context');fill('pi-subject',ctx.subjects);fill('pi-filter-subject',ctx.subjects,'All subjects');el('pi-lang').innerHTML=option('uz','Uzbek')+option('en','English')+option('ru','Russian');
    el('pi-config').textContent=`Up to 10 PDFs, ${ctx.max_upload_mb} MB each. Local Ollama: ${ctx.classifier.model||'not configured — manual classification remains available'}. AI confidence is a suggestion, not a calibrated probability.`;
    taxonomyForm();filterTaxonomy();}
  function filterTaxonomy(){fill('pi-filter-module',modules(el('pi-filter-subject').value),'All Topics');fill('pi-filter-topic',topics(el('pi-filter-module').value),'All Sub-topics');fill('pi-bulk-module',modules(el('pi-filter-subject').value));fill('pi-bulk-topic',topics(el('pi-bulk-module').value));}
  function taxonomyForm(){const kind=el('pi-tax-kind').value||'subjects';fill('pi-tax-parent',kind==='modules'?ctx.subjects:kind==='topics'?ctx.modules:[]);el('pi-tax-parent').disabled=kind==='subjects';fill('pi-tax-existing',ctx[kind]||[],'+ Create new');
    el('pi-tax-tree').innerHTML=ctx.subjects.map(s=>'<details><summary>'+esc(s.name)+'</summary>'+modules(s.id).map(m=>'<p>'+esc(m.name)+': '+topics(m.id).map(t=>esc(t.name)).join(', ')+'</p>').join('')+'</details>').join('');}
  el('pi-tax-kind').innerHTML=option('subjects','Subject')+option('modules','Topic (Module)')+option('topics','Sub-topic');
  el('pi-tax-kind').onchange=taxonomyForm;
  el('pi-tax-existing').onchange=()=>{const kind=el('pi-tax-kind').value,item=ctx[kind].find(x=>String(x.id)===el('pi-tax-existing').value);el('pi-tax-name').value=item?.name||'';el('pi-tax-parent').value=item?.subject_id||item?.module_id||'';};
  el('pi-tax-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const kind=el('pi-tax-kind').value,id=el('pi-tax-existing').value,name=el('pi-tax-name').value.trim();let payload={translations:{uz:{name}}};
    if(id){const r=await adminFetch('/api/admin/content/'+kind+'/'+id);if(!r.ok)throw new Error('Could not load taxonomy item.');const original=await r.json();payload={...original,translations:{...original.translations,uz:{...original.translations?.uz,name}}};}
    if(kind!=='subjects')payload[kind==='modules'?'subject_id':'module_id']=Number(el('pi-tax-parent').value);
    const res=await adminFetch('/api/admin/content/'+kind+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)throw new Error(result.error||'Could not save taxonomy.');await context();message('Taxonomy saved.',true);});};
  el('pi-taxonomy-toggle').onclick=()=>{el('pi-taxonomy').hidden=!el('pi-taxonomy').hidden;};
  el('pi-new-subject').onclick=()=>{el('pi-taxonomy').hidden=false;el('pi-tax-kind').value='subjects';taxonomyForm();el('pi-tax-existing').value='';el('pi-tax-name').value='';el('pi-tax-name').focus();};
  el('pi-upload').onsubmit=e=>{e.preventDefault();perform(async()=>{const files=el('pi-files').files;if(!el('pi-subject').value)throw new Error('Select the subject explicitly.');if(files.length>10)throw new Error('Upload up to 10 PDFs at a time.');const form=new FormData();form.append('subject_id',el('pi-subject').value);form.append('lang',el('pi-lang').value);
    for(const file of files){if(file.size>ctx.max_upload_mb*1024*1024)throw new Error('PDF exceeds the upload size limit.');form.append('files',file);}message('Uploading and checking PDFs…',true);await request('/upload','POST',form);el('pi-files').value='';await loadJobs();message('Uploaded. Run a sample before enabling full processing.',true);});};
  async function loadJobs(){if(!root.isConnected)return;el('pi-jobs').querySelectorAll('input').forEach(i=>jobInputs.set(i.dataset.start?'start'+i.dataset.start:i.dataset.end?'end'+i.dataset.end:'confirm'+i.dataset.confirm,i.type==='checkbox'?i.checked:i.value));jobs=(await request('/')).rows;fill('pi-filter-pdf',jobs,'All PDFs');
    el('pi-jobs').innerHTML=jobs.length?'<table class="admin-table"><thead><tr><th>File / Subject</th><th>Pages</th><th>Status</th><th>Questions</th><th>Classified</th><th>Needs review</th><th>Actions</th></tr></thead><tbody>'+jobs.map(j=>{
      const working=j.status==='processing'||j.queued||j.classification_running;
      return '<tr><td>'+esc(j.filename)+'<br><small>'+esc(ctx.subjects.find(s=>s.id===j.subject_id)?.name)+' · '+esc(j.lang)+'</small></td><td>'+j.pages_processed+' / '+j.page_count+'<br><small>'+j.images_found+' images</small></td><td>'+esc(j.queued?'queued':j.classification_running?'classifying':j.status)+'<br><small>'+esc(j.mode)+'</small>'+(j.error?'<p class="pi-error">'+esc(j.error)+'</p>':'')+'</td><td>'+j.questions_found+'</td><td>'+j.classified+' / '+j.questions_found+'<br><small>'+j.approved+' approved</small></td><td>'+j.needing_review+'</td><td><div class="pi-job-actions">'+
        '<label>Sample from <input type="number" min="1" max="'+j.page_count+'" data-start="'+j.id+'" value="'+j.start_page+'"></label><label>to <input type="number" min="1" max="'+j.page_count+'" data-end="'+j.id+'" value="'+(j.end_page||Math.min(j.page_count,12))+'"></label>'+btn('sample',j.id,'Run sample / Resume',working)+btn('review',j.id,'Review')+
        '<label><input type="checkbox" data-confirm="'+j.id+'"> I checked the sample against the source</label>'+btn('approve-sample',j.id,'Approve sample',working||j.mode!=='sample'||!j.questions_found)+btn('full',j.id,'Run full / Resume',working||!j.sample_approved)+btn('pause',j.id,'Pause',!working)+btn('classify',j.id,'Retry AI classification',working)+
        '<a href="/api/admin/pdf-import/'+j.id+'/source" target="_blank">Source PDF</a> '+['questions.json','extraction_report.json','errors.json'].map(name=>'<a href="/api/admin/pdf-import/'+j.id+'/artifacts/'+name+'" target="_blank">'+name+'</a>').join(' ')+'</div></td></tr>';}).join('')+'</tbody></table>':'<p class="admin-empty">No PDFs uploaded yet.</p>';
    el('pi-jobs').querySelectorAll('input').forEach(i=>{const k=i.dataset.start?'start'+i.dataset.start:i.dataset.end?'end'+i.dataset.end:'confirm'+i.dataset.confirm;if(jobInputs.has(k)){if(i.type==='checkbox')i.checked=jobInputs.get(k);else i.value=jobInputs.get(k);}});
    el('pi-jobs').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>perform(async()=>{const id=Number(b.dataset.id),action=b.dataset.action,j=jobs.find(j=>j.id===id);
      if(action==='review'){el('pi-filter-pdf').value=id;el('pi-filter-mode').value=j.mode;offset=0;selected.clear();await loadQuestions();return;}
      if(action==='sample'||action==='full')await request('/'+id+'/run','POST',{mode:action==='sample'?'sample':'full',start_page:Number(root.querySelector('[data-start="'+id+'"]').value),end_page:Number(root.querySelector('[data-end="'+id+'"]').value)});
      else if(action==='approve-sample')await request('/'+id+'/approve-sample','POST',{confirmed:root.querySelector('[data-confirm="'+id+'"]').checked});
      else await request('/'+id+'/'+action,'POST',{});
      await loadJobs();message('Action saved.',true);
    }));
  }
  function params(){const p=new URLSearchParams({offset:String(offset),imported:'no'});for(const [id,key]of [['pdf','import_id'],['mode','mode'],['subject','subject_id'],['module','module_id'],['topic','topic_id'],['status','classification_status'],['extraction','extraction_status']]){const v=el('pi-filter-'+id).value;if(v)p.set(key,v);}return p;}
  function selection(){el('pi-selection').textContent=selected.size+' selected';el('pi-select-all').checked=rows.length>0&&rows.every(r=>selected.has(r.id));}
  async function loadQuestions(){const data=await request('/questions?'+params());rows=data.rows;total=data.total;
    el('pi-pagination').textContent=total?`${offset+1}–${Math.min(offset+50,total)} of ${total}`:'0 questions';el('pi-prev').disabled=offset===0;el('pi-next').disabled=offset+50>=total;
    el('pi-questions').innerHTML=rows.length?'<table class="admin-table"><thead><tr><th>Select</th><th>Question</th><th>Taxonomy</th><th>Extraction / classification</th><th>Review</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><input type="checkbox" aria-label="Select '+esc(r.extraction_key)+'" data-select="'+r.id+'"'+(selected.has(r.id)?' checked':'')+'></td><td><strong>'+esc(r.extraction_key)+'</strong> · #'+esc(r.source_number)+'<p>'+esc(r.data.question_text.slice(0,200))+'</p></td><td>'+esc(ctx.modules.find(m=>m.id===r.module_id)?.name||'Unassigned')+'<br>'+esc(ctx.topics.find(t=>t.id===r.topic_id)?.name||'Unassigned')+'</td><td>'+esc(r.extraction_status)+' / '+esc(r.classification_status)+'</td><td>'+btn('open',r.id,'Review')+'</td></tr>').join('')+'</tbody></table>':'<p class="admin-empty">No matching extracted questions.</p>';
    el('pi-questions').querySelectorAll('[data-select]').forEach(c=>c.onchange=()=>{c.checked?selected.add(Number(c.dataset.select)):selected.delete(Number(c.dataset.select));selection();});
    el('pi-questions').querySelectorAll('[data-action="open"]').forEach(b=>b.onclick=()=>perform(()=>openReview(Number(b.dataset.id))));selection();}
  el('pi-filter-mode').innerHTML=option('full','Full run')+option('sample','Sample');
  el('pi-filter-status').innerHTML=option('','All')+['needs_review','suggested','approved'].map(s=>option(s,s.replace('_',' '))).join('');
  el('pi-filter-extraction').innerHTML=option('','All')+['complete','needs_review','failed'].map(s=>option(s,s)).join('');
  el('pi-filter-subject').onchange=()=>{el('pi-filter-module').value='';el('pi-filter-topic').value='';filterTaxonomy();};el('pi-filter-module').onchange=()=>fill('pi-filter-topic',topics(el('pi-filter-module').value),'All Sub-topics');
  el('pi-bulk-module').onchange=()=>fill('pi-bulk-topic',topics(el('pi-bulk-module').value));
  el('pi-filters').onsubmit=e=>{e.preventDefault();offset=0;selected.clear();perform(loadQuestions);};
  el('pi-prev').onclick=()=>{offset=Math.max(0,offset-50);perform(loadQuestions);};el('pi-next').onclick=()=>{offset+=50;perform(loadQuestions);};
  el('pi-select-all').onchange=e=>{rows.forEach(r=>e.target.checked?selected.add(r.id):selected.delete(r.id));el('pi-questions').querySelectorAll('[data-select]').forEach(c=>c.checked=selected.has(Number(c.dataset.select)));selection();};
  for(const action of ['assign','approve','review'])el('pi-bulk-'+action).onclick=()=>perform(async()=>{const payload={ids:[...selected],action:action==='review'?'needs_review':action,review_note:el('pi-bulk-note').value};if(action==='assign'){const m=ctx.modules.find(m=>String(m.id)===el('pi-bulk-module').value);if(!m||!el('pi-bulk-topic').value)throw new Error('Choose both a Topic and Sub-topic.');Object.assign(payload,{subject_id:m.subject_id,module_id:m.id,topic_id:Number(el('pi-bulk-topic').value)});}await request('/bulk','POST',payload);await loadQuestions();await loadJobs();message('Selected questions updated.',true);});
  el('pi-add').onclick=()=>perform(async()=>{const result=await request('/add-to-qbank','POST',{ids:[...selected]});selected.clear();await loadQuestions();message(result.rows.length+' questions added as Qbank drafts. Publish them through the existing Questions workflow.',true);});
  async function openReview(id){review=await request('/questions/'+id);const r=review,q=r.data,host=el('pi-review');host.hidden=false;
    host.innerHTML='<h2 class="admin-section-title">Review '+esc(r.extraction_key)+'</h2><p>'+esc(r.pdf)+' · source question '+esc(r.source_number)+'</p><div class="pi-review-grid"><form id="pi-review-form">'+
      '<label class="form-field">Question<textarea class="form-input" id="pi-r-text" rows="4">'+esc(q.question_text)+'</textarea></label><label class="form-field">Options (one per line: A. text)<textarea class="form-input" id="pi-r-options" rows="6">'+esc(q.options.map(o=>o.key+'. '+o.text).join('\n'))+'</textarea></label><label class="form-field">Correct answer<input class="form-input" id="pi-r-answer" maxlength="1" value="'+esc(q.correct_answer||'')+'"></label>'+
      '<label class="form-field">Explanation<textarea class="form-input" id="pi-r-expl" rows="8">'+esc(q.explanation)+'</textarea></label><label class="form-field">Reference / Source<input class="form-input" id="pi-r-reference" value="'+esc(q.reference||r.pdf)+'"></label>'+
      '<div class="pi-fields">'+select('pi-r-subject','Subject')+select('pi-r-module','Topic')+select('pi-r-topic','Sub-topic')+'</div><p>AI confidence: '+esc(JSON.stringify(r.confidence))+'</p><p class="pi-error">Extraction warnings: '+esc(r.issues.join(', ')||'None detected')+'</p>'+
      ['question_pages','answer_pages','solution_pages'].map(k=>'<label class="form-field">'+esc(k.replace('_',' '))+' (comma separated)<input class="form-input" id="pi-r-'+k+'" value="'+esc(q.source[k].join(', '))+'"></label>').join('')+
      '<label class="form-field">Review note<input class="form-input" id="pi-r-note" value="'+esc(r.review_note)+'" placeholder="Confirm corrections and source checks"></label><div id="pi-r-images" class="pi-images"></div>'+
      '<div class="pi-fields"><label>Upload image<input type="file" id="pi-r-upload" accept="image/png,image/jpeg,image/webp,image/gif"></label><select id="pi-r-role" aria-label="New image role"><option value="question">Question image</option><option value="explanation">Explanation image</option></select></div><button type="button" class="btn" id="pi-r-gallery">Browse extracted images</button><div id="pi-r-gallery-items" class="pi-images"></div>'+
      '<div class="pi-fields"><button class="btn btn--primary" type="submit" value="save">Save Changes</button><button class="btn" type="submit" value="approve">Approve</button><button class="btn" type="submit" value="needs_review">Needs Review</button><button class="btn" type="button" id="pi-r-close">Close</button></div></form>'+
      '<aside><h3>Source pages</h3><p>Question: '+esc(q.source.question_pages.join(', '))+'<br>Answer: '+esc(q.source.answer_pages.join(', '))+'<br>Solution: '+esc(q.source.solution_pages.join(', '))+'</p><div class="pi-fields"><label>Page <input id="pi-source-page" type="number" min="1" value="'+(q.source.question_pages[0]||1)+'"></label><button class="btn" id="pi-source-show">Show page</button><a target="_blank" href="/api/admin/pdf-import/'+r.import_id+'/source">Download original PDF</a></div><img id="pi-source-image" alt="Source PDF page" class="pi-source-image"></aside></div>';
    fill('pi-r-subject',ctx.subjects);el('pi-r-subject').value=r.subject_id;
    const rTax=()=>{fill('pi-r-module',modules(el('pi-r-subject').value));fill('pi-r-topic',topics(el('pi-r-module').value));};rTax();el('pi-r-module').value=r.module_id||'';fill('pi-r-topic',topics(r.module_id));el('pi-r-topic').value=r.topic_id||'';
    el('pi-r-subject').onchange=()=>{el('pi-r-module').value='';el('pi-r-topic').value='';rTax();};el('pi-r-module').onchange=()=>fill('pi-r-topic',topics(el('pi-r-module').value));
    const imgUrl=i=>i.media_id?'/api/public/media/'+i.media_id:'/api/admin/pdf-import/'+r.import_id+'/images/'+i.key+'?mode='+r.mode;
    function imageList(){el('pi-r-images').innerHTML=(q.images||[]).map((i,index)=>'<div><img alt="Extracted '+esc(i.role)+' image" src="'+imgUrl(i)+'"><select data-image-role="'+index+'" aria-label="Image role">'+option('question','Question')+option('explanation','Explanation')+'</select><button type="button" class="btn" data-remove="'+index+'">Remove</button></div>').join('');el('pi-r-images').querySelectorAll('[data-image-role]').forEach(s=>{s.value=q.images[Number(s.dataset.imageRole)].role;s.onchange=()=>q.images[Number(s.dataset.imageRole)].role=s.value;});el('pi-r-images').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{q.images.splice(Number(b.dataset.remove),1);imageList();});}
    q.images=q.images||[];imageList();let galleryOffset=0;
    el('pi-r-gallery').onclick=()=>perform(async()=>{const data=await request('/'+r.import_id+'/images?mode='+r.mode+'&offset='+galleryOffset);el('pi-r-gallery-items').innerHTML=data.keys.map(key=>'<button type="button" class="btn" data-add-image="'+key+'"><img alt="Extracted image candidate" src="/api/admin/pdf-import/'+r.import_id+'/images/'+key+'?mode='+r.mode+'">Add image</button>').join('');galleryOffset=galleryOffset+100>=data.total?0:galleryOffset+100;el('pi-r-gallery').textContent='Browse next images ('+data.total+' total)';el('pi-r-gallery-items').querySelectorAll('[data-add-image]').forEach(b=>b.onclick=()=>{if(!q.images.some(i=>i.key===b.dataset.addImage)){q.images.push({key:b.dataset.addImage,role:el('pi-r-role').value});imageList();}});});
    el('pi-r-upload').onchange=()=>perform(async()=>{const file=el('pi-r-upload').files[0];if(!file)return;const form=new FormData();form.append('file',file);const res=await adminFetch('/api/admin/media/upload',{method:'POST',body:form});const result=await res.json();if(!res.ok)throw new Error(result.error||'Image upload failed.');q.images.push({media_id:result.id,role:el('pi-r-role').value});imageList();});
    el('pi-source-show').onclick=()=>{el('pi-source-image').src='/api/admin/pdf-import/'+r.import_id+'/pages/'+Number(el('pi-source-page').value);};el('pi-source-show').click();
    el('pi-r-close').onclick=()=>{host.hidden=true;review=null;};
    el('pi-review-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const options=el('pi-r-options').value.split('\n').filter(s=>s.trim()).map(line=>{const m=line.match(/^\s*([A-Ha-h])[.)]\s*(.*)$/);if(!m)throw new Error('Each option must start with A. through H.');return {key:m[1].toUpperCase(),text:m[2]};});
      const source=Object.fromEntries(['question_pages','answer_pages','solution_pages'].map(k=>[k,el('pi-r-'+k).value.split(',').map(s=>s.trim()).filter(Boolean).map(Number)]));
      const payload={source,version:review.version,question_text:el('pi-r-text').value,options,correct_answer:el('pi-r-answer').value,explanation:el('pi-r-expl').value,reference:el('pi-r-reference').value,subject_id:Number(el('pi-r-subject').value),module_id:Number(el('pi-r-module').value)||null,topic_id:Number(el('pi-r-topic').value)||null,images:q.images,review_note:el('pi-r-note').value,action:e.submitter?.value};
      review=await request('/questions/'+id,'PUT',payload);await loadQuestions();await loadJobs();message('Review saved: '+review.classification_status,true);});};host.scrollIntoView({behavior:'smooth',block:'start'});
  }
  try{await context();await loadJobs();await loadQuestions();}catch(e){message(e.message);}
  // Keep processing progress fresh without replacing a dirty review form or focused controls.
  const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return;}if(busy||el('pi-jobs').contains(document.activeElement))return;loadJobs().catch(()=>{});},5000);
}
