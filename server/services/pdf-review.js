import {attachSource} from './question-history.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { outputDir } from './pdf-config.js';
import { createQuestion } from './question-write.js';
import { readImageSize } from './uploads.js';
export function fail(message,status=400) { const e=new Error(message);e.status=status;e.pdfSafe=true;throw e; }
export function loadJob(id) { const j=db.prepare('SELECT * FROM pdf_imports WHERE id=?').get(Number(id));if(!j)fail('PDF import not found.',404);return j; }
export function loadStaged(id) { const r=db.prepare('SELECT * FROM pdf_import_questions WHERE id=?').get(Number(id));if(!r)fail('Question not found.',404);return r; }
export function publicRow(row) { return {...row,data:JSON.parse(row.data),issues:JSON.parse(row.issues),confidence:JSON.parse(row.confidence)}; }
export function checkTaxonomy(subjectId,moduleId,topicId) {
  if(!db.prepare('SELECT id FROM subjects WHERE id=?').get(subjectId))fail('Choose a valid subject.');
  if(moduleId&&!db.prepare('SELECT id FROM modules WHERE id=? AND subject_id=?').get(moduleId,subjectId))fail('Topic does not belong to this subject.');
  if(topicId&&!db.prepare('SELECT id FROM topics WHERE id=? AND module_id=?').get(topicId,moduleId))fail('Sub-topic does not belong to this Topic.');
}
export function validateDraft(data) {
  const errors=[];
  if(!String(data.question_text||'').trim())errors.push('Question text is required.');
  if(!Array.isArray(data.options)||data.options.length<2||data.options.length>8)errors.push('Provide 2–8 answer options.');
  const keys=(data.options||[]).map(o=>o.key);
  if(new Set(keys).size!==keys.length||keys.some(k=>!/^([A-H])$/.test(k))||(data.options||[]).some(o=>!String(o.text||'').trim()))errors.push('Each option needs a unique A–H key and text.');
  if(!keys.includes(data.correct_answer))errors.push('Select a correct answer from the options.');
  if(!String(data.explanation||'').trim()&&!(data.images||[]).some(i=>i.role==='explanation'))errors.push('Explanation text or an explanation image is required.');
  return errors;
}
export function validateImages(images,job) {
  if(!Array.isArray(images)||images.length>30)fail('Use at most 30 images per question.');
  return images.map(i=>{
    if(!['question','explanation'].includes(i.role))fail('Invalid image role.');
    if(i.media_id) {
      const media=db.prepare("SELECT id FROM media WHERE id=? AND status='active'").get(Number(i.media_id));if(!media)fail('Uploaded image not found.');
      return {media_id:media.id,role:i.role};
    }
    if(!/^[a-f0-9]{64}\.png$/.test(i.key)||!fs.existsSync(path.join(outputDir(job),'images',i.key)))fail('Extracted image not found.');
    return {key:i.key,role:i.role,...(Number.isInteger(i.page)&&i.page>0?{page:i.page}:{})};
  });
}
export function updateStaged(row,payload,user) {
  if(row.imported_question_id)fail('This question has already been added to Qbank. Edit it in Questions.',409);
  if(payload.version!==row.version)fail('This question changed since it was opened. Reload before saving.',409);
  const data=JSON.parse(row.data),job={...loadJob(row.import_id),mode:row.mode};
  const subjectId=Number(payload.subject_id)||row.subject_id,moduleId=Number(payload.module_id)||null,topicId=Number(payload.topic_id)||null;
  checkTaxonomy(subjectId,moduleId,topicId);
  for(const key of ['question_text','explanation','reference'])if(payload[key]!==undefined){if(typeof payload[key]!=='string'||payload[key].length>60000)fail('Text is too long or invalid.');data[key]=payload[key];}
  if(payload.options!==undefined){if(!Array.isArray(payload.options)||payload.options.length>8)fail('Provide at most eight options.');data.options=payload.options.map(o=>({key:String(o.key||'').toUpperCase(),text:String(o.text||'').slice(0,10000)}));}
  if(payload.correct_answer!==undefined)data.correct_answer=String(payload.correct_answer||'').toUpperCase();
  if(payload.source!==undefined) {
    for(const key of ['question_pages','answer_pages','solution_pages']) {
      const pages=payload.source[key];
      if(!Array.isArray(pages)||pages.length>100||pages.some(p=>!Number.isInteger(p)||p<1||p>job.page_count))fail('Source page numbers must be within the PDF.');
      data.source[key]=[...new Set(pages)].sort((a,b)=>a-b);
    }
  }
  if(payload.images!==undefined)data.images=validateImages(payload.images,job);
  const issues=validateDraft(data),approve=payload.action==='approve';
  const note=String(payload.review_note??row.review_note).trim().slice(0,2000);
  if(approve&&(!moduleId||!topicId))fail('Assign a Topic and Sub-topic before approval.');
  if(approve&&issues.length)fail(issues.join(' '));
  if(approve&&JSON.parse(row.issues).length&&!note)fail('Add a review note confirming how extraction warnings were checked against the source.');
  db.prepare(`UPDATE pdf_import_questions SET subject_id=?,module_id=?,topic_id=?,data=?,extraction_status=?,classification_status=?,review_note=?,reviewed_by=?,version=version+1,updated_at=datetime('now') WHERE id=?`)
    .run(subjectId,moduleId,topicId,JSON.stringify(data),issues.length?'needs_review':'complete',approve?'approved':'needs_review',note,user.id,row.id);
  return publicRow(loadStaged(row.id));
}
function importMedia(image,job,user) {
  if(image.media_id)return image.media_id;
  const mapped=db.prepare('SELECT media_id FROM pdf_import_media WHERE import_id=? AND image_key=?').get(job.id,image.key);if(mapped)return mapped.media_id;
  const safeName='pdf-'+image.key;
  let existing=db.prepare("SELECT id FROM media WHERE safe_filename=? AND status='active'").get(safeName);
  if(!existing) {
    fs.mkdirSync(config.storageDir,{recursive:true});
    const dest=path.join(config.storageDir,safeName);fs.copyFileSync(path.join(outputDir(job),'images',image.key),dest);
    const dims=readImageSize(dest);
    existing={id:db.prepare(`INSERT INTO media(storage_path,original_filename,safe_filename,mime_type,size_bytes,width,height,alt_text,uploaded_by) VALUES(?,?,?,'image/png',?,?,?,?,?)`)
      .run(dest,image.key,safeName,fs.statSync(dest).size,dims?.width||null,dims?.height||null,'Imported question image',user.id).lastInsertRowid};
  }
  db.prepare('INSERT INTO pdf_import_media VALUES(?,?,?)').run(job.id,image.key,existing.id);return existing.id;
}
export function addToQbank(ids,user) {
  return db.transaction(()=>ids.map(id=>{
    const row=loadStaged(id),job={...loadJob(row.import_id),mode:row.mode},data=JSON.parse(row.data);
    if(row.mode!=='full')fail('Sample questions cannot enter Qbank. Approve the sample and run the full PDF first.');
    if(row.imported_question_id)return {staging_id:row.id,id:row.imported_question_id,already_added:true};
    if(row.classification_status!=='approved')fail('Only approved questions can be added to Qbank.');
    checkTaxonomy(row.subject_id,row.module_id,row.topic_id);
    if(!row.topic_id)fail('A Sub-topic is required.');
    const issues=validateDraft(data);if(issues.length)fail(issues.join(' '));
    data.images=validateImages(data.images||[],job);
    const normalize=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase();
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify([job.lang,normalize(data.question_text),data.options.map(o=>[o.key,normalize(o.text)])])).digest('hex');
    const sourceFingerprint=fingerprint+'-'+row.id;
    const images=data.images.map(i=>({...i,id:importMedia(i,job,user)}));
    const qImages=images.filter(i=>i.role==='question'),exImages=images.filter(i=>i.role==='explanation');
    const blocks=data.explanation.trim()?data.explanation.trim().split(/\n+/).filter(s=>s.trim()).map(text=>({type:'paragraph',text:text.trim()})):[];
    for(const i of exImages.slice(1))blocks.push({type:'image',mediaId:i.id,alt:'Explanation image'});
    const questionId=createQuestion({topicId:row.topic_id,user,payload:{status:'draft',question_image_media_id:qImages[0]?.id||null,explanation_image_media_id:exImages[0]?.id||null,
      reference:data.reference||job.filename,translations:{[job.lang]:{question_text:data.question_text,explanation_blocks:blocks}},
      options:data.options.map(o=>({option_key:o.key,is_correct:o.key===data.correct_answer,translations:{[job.lang]:o.text}}))}});
    for(const [index,img] of qImages.slice(1).entries())db.prepare('INSERT OR IGNORE INTO question_media_links VALUES(?,?,?,?)').run(questionId,img.id,'question',index);
    db.prepare('INSERT INTO question_pdf_sources(question_id,import_id,staging_id,source,fingerprint) VALUES(?,?,?,?,?)').run(questionId,job.id,row.id,JSON.stringify(data.source),sourceFingerprint);
    let source=db.prepare("SELECT id FROM content_sources WHERE name=? AND type='book'").get(job.filename);
    if(!source)source={id:db.prepare("INSERT INTO content_sources(name,type,publication,created_by) VALUES(?,'book',?,?)").run(job.filename,job.filename,user.id).lastInsertRowid};
    db.prepare('UPDATE question_cms SET source_id=? WHERE question_id=?').run(source.id,questionId);
    attachSource(questionId,source.id,data.reference||job.filename,data.source);
    db.prepare('UPDATE pdf_import_questions SET imported_question_id=?,version=version+1 WHERE id=?').run(questionId,row.id);
    return {staging_id:row.id,id:questionId,question_id:db.prepare('SELECT question_id FROM questions WHERE id=?').get(questionId).question_id};
  }))();
}
