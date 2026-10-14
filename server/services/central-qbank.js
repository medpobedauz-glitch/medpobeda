import {db} from '../db/index.js';
import {can} from '../middleware/auth.js';
import {sanitizeExplanationBlocks} from './explanations.js';
import {getQuestionFull} from './questions.js';
import {createQuestion,updateQuestion} from './question-write.js';
import {attachSource,recordQuestionHistory} from './question-history.js';
import {validateQuestionForPublish} from './question-validation.js';
export const STATUSES=['draft','review','selected','approved','published','rejected'];
export const TYPES=['single_best','multiple_correct','true_false','clinical_vignette','image_based'];
export function problem(message,status=400){const e=new Error(message);e.status=status;e.cmsSafe=true;throw e;}
export const text=(s,max=60000)=>{if(typeof s!=='string'||s.length>max)problem('Invalid or oversized text.');return s.trim();};
export function plainExplanation(blocks=[]) {
 return blocks.map(b=>b.type==='rich_text'?(b.delta?.ops||[]).map(o=>o.insert||'').join(''):b.type==='list'?(b.items||[]).join('\n'):b.type==='table'?(b.rows||[]).map(r=>r.join(' | ')).join('\n'):b.type==='image'?'':b.text||'').filter(Boolean).join('\n').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
const label=(table,id)=>db.prepare(`SELECT COALESCE(NULLIF((SELECT name FROM ${table}_translations WHERE ${table}_id=? AND lang='en'),''),NULLIF((SELECT name FROM ${table}_translations WHERE ${table}_id=? AND lang='uz'),''),(SELECT slug FROM ${table==='subject'?'subjects':table==='module'?'modules':'topics'} WHERE id=?)) name`).get(id,id,id)?.name||'';
export function fullQuestion(id){
 const q=getQuestionFull(Number(id));if(!q)problem('Question not found.',404);
 const cms=db.prepare('SELECT * FROM question_cms WHERE question_id=?').get(q.id);
 const parent=db.prepare('SELECT t.module_id,m.subject_id FROM topics t JOIN modules m ON m.id=t.module_id WHERE t.id=?').get(q.topic_id);
 const result={...q,...cms,id:q.id,question_id:q.question_id,subtopic_id:q.topic_id,topic_id:parent.module_id,subject_id:parent.subject_id,status:cms.workflow_status,tags:JSON.parse(cms.tags),subject:label('subject',parent.subject_id),topic:label('module',parent.module_id),subtopic:label('topic',q.topic_id),source:cms.source_id?db.prepare('SELECT name FROM content_sources WHERE id=?').get(cms.source_id)?.name||'':'',source_reference:q.reference||'',created_by_name:db.prepare('SELECT COALESCE(NULLIF(display_name,\'\'),email) name FROM users WHERE id=?').get(q.created_by)?.name||'',reviewed_by_name:db.prepare('SELECT COALESCE(NULLIF(display_name,\'\'),email) name FROM users WHERE id=?').get(cms.reviewed_by)?.name||'',sources:db.prepare('SELECT * FROM question_source_links WHERE question_id=? ORDER BY id').all(q.id).map(s=>({...s,metadata:JSON.parse(s.metadata)}))};
 for(const [lang,suffix] of [['en','english'],['uz','uzbek']]){result['question_'+suffix]=q.translations[lang]?.question_text||'';result['explanation_'+suffix]=plainExplanation(q.translations[lang]?.explanation_blocks);for(const o of q.options)result['option_'+o.option_key.toLowerCase()+'_'+suffix]=o.translations[lang]||'';}
 result.possible_duplicate=Boolean(db.prepare("SELECT 1 FROM question_translations a JOIN question_translations b ON b.lang=a.lang AND lower(trim(b.question_text))=lower(trim(a.question_text)) WHERE a.question_id=? AND b.question_id<>? AND trim(a.question_text)<>'' LIMIT 1").get(q.id,q.id));
 result.correct_answer=q.options.filter(o=>o.is_correct).map(o=>o.option_key).join(',');return result;
}
export function queryQuestions(filters={}){
 const clauses=['1=1'],params=[];
 for(const [field,column] of Object.entries({subject_id:'m.subject_id',topic_id:'m.id',subtopic_id:'q.topic_id',source_id:'c.source_id',difficulty:'q.difficulty',status:'c.workflow_status',question_type:'c.question_type'}))if(filters[field]){clauses.push(column+'=?');params.push(filters[field]);}
 if(filters.search){clauses.push("(q.question_id LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM question_translations tr WHERE tr.question_id=q.id AND tr.question_text LIKE ? ESCAPE '\\') OR c.tags LIKE ? ESCAPE '\\')");const pattern='%'+String(filters.search).replace(/[\\%_]/g,'\\$&')+'%';params.push(pattern,pattern,pattern);}
 if(filters.ids){if(!Array.isArray(filters.ids)||filters.ids.length>500||!filters.ids.length||filters.ids.some(i=>!Number.isInteger(i)||i<1))problem('Select 1–500 questions.');clauses.push(`q.id IN (${filters.ids.map(()=>'?').join(',')})`);params.push(...filters.ids);}
 const sql=' FROM questions q JOIN question_cms c ON c.question_id=q.id JOIN topics t ON t.id=q.topic_id JOIN modules m ON m.id=t.module_id WHERE '+clauses.join(' AND ');
 return {sql,params};
}
export function listQuestions(filters){const {sql,params}=queryQuestions(filters);const offset=Math.max(0,Math.floor(Number(filters.offset)||0));return {rows:db.prepare('SELECT q.id'+sql+' ORDER BY q.updated_at DESC,q.id DESC LIMIT 50 OFFSET ?').all(...params,offset).map(q=>fullQuestion(q.id)),total:db.prepare('SELECT count(*) n'+sql).get(...params).n,offset,limit:50};}
export function prepareQuestion(payload,old=null){
 const data={...old,...payload};
 const subtopic=Number(data.subtopic_id);const tree=db.prepare('SELECT t.id,t.module_id,m.subject_id FROM topics t JOIN modules m ON m.id=t.module_id WHERE t.id=?').get(subtopic);
 if(!tree||Number(data.topic_id)!==tree.module_id||Number(data.subject_id)!==tree.subject_id)problem('Choose a matching Subject, Topic and Subtopic.');
 const type=data.question_type||'single_best';if(!TYPES.includes(type))problem('Invalid question type.');
 const status=data.status||'draft';if(!STATUSES.includes(status))problem('Invalid status.');
 const difficulty=data.difficulty||'medium';if(!['easy','medium','hard'].includes(difficulty))problem('Invalid difficulty.');
 const sourceId=Number(data.source_id)||null;if(sourceId&&!db.prepare('SELECT id FROM content_sources WHERE id=?').get(sourceId))problem('Source not found.');
 const reference=text(data.source_reference||'',2000);
 const tags=Array.isArray(data.tags)?data.tags:String(data.tags||'').split(',');if(tags.length>50)problem('Use at most 50 tags.');const cleanTags=[...new Set(tags.map(t=>text(t,100)).filter(Boolean))];
 const translations={};
 for(const [lang,suffix] of [['en','english'],['uz','uzbek']]){
  const question=text(data['question_'+suffix]||''),explanation=text(data['explanation_'+suffix]||'');
  const prior=old?.translations?.[lang];const blocks=prior&&plainExplanation(prior.explanation_blocks)===explanation?prior.explanation_blocks:[...explanation.split(/\n+/).filter(Boolean).map(text=>({type:'paragraph',text})),...(prior?.explanation_blocks||[]).filter(b=>b.type==='image')];
  translations[lang]={...prior,question_text:question,explanation_blocks:blocks};
 }
 if(payload.editor_translations){
  for(const [lang,tr] of Object.entries(payload.editor_translations)){
   if(!['en','uz','ru'].includes(lang)||!tr||typeof tr!=='object')problem('Invalid question language.');
   translations[lang]={question_text:text(tr.question_text||''),explanation_blocks:sanitizeExplanationBlocks(tr.explanation_blocks||[]),note:text(tr.note||''),question_image_alt:text(tr.question_image_alt||'',2000)};
  }
 }
 const flatOptions=Object.keys(payload).some(k=>/^option_[a-h]_(english|uzbek)$/.test(k));
 const options=(payload.options ?? (flatOptions?null:old?.options))||['A','B','C','D','E','F','G','H'].filter(k=>data['option_'+k.toLowerCase()+'_english']||data['option_'+k.toLowerCase()+'_uzbek']).map(k=>({option_key:k,translations:{en:data['option_'+k.toLowerCase()+'_english']||'',uz:data['option_'+k.toLowerCase()+'_uzbek']||''}}));
 if(!Array.isArray(options)||options.length>8)problem('Use at most eight answer options.');
 const correct=String(data.correct_answer||'').toUpperCase().split(/[,;\s]+/).filter(Boolean);
 const cleanOptions=options.map((o,i)=>{const key=String(o.option_key||'').toUpperCase();if(!/^[A-H]$/.test(key))problem('Options need unique A–H keys.');return {option_key:key,display_order:i,is_correct:correct.includes(key),translations:{...old?.options?.find(x=>x.option_key===key)?.translations,en:text(o.translations?.en||'',10000),uz:text(o.translations?.uz||'',10000),ru:text(o.translations?.ru??old?.options?.find(x=>x.option_key===key)?.translations?.ru??'',10000)}};});
 if(correct.some(k=>!cleanOptions.some(o=>o.option_key===k)))problem('Correct answers must refer to existing options.');
 if(new Set(cleanOptions.map(o=>o.option_key)).size!==cleanOptions.length)problem('Duplicate option keys.');
 const images={};for(const field of ['question_image_media_id','explanation_image_media_id']){const id=Number(data[field])||null;if(id&&!db.prepare("SELECT id FROM media WHERE id=? AND status='active'").get(id))problem('Choose a valid image.');images[field]=id;}
 const write={difficulty,status:status==='published'?'published':status==='rejected'?'archived':status==='draft'?'draft':'review',reference,translations,options:cleanOptions,...images};
 if(['approved','published'].includes(status)){
  const populated=Object.keys(translations).filter(l=>translations[l].question_text.trim());if(!populated.length)problem('A complete question language is required for approval.');
  for(const lang of populated){const validation=validateQuestionForPublish({...write,question_type:type,publish_lang:lang});if(!validation.ok)problem(validation.errors.join(' '));}
  if(type==='true_false'&&cleanOptions.length!==2)problem('True/False needs exactly two options.');
  if(type==='image_based'&&!images.question_image_media_id&&!old?.additional_images?.length)problem('An image-based question needs an image.');
 }
 return {subtopic,sourceId,tags:cleanTags,type,status,write};
}
export function saveQuestion(payload,user,id=null){return db.transaction(()=>{
 const old=id?fullQuestion(id):null;if(old&&payload.version!==old.version)problem('Question changed. Reload it before saving.',409);
 const effective={...payload};
 if(old&&effective.status===undefined&&['approved','published','rejected'].includes(old.status)&&!can(user.role,'review')&&!can(user.role,'publish'))effective.status='review';
 const p=prepareQuestion(effective,old);
 if(['approved','published','rejected'].includes(p.status)&&!can(user.role,'review')&&!can(user.role,'publish'))problem('Review permission is required.',403);
 if(old?.merged_into)problem('This question was merged. Edit the retained question instead.',409);
 if(id)updateQuestion({questionId:id,payload:p.write,user});else id=createQuestion({topicId:p.subtopic,payload:p.write,user});
 db.prepare('UPDATE questions SET topic_id=? WHERE id=?').run(p.subtopic,id);
 db.prepare('UPDATE question_cms SET question_type=?,workflow_status=?,source_id=?,tags=?,reviewed_by=? WHERE question_id=?').run(p.type,p.status,p.sourceId,JSON.stringify(p.tags),['approved','published','rejected'].includes(p.status)?user.id:null,id);
 if(p.sourceId||p.write.reference)attachSource(id,p.sourceId,p.write.reference);
 return fullQuestion(id);
})();}
const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const words=s=>new Set(norm(s).split(' ').filter(Boolean));
export function duplicates(id){return findDuplicates(fullQuestion(id));}
export function findDuplicates(q){
 const id=q.id||0,a=words(q.question_english||q.question_uzbek);const hits=[];
 // Scan candidate text through a cursor: no unbounded full-record load.
 for(const r of db.prepare("SELECT q.id,COALESCE(NULLIF(en.question_text,''),uz.question_text,'') stem,c.tags,c.source_id,q.topic_id FROM questions q JOIN question_cms c ON c.question_id=q.id LEFT JOIN question_translations en ON en.question_id=q.id AND en.lang='en' LEFT JOIN question_translations uz ON uz.question_id=q.id AND uz.lang='uz' WHERE q.id<>? AND c.merged_into IS NULL AND NOT EXISTS(SELECT 1 FROM question_duplicate_decisions d WHERE (d.question_id=? AND d.other_id=q.id) OR (d.other_id=? AND d.question_id=q.id))").iterate(id,id,id)){
  const b=words(r.stem);const overlap=[...a].filter(w=>b.has(w)).length;const score=overlap/Math.max(1,a.size+b.size-overlap);const tags=JSON.parse(r.tags);const sharedConcept=q.tags.some(t=>tags.includes(t));
  if(score<.5&&!sharedConcept)continue;
  const other=fullQuestion(r.id);const optionsMatch=norm(q.options.map(o=>o.translations.en||o.translations.uz).join(' '))===norm(other.options.map(o=>o.translations.en||o.translations.uz).join(' '));
  hits.push({id:r.id,question_id:other.question_id,question:other.question_english||other.question_uzbek,score,options_match:optionsMatch,same_subtopic:r.topic_id===q.subtopic_id,same_source:r.source_id===q.source_id,shared_concept:sharedConcept});
 }
 return hits.sort((a,b)=>b.score-a.score).slice(0,20);
}
export function resolveDuplicate(id,otherId,action,user,versions){return db.transaction(()=>{
 if(Number(id)===Number(otherId)||!['keep','merge','reject'].includes(action))problem('Invalid duplicate decision.');
 const q=fullQuestion(id),other=fullQuestion(otherId);if(q.version!==versions.version||other.version!==versions.other_version)problem('One question changed. Review it again.',409);
 if(q.merged_into||other.merged_into)problem('A question has already been merged. Reload the duplicate list.',409);
 if(action==='merge'){
  // Keep current wording and fill only absent language fields. Reject, never delete, the other record.
  const p={...q,version:q.version,status:'review',options:q.options.map(o=>({...o,translations:{...o.translations}}))};
  const compatible=q.correct_answer===other.correct_answer&&q.options.length===other.options.length&&q.options.every((o,i)=>o.option_key===other.options[i].option_key&&(!o.translations.en||!other.options[i].translations.en||norm(o.translations.en)===norm(other.options[i].translations.en))&&(!o.translations.uz||!other.options[i].translations.uz||norm(o.translations.uz)===norm(other.options[i].translations.uz)));
  for(const suffix of ['english','uzbek'])for(const field of ['question','explanation'])if(!p[field+'_'+suffix]&&compatible)p[field+'_'+suffix]=other[field+'_'+suffix];
  if(compatible)for(const o of p.options)for(const lang of ['en','uz'])if(!o.translations[lang])o.translations[lang]=other.options.find(x=>x.option_key===o.option_key)?.translations[lang]||'';
  p.tags=[...new Set([...q.tags,...other.tags])];saveQuestion(p,user,q.id);
  for(const s of other.sources)attachSource(q.id,s.source_id,s.source_reference,{...s.metadata,merged_from:other.question_id});
  attachSource(q.id,other.source_id,other.source_reference,{merged_from:other.question_id,pdf_source:other.pdf_source});
  saveQuestion({...other,version:other.version,status:'rejected'},user,other.id);db.prepare('UPDATE question_cms SET merged_into=? WHERE question_id=?').run(q.id,other.id);
 }else if(action==='reject')saveQuestion({...other,version:other.version,status:'rejected'},user,other.id);
 db.prepare('INSERT OR REPLACE INTO question_duplicate_decisions(question_id,other_id,decision,decided_by) VALUES(?,?,?,?)').run(q.id,other.id,action,user.id);
 return fullQuestion(q.id);
})();}
