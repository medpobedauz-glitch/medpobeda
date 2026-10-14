import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { db } from '../db/index.js';
import { python, extractor, outputDir, sourcePath, ensurePdfRoot, pdfRoot } from './pdf-config.js';
import { classifyImport } from './pdf-classification.js';
let active=null, stopped=false, timer=null, lockFd=null;
export function runPython(args, onProgress=()=>{}) {
  const child=spawn(python,[extractor,...args],{stdio:['ignore','pipe','pipe']});
  let last={},errors='';
  const lines=readline.createInterface({input:child.stdout});
  lines.on('line',line=>{try{last=JSON.parse(line);onProgress(last);}catch{/* only JSON protocol is consumed */}});
  child.stderr.on('data',b=>{errors=(errors+b.toString()).slice(-4000);});
  const done=new Promise((resolve,reject)=>{
    child.once('error',()=>reject(new Error('Python PDF runtime is unavailable. Install server/pdf_import/requirements.txt.')));
    child.once('close',code=>{lines.close();code===0?resolve(last):reject(new Error(last.error||'PDF processing failed. Check the PDF and Python runtime.'));});
  });
  return {child,done};
}
export async function ingestOutput(job) {
  const stream=fs.createReadStream(path.join(outputDir(job),'questions.ndjson'));
  const lines=readline.createInterface({input:stream,crlfDelay:Infinity});
  for await(const line of lines) {
    if(!line.trim())continue;
    const q=JSON.parse(line);
    db.prepare(`INSERT INTO pdf_import_questions(import_id,mode,extraction_key,source_number,subject_id,data,extraction_status,issues)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(import_id,mode,extraction_key) DO NOTHING`).run(job.id,job.mode,q.question_id,q.number,job.subject_id,JSON.stringify(q),q.extraction_status,JSON.stringify(q.issues));
  }
}
async function tick() {
  if(stopped||active)return;
  const job=db.prepare('SELECT * FROM pdf_imports WHERE queued=1 ORDER BY id LIMIT 1').get();
  if(!job)return;
  if(!db.prepare("UPDATE pdf_imports SET queued=0,status='processing',error=NULL WHERE id=? AND queued=1").run(job.id).changes)return;
  active={id:job.id,child:null,cancelled:false};
  try {
    const args=[sourcePath(job),'--output',outputDir(job),'--start-page',String(job.start_page),'--source-name',job.filename,'--subject',String(job.subject_id)];
    if(job.end_page)args.push('--end-page',String(job.end_page));
    if(process.env.PDF_ENABLE_OCR==='true')args.push('--ocr');
    const run=runPython(args,p=>{
      if(p.stage==='failed')return;
      db.prepare('UPDATE pdf_imports SET page_count=MAX(page_count,?),pages_processed=?,images_found=?,questions_found=MAX(questions_found,?),updated_at=datetime(\'now\') WHERE id=?')
        .run(p.page_count||0,p.pages_processed||0,p.images_found||p.images||0,p.questions_found||0,job.id);
    });
    active.child=run.child;
    const report=await run.done;
    if(active.cancelled)throw new Error('Processing paused. Resume to continue from cached pages.');
    await ingestOutput(job);
    db.prepare("UPDATE pdf_imports SET status=?,questions_found=?,images_found=?,classification_running=1 WHERE id=?")
      .run(report.questions_needing_review||report.diagnostics||!report.questions_found?'needs_review':'completed',report.questions_found||0,report.images||0,job.id);
    try{const result=await classifyImport(job,()=>stopped||active?.cancelled);if(result.error)db.prepare('UPDATE pdf_imports SET error=? WHERE id=?').run(result.error,job.id);}
    catch{db.prepare('UPDATE pdf_imports SET error=? WHERE id=?').run('Classification unavailable. Check local Ollama, or assign taxonomy manually.',job.id);}
  } catch(e) {
    db.prepare("UPDATE pdf_imports SET status='failed',error=?,updated_at=datetime('now') WHERE id=?").run(String(e.message).slice(0,500),job.id);
  } finally {db.prepare('UPDATE pdf_imports SET classification_running=0 WHERE id=?').run(job.id);active=null;}
}
export function startClassification(job) {
  if(active)return false;
  active={id:job.id,cancelled:false};
  db.prepare('UPDATE pdf_imports SET classification_running=1,error=NULL WHERE id=?').run(job.id);
  classifyImport(job,()=>active?.cancelled||stopped)
    .then(result=>{if(result.error)db.prepare('UPDATE pdf_imports SET error=? WHERE id=?').run(result.error,job.id);})
    .catch(()=>db.prepare('UPDATE pdf_imports SET error=? WHERE id=?').run('Local classification failed. Check Ollama and retry.',job.id))
    .finally(()=>{db.prepare('UPDATE pdf_imports SET classification_running=0 WHERE id=?').run(job.id);active=null;});
  return true;
}
export function pauseImport(id) {
  db.prepare("UPDATE pdf_imports SET queued=0 WHERE id=?").run(id);
  if(active?.id===id){active.cancelled=true;active.child?.kill('SIGTERM');}
}
export function startPdfWorker() {
  ensurePdfRoot();
  // One worker per storage directory, including when multiple web processes run.
  const lock=path.join(pdfRoot,'worker.lock');
  try{lockFd=fs.openSync(lock,'wx');}catch{
    try{const pid=Number(fs.readFileSync(lock,'utf8'));process.kill(pid,0);return;}catch(e){if(e.code!=='ESRCH')return;fs.unlinkSync(lock);lockFd=fs.openSync(lock,'wx');}
  }
  fs.writeFileSync(lockFd,String(process.pid));
  db.prepare("UPDATE pdf_imports SET status='failed',queued=0,classification_running=0,error='Processing interrupted. Resume to use saved page checkpoints.' WHERE status='processing' OR classification_running=1").run();
  timer=setInterval(()=>tick().catch(e=>console.error('PDF worker:',e.message)),1000);timer.unref();
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{stopped=true;active?.child?.kill('SIGTERM');process.exit(0);});
  process.once('exit',()=>{active?.child?.kill('SIGTERM');try{fs.closeSync(lockFd);fs.unlinkSync(lock);}catch{}});
}
