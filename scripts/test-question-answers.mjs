// Real authenticated HTTP requests against a disposable database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'medpobeda-answer-test-'));
Object.assign(process.env,{DATABASE_PATH:path.join(dir,'db.sqlite'),STORAGE_DIR:path.join(dir,'uploads'),PDF_IMPORT_DIR:path.join(dir,'pdf'),PORT:'4197',NODE_ENV:'production',COOKIE_SECURE:'false'});
const {runPendingMigrations}=await import('./migrate.mjs');runPendingMigrations();assert.equal(runPendingMigrations().ran,0);
const {db}=await import('../server/db/index.js');
const {hashStudentPassword}=await import('../server/middleware/student-auth.js');
const {createQuestion}=await import('../server/services/question-write.js');
const {questionContentRevision}=await import('../server/services/question-answers.js');
db.exec("INSERT INTO users(email,password_hash,role) VALUES('author@test.invalid','unused','super_admin'); INSERT INTO curricula(slug,status) VALUES('test','published'); INSERT INTO subjects(slug,status) VALUES('test','published'); INSERT INTO curriculum_subjects(curriculum_id,subject_id) VALUES(1,1); INSERT INTO modules(slug,subject_id,status) VALUES('test',1,'published'); INSERT INTO topics(slug,module_id,status) VALUES('test',1,'published');");
for(const [table,fk,name] of [['curriculum_translations','curriculum_id','Test curriculum'],['subject_translations','subject_id','Test subject'],['module_translations','module_id','Test module'],['topic_translations','topic_id','Practice questions']])for(const lang of ['en','uz','ru'])db.prepare(`INSERT INTO ${table}(${fk},lang,name) VALUES(1,?,?)`).run(lang,name);
const hash=hashStudentPassword('AnswerTest123!');
for(let i=1;i<=3;i++)db.prepare("INSERT INTO students(full_name,contact,contact_type,password_hash,curriculum_id) VALUES(?,?,'email',?,1)").run('Test learner '+i,'learner'+i+'@test.invalid',hash);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');fs.mkdirSync(process.env.STORAGE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.STORAGE_DIR,'test.png'),png);
// Use the existing uploader schema fields for a harmless image fixture.
// Core distribution tests don't require images; browser fixture adds one through admin API if desired.
function makeQuestion(multiple=false){const id=createQuestion({topicId:1,user:{id:1},payload:{status:'published',translations:Object.fromEntries(['en','uz','ru'].map(lang=>[lang,{question_text:multiple?'Select the two matching options.':'Which option matches the description?',explanation_blocks:[{type:'paragraph',text:'The answer follows the example description.'}]}])),options:['A','B','C','D'].map((option_key,i)=>({option_key,is_correct:i===0||multiple&&i===1,translations:{en:['First option','Second option','Third option','Fourth option'][i],uz:['Birinchi','Ikkinchi','Uchinchi','To‘rtinchi'][i],ru:['Первый','Второй','Третий','Четвёртый'][i]}}))}});if(multiple)db.prepare("UPDATE question_cms SET question_type='multiple_correct' WHERE question_id=?").run(id);return {id,publicId:db.prepare('SELECT question_id FROM questions WHERE id=?').get(id).question_id};}
const single=makeQuestion(),multi=makeQuestion(true);
const server=spawn(process.execPath,['server/app.js'],{env:process.env,stdio:['ignore','pipe','pipe']});let logs='';server.stderr.on('data',b=>logs+=b);server.stdout.on('data',b=>logs+=b);
const base='http://127.0.0.1:4197';
function client(){let cookie='',token='';return async(url,method='GET',body,expected=200,csrf=true)=>{const r=await fetch(base+url,{method,headers:{Cookie:cookie,'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':token}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{throw Error(method+' '+url+' returned '+r.status+' '+raw.slice(0,300));}assert.equal(r.status,expected,JSON.stringify(data));if(data.csrfToken)token=data.csrfToken;return data;};}
try{
 for(let i=0;i<60;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const clients=[client(),client(),client()],guest=client();
 for(let i=0;i<3;i++)await clients[i]('/api/auth/login','POST',{contact:'learner'+(i+1)+'@test.invalid',password:'AnswerTest123!'});
 const list=await clients[0]('/api/public/learn/test/test/test/test/questions?lang=en');const question=list.questions.find(q=>q.id===single.id);assert.equal(question.content_revision,questionContentRevision(single.id));assert.equal(question.community,undefined);
 const endpoint='/api/auth/questions/'+single.publicId+'/answer';
 const payload={content_revision:question.content_revision,selected_keys:['A']};
 await guest(endpoint,'POST',payload,401);await clients[0](endpoint,'POST',payload,403,false);
 for(const selected_keys of [[],['Z'],['A','A'],['A','B'],['A',{}]])await clients[0](endpoint,'POST',{...payload,selected_keys},400);
 await clients[0](endpoint,'POST',{...payload,content_revision:'stale'},409);
 assert.equal(db.prepare('SELECT count(*) n FROM student_question_answers').get().n,0);
 let stats=await clients[0](endpoint,'POST',{...payload,is_correct:false,student_id:3});assert.equal(stats.total_learners,1);assert.equal(stats.correct_percent,100);assert.equal(stats.options.find(o=>o.key==='A').percentage,100);assert.equal(stats.options.find(o=>o.key==='B').percentage,0);
 assert.ok(!JSON.stringify(stats).includes('student_id'));
 stats=await clients[1](endpoint,'POST',{...payload,selected_keys:['B'],is_correct:true});assert.equal(stats.total_learners,2);assert.equal(stats.correct_percent,50);assert.equal(stats.incorrect_percent,50);assert.equal(stats.options.find(o=>o.key==='B').percentage,50);
 stats=await clients[0](endpoint,'POST',{...payload,selected_keys:['D']});assert.equal(stats.recorded,false);assert.equal(stats.total_learners,2);assert.equal(stats.options.find(o=>o.key==='D').count,0);
 await Promise.all(Array.from({length:5},()=>clients[2](endpoint,'POST',payload)));stats=await clients[0](endpoint,'POST',payload);assert.equal(stats.total_learners,3);assert.equal(stats.correct_percent,67);
 // Counts persist across a new login and do not depend on language.
 const fresh=client();await fresh('/api/auth/login','POST',{contact:'learner1@test.invalid',password:'AnswerTest123!'});assert.equal((await fresh(endpoint,'POST',payload)).total_learners,3);
 assert.equal((await fresh('/api/public/learn/test/test/test/test/questions?lang=uz')).questions.find(q=>q.id===single.id).content_revision,question.content_revision);
 db.prepare("UPDATE questions SET reference='Reference edit' WHERE id=?").run(single.id);assert.equal(questionContentRevision(single.id),question.content_revision);
 db.prepare("UPDATE question_option_translations SET text='Changed option' WHERE option_id IN (SELECT id FROM question_options WHERE question_id=? AND option_key='D') AND lang='en'").run(single.id);
 await fresh(endpoint,'POST',payload,409);const changed=questionContentRevision(single.id);stats=await fresh(endpoint,'POST',{...payload,content_revision:changed});assert.equal(stats.total_learners,1);assert.equal(db.prepare('SELECT count(*) n FROM student_question_answers WHERE question_id=?').get(single.id).n,4);
 const multiPayload={content_revision:questionContentRevision(multi.id),selected_keys:['A','B']},multiEndpoint='/api/auth/questions/'+multi.publicId+'/answer';
 stats=await clients[0](multiEndpoint,'POST',multiPayload);assert.equal(stats.correct_percent,100);assert.equal(stats.options[0].percentage,100);assert.equal(stats.options[1].percentage,100);
 stats=await clients[1](multiEndpoint,'POST',{...multiPayload,selected_keys:['A']});assert.equal(stats.correct_percent,50);assert.equal(stats.options[0].percentage,100);assert.equal(stats.options[1].percentage,50);
 for(const [table,id] of [['questions',single.id],['topics',1],['modules',1],['subjects',1],['curricula',1]]){db.prepare(`UPDATE ${table} SET status='draft' WHERE id=?`).run(id);await fresh(endpoint,'POST',{...payload,content_revision:changed},404);db.prepare(`UPDATE ${table} SET status='published' WHERE id=?`).run(id);}
 db.prepare("UPDATE students SET status='blocked' WHERE id=3").run();await clients[2](endpoint,'POST',{...payload,content_revision:changed},401);
 assert.deepEqual(db.pragma('foreign_key_check'),[]);
 console.log('PASS: real percentages, all options including zero, first-answer deduplication, concurrency, server grading, multi-answer counts, revision isolation, auth/CSRF, blocked accounts, published hierarchy and persistent data.');
} catch(e){console.error(logs);throw e;} finally{
 if(server.exitCode===null&&server.signalCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped;}db.close();
 if(process.env.KEEP_ANSWER_FIXTURE==='1')console.log('Browser fixture:',dir);else fs.rmSync(dir,{recursive:true,force:true});
}
