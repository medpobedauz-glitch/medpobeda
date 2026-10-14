import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit } from '../middleware/auth.js';
import { pdfRoot,maxPdfMb,jobDir,sourcePath,outputDir,ensurePdfRoot } from '../services/pdf-config.js';
import { runPython,pauseImport,startClassification } from '../services/pdf-worker.js';
import { taxonomy,classifierConfig } from '../services/pdf-classification.js';
import { fail,loadJob,loadStaged,publicRow,updateStaged,addToQbank,checkTaxonomy } from '../services/pdf-review.js';
const router=Router();
router.use(requireRole('read'));
const write=[requireRole('write'),csrfProtection];
ensurePdfRoot();
const upload=multer({dest:pdfRoot,limits:{fileSize:maxPdfMb*1024*1024,files:10},fileFilter(req,file,cb){cb(null,path.extname(file.originalname).toLowerCase()==='.pdf'&&['application/pdf','application/octet-stream'].includes(file.mimetype));}}).array('files',10);
const integer=(value,fallback)=>value===undefined?fallback:Number(value);
const idsOf=body=>{const ids=body.ids;if(!Array.isArray(ids)||!ids.length||ids.length>200||ids.some(i=>!Number.isInteger(i)||i<1))fail('Select between 1 and 200 questions.');return [...new Set(ids)];};
router.get('/context',(_req,res)=>{const cfg=classifierConfig();res.json({...taxonomy(),max_upload_mb:maxPdfMb,classifier:{provider:'local_ollama',model:cfg.model,threshold:cfg.threshold}});});
router.get('/',(req,res)=>{
  const rows=db.prepare(`SELECT j.*, (SELECT count(*) FROM pdf_import_questions q WHERE q.import_id=j.id AND q.mode=j.mode AND q.topic_id IS NOT NULL) AS classified,
    (SELECT count(*) FROM pdf_import_questions q WHERE q.import_id=j.id AND q.mode=j.mode AND q.classification_status='approved') AS approved,
    (SELECT count(*) FROM pdf_import_questions q WHERE q.import_id=j.id AND q.mode=j.mode AND (q.classification_status='needs_review' OR q.extraction_status<>'complete')) AS needing_review
    FROM pdf_imports j ORDER BY j.id DESC LIMIT 200`).all().map(({storage_key,sha256,...j})=>j);
  res.json({rows});
});
router.post('/upload',...write,(req,res,next)=>{
  upload(req,res,async err=>{
    const files=req.files||[],directories=[];
    try{
      if(err)fail(err.code==='LIMIT_FILE_SIZE'?`PDF exceeds ${maxPdfMb} MB.`:'PDF upload failed. Use up to 10 PDF files.');
      if(!files.length)fail('Choose PDF files to upload.');
      const subjectId=Number(req.body.subject_id),lang=req.body.lang;
      if(!['uz','ru','en'].includes(lang))fail('Choose the PDF content language.');
      checkTaxonomy(subjectId,null,null);
      const prepared=[],hashes=new Set();
      for(const file of files){
        const fd=fs.openSync(file.path,'r'),magic=Buffer.alloc(1024);fs.readSync(fd,magic,0,1024,0);fs.closeSync(fd);
        if(!magic.includes(Buffer.from('%PDF-')))fail('A selected file is not a valid PDF.');
        const key=crypto.randomUUID(),dir=path.join(pdfRoot,key);fs.mkdirSync(dir);directories.push(dir);fs.renameSync(file.path,path.join(dir,'source.pdf'));
        const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(path.join(dir,'source.pdf')))hash.update(chunk);
        const sha=hash.digest('hex');
        if(hashes.has(sha))fail('The same PDF was selected more than once.');hashes.add(sha);
        if(db.prepare('SELECT id FROM pdf_imports WHERE sha256=? AND subject_id=? AND lang=?').get(sha,subjectId,lang))fail('This PDF was already uploaded for this subject and language. Open its existing import.');
        const run=runPython([path.join(dir,'source.pdf'),'--output',path.join(dir,'metadata'),'--info']);const info=await run.done;
        prepared.push({filename:path.basename(file.originalname).slice(0,240),key,sha,pages:info.page_count});
      }
      const rows=db.transaction(()=>prepared.map(f=>{const id=db.prepare('INSERT INTO pdf_imports(filename,storage_key,sha256,subject_id,lang,page_count,created_by) VALUES(?,?,?,?,?,?,?)').run(f.filename,f.key,f.sha,subjectId,lang,f.pages,req.user.id).lastInsertRowid;audit(req.user.id,'upload_pdf','pdf_import',id,f.filename,{pages:f.pages},req.ip);return {id,filename:f.filename,page_count:f.pages};}))();
      res.status(201).json({rows});
    }catch(e){for(const file of files){try{fs.unlinkSync(file.path);}catch{}}for(const dir of directories)fs.rmSync(dir,{recursive:true,force:true});next(e);}
  });
});
router.post('/:id/run',...write,(req,res)=>{
  const job=loadJob(req.params.id);if(job.status==='processing'||job.queued||job.classification_running)fail('This PDF is already processing.',409);
  const mode=req.body.mode==='full'?'full':'sample';
  if(mode==='full'&&!job.sample_approved)fail('Review and approve the sample before full processing.');
  const start=mode==='full'?1:integer(req.body.start_page,1),end=mode==='full'?null:integer(req.body.end_page,Math.min(job.page_count,12));
  if(!Number.isInteger(start)||start<1||start>job.page_count||(end!==null&&(!Number.isInteger(end)||end<start||end>job.page_count||end-start>=75)))fail('Choose a valid sample range of up to 75 pages.');
  if(mode==='sample'&&(job.mode!=='sample'||job.start_page!==start||job.end_page!==end)){db.prepare("DELETE FROM pdf_import_questions WHERE import_id=? AND mode='sample' AND imported_question_id IS NULL").run(job.id);fs.rmSync(outputDir({...job,mode:'sample'}),{recursive:true,force:true});}
  db.prepare("UPDATE pdf_imports SET mode=?,start_page=?,end_page=?,queued=1,status='uploaded',error=NULL,sample_approved=CASE WHEN ?='sample' THEN 0 ELSE sample_approved END,pages_processed=0,questions_found=0,images_found=0 WHERE id=?").run(mode,start,end,mode,job.id);
  audit(req.user.id,'run_pdf_'+mode,'pdf_import',job.id,job.filename,{start,end},req.ip);res.json({ok:true});
});
router.post('/:id/approve-sample',...write,(req,res)=>{
  const job=loadJob(req.params.id);
  if(job.mode!=='sample'||!['completed','needs_review'].includes(job.status)||!job.questions_found||req.body.confirmed!==true)fail('Run a sample, inspect it against the source, and confirm the sample review.');
  db.prepare('UPDATE pdf_imports SET sample_approved=1 WHERE id=?').run(job.id);audit(req.user.id,'approve_pdf_sample','pdf_import',job.id,job.filename,{},req.ip);res.json({ok:true});
});
router.post('/:id/pause',...write,(req,res)=>{pauseImport(loadJob(req.params.id).id);res.json({ok:true});});
router.post('/:id/classify',...write,async(req,res)=>{
  const job=loadJob(req.params.id);if(job.classification_running||job.status==='processing'||job.queued)fail('This PDF is busy.',409);
  if(!startClassification(job))fail('Another PDF is processing. Retry when it finishes.',409);
  res.status(202).json({ok:true});
});
router.get('/questions',(req,res)=>{
  const clauses=['1=1'],params=[];
  for(const key of ['import_id','subject_id','module_id','topic_id'])if(req.query[key]){clauses.push(`q.${key}=?`);params.push(Number(req.query[key]));}
  for(const key of ['mode','classification_status','extraction_status'])if(req.query[key]){clauses.push(`q.${key}=?`);params.push(String(req.query[key]));}
  if(req.query.imported==='no')clauses.push('q.imported_question_id IS NULL');
  const where=clauses.join(' AND '),limit=50,offset=Math.max(0,Number(req.query.offset)||0);
  const rows=db.prepare(`SELECT q.* FROM pdf_import_questions q WHERE ${where} ORDER BY q.id LIMIT ? OFFSET ?`).all(...params,limit,offset).map(publicRow);
  const total=db.prepare(`SELECT count(*) AS n FROM pdf_import_questions q WHERE ${where}`).get(...params).n;
  res.json({rows,total,limit,offset});
});
router.get('/questions/:id',(req,res)=>{const row=publicRow(loadStaged(req.params.id));res.json({...row,pdf:loadJob(row.import_id).filename});});
router.put('/questions/:id',...write,(req,res)=>{
  const result=db.transaction(()=>updateStaged(loadStaged(req.params.id),req.body,req.user))();
  audit(req.user.id,'review_pdf_question','pdf_import_question',result.id,result.extraction_key,{status:result.classification_status},req.ip);res.json(result);
});
router.post('/bulk',...write,(req,res)=>{
  const ids=idsOf(req.body),action=req.body.action;
  if(!['assign','approve','needs_review'].includes(action))fail('Unknown bulk action.');
  db.transaction(()=>{for(const id of ids){const row=loadStaged(id);updateStaged(row,{version:row.version,subject_id:req.body.subject_id||row.subject_id,module_id:req.body.module_id===undefined?row.module_id:req.body.module_id,topic_id:req.body.topic_id===undefined?row.topic_id:req.body.topic_id,action:action==='approve'?'approve':'save',review_note:req.body.review_note??row.review_note},req.user);}})();
  audit(req.user.id,'bulk_pdf_'+action,'pdf_import_question',null,'Bulk review',{ids},req.ip);res.json({ok:true});
});
router.post('/add-to-qbank',...write,(req,res)=>{const result=addToQbank(idsOf(req.body),req.user);audit(req.user.id,'add_pdf_to_qbank','question',null,'PDF import',{ids:result.map(r=>r.id)},req.ip);res.json({rows:result});});
router.get('/:id/artifacts/:name',(req,res)=>{
  const job=loadJob(req.params.id),name=req.params.name;
  if(!['questions.json','extraction_report.json','errors.json'].includes(name))fail('Artifact not found.',404);
  const file=path.join(outputDir(job),name);if(!fs.existsSync(file))fail('This report is not ready.',404);res.download(file,name);
});
router.get('/:id/images',(req,res)=>{
  const job=loadJob(req.params.id);if(req.query.mode==='sample')job.mode='sample';const dir=path.join(outputDir(job),'images'),offset=Math.max(0,Number(req.query.offset)||0);
  const keys=fs.existsSync(dir)?fs.readdirSync(dir).filter(k=>/^[a-f0-9]{64}\.png$/.test(k)):[];
  res.json({keys:keys.slice(offset,offset+100),total:keys.length});
});
router.get('/:id/images/:key',(req,res)=>{const job=loadJob(req.params.id);if(req.query.mode==='sample')job.mode='sample';if(!/^[a-f0-9]{64}\.png$/.test(req.params.key))fail('Image not found.',404);res.sendFile(path.join(outputDir(job),'images',req.params.key));});
router.get('/:id/source',(req,res)=>res.download(sourcePath(loadJob(req.params.id)),loadJob(req.params.id).filename));
router.get('/:id/pages/:page',async(req,res)=>{
  const job=loadJob(req.params.id),page=Number(req.params.page);if(!Number.isInteger(page)||page<1||page>job.page_count)fail('Page not found.',404);
  const dir=path.join(jobDir(job),'preview'),file=path.join(dir,`page-${page}.png`);
  if(!fs.existsSync(file))await runPython([sourcePath(job),'--output',dir,'--render-page',String(page)]).done;
  res.sendFile(file);
});
router.use((err,req,res,next)=>{if(!err.pdfSafe)return next(err);res.status(err.status||400).json({error:err.message});});
export default router;
