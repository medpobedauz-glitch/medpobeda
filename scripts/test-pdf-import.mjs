// Isolated end-to-end checks; the real application database is never modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medpobeda-pdf-test-'));
Object.assign(process.env,{DATABASE_PATH:path.join(dir,'test.sqlite'),STORAGE_DIR:path.join(dir,'uploads'),PDF_IMPORT_DIR:path.join(dir,'pdfs'),PDF_OLLAMA_MODEL:'test-model-not-installed',PORT:'4098',NODE_ENV:'production',COOKIE_SECURE:'false'});
const {runPendingMigrations}=await import('./migrate.mjs');runPendingMigrations();
const {db}=await import('../server/db/index.js');
const {hashPassword}=await import('../server/middleware/auth.js');
db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,'super_admin')").run('test@example.test',hashPassword('PdfTest1234'));
db.exec("INSERT INTO subjects(slug) VALUES('anatomy'); INSERT INTO modules(subject_id,slug) VALUES(1,'nerves'); INSERT INTO topics(module_id,slug) VALUES(1,'cranial');");
const pdf=path.join(dir,'fixture.pdf');
execFileSync('.venv-pdf/bin/python',['-c',String.raw`import fitz,sys
p=fitz.open()
a=p.new_page()
a.insert_text((50,50),'Chapter Anatomy',fontsize=18)
a.insert_text((50,100),'1. Which structure is shown?',fontsize=12,fontname='hebo')
a.insert_text((50,130),'A. Structure one\nB. Structure two')
for i in range(2):
 pix=fitz.Pixmap(fitz.csRGB,fitz.IRect(0,0,32,32),False);pix.clear_with(80+i*80)
 a.insert_image(fitz.Rect(50+i*120,200,150+i*120,300),stream=pix.tobytes('png'))
b=p.new_page()
b.insert_text((50,80),'C. Structure three\nD. Structure four')
b.insert_text((50,140),'2. Choose the second answer.',fontsize=12,fontname='hebo')
b.insert_text((50,170),'A. First\nB. Second')
c=p.new_page()
c.insert_text((50,50),'Answer key\n1. A  2. B\nSolution for Question 1:\nCorrect answer: A\nExplanation: Source explanation.\nA discussion should not change the answer.\nSolution for Question 2:\nCorrect answer: B\nExplanation: Another explanation.')
p.save(sys.argv[1])`,pdf]);
const server=spawn(process.execPath,['server/app.js'],{env:process.env,stdio:['ignore','ignore','pipe']});let logs='';server.stderr.on('data',b=>logs+=b);
const base='http://127.0.0.1:4098';let cookie='',token='';
async function api(url,method='GET',body,status=200,csrf=true){const headers={Cookie:cookie};if(csrf)headers['X-CSRF-Token']=token;if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const res=await fetch(base+'/api/admin'+url,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));if(data.csrfToken)token=data.csrfToken;return data;}
const endpoint='/pdf-import';
async function finished(id){for(let i=0;i<200;i++){const job=(await api(endpoint)).rows.find(j=>j.id===id);if(!job.queued&&!job.classification_running&&['completed','needs_review','failed'].includes(job.status)){assert.notEqual(job.status,'failed',job.error);return job;}await new Promise(r=>setTimeout(r,100));}throw Error('Worker timed out');}
try{
 for(let i=0;i<50;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal((await fetch(base+'/api/admin/pdf-import/context')).status,401);
 await api('/auth/login','POST',{email:'test@example.test',password:'PdfTest1234'});
 await api(endpoint+'/upload','POST',{},403,false);
 const form=new FormData();form.append('subject_id','1');form.append('lang','en');form.append('files',new Blob([fs.readFileSync(pdf)],{type:'application/pdf'}),'fixture.pdf');
 const id=(await api(endpoint+'/upload','POST',form,201)).rows[0].id;
 await api(endpoint+'/upload','POST',form,400);
 await api(endpoint+'/'+id+'/run','POST',{mode:'full'},400);
 await api(endpoint+'/'+id+'/run','POST',{mode:'sample',start_page:1,end_page:3});
 assert.equal((await finished(id)).questions_found,2);
 let sample=(await api(endpoint+'/questions?mode=sample')).rows;
 assert.equal(sample[0].data.correct_answer,'A');assert.equal(sample[0].data.options.length,4);assert.ok(sample[0].data.explanation.includes('A discussion'));
 await api(endpoint+'/add-to-qbank','POST',{ids:[sample[0].id]},400);
 await api(endpoint+'/'+id+'/approve-sample','POST',{confirmed:true});
 await api(endpoint+'/'+id+'/run','POST',{mode:'full'});await finished(id);
 const rows=(await api(endpoint+'/questions?mode=full')).rows;
 assert.equal(rows.length,2);
 await api(endpoint+'/add-to-qbank','POST',{ids:[rows[0].id]},400);
 await api(endpoint+'/questions/'+rows[0].id,'PUT',{version:0},409);
 await api(endpoint+'/bulk','POST',{ids:rows.map(r=>r.id),action:'approve',subject_id:1,module_id:1,topic_id:1,review_note:'Checked against source pages.'});
 const result=await api(endpoint+'/add-to-qbank','POST',{ids:rows.map(r=>r.id)});
 assert.equal(result.rows.length,2);assert.equal(db.prepare("SELECT count(*) n FROM questions WHERE status='draft'").get().n,2);
 assert.equal(db.prepare('SELECT count(*) n FROM question_pdf_sources').get().n,2);
 const full=await api('/questions/'+result.rows[0].id);assert.equal(full.pdf_source.pdf,'fixture.pdf');assert.equal(full.additional_images.length,1);assert.ok(full.question_image_media_id);
 await api('/media/'+full.additional_images[0].media_id+'/archive','POST',{},400);assert.equal(full.translations.en.question_text,'Which structure is shown?');
 assert.ok((await api(endpoint+'/add-to-qbank','POST',{ids:[rows[0].id]})).rows[0].already_added);
 await api(endpoint+'/questions/'+rows[0].id,'PUT',{version:4},409);
 await api(endpoint+'/'+id+'/run','POST',{mode:'full'});await finished(id);
 assert.equal((await api(endpoint+'/questions?mode=full')).total,2);
 const response=await fetch(base+'/api/admin/pdf-import/'+id+'/artifacts/extraction_report.json',{headers:{Cookie:cookie}});assert.equal((await response.json()).questions_found,2);
 const preview=await fetch(base+'/api/admin/pdf-import/'+id+'/pages/1',{headers:{Cookie:cookie}});assert.equal(preview.status,200);assert.match(preview.headers.get('content-type'),/image\/png/);
 const {validateSuggestion,classifierConfig}=await import('../server/services/pdf-classification.js');
 assert.equal(validateSuggestion({topic_id:99,subtopic_id:1,confidence:{subject:1,topic:1,subtopic:1}},1,{modules:[],topics:[]}),null);
 process.env.PDF_OLLAMA_URL='https://external.example';assert.throws(classifierConfig);delete process.env.PDF_OLLAMA_URL;
 assert.deepEqual(db.pragma('foreign_key_check'),[]);
 console.log('PASS: PDF upload, auth/CSRF, duplicate files, sample gate, cross-page options, answer matching, review/approval, draft-only import, provenance, idempotency, checkpoint resume, artifacts and previews.');
}finally{server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));db.close();fs.rmSync(dir,{recursive:true,force:true});if(logs)console.error(logs);}
