// Isolated regression suite: never writes the application's database or uploads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { up } from '../server/db/migrations/006_question_features.js';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medpobeda-questions-'));
process.env.DATABASE_PATH = path.join(dir, 'test.sqlite');
process.env.STORAGE_DIR = path.join(dir, 'uploads');
process.env.PDF_IMPORT_DIR = path.join(dir, 'pdf-imports');
process.env.PORT = '4097';
process.env.NODE_ENV = 'production';
process.env.COOKIE_SECURE = 'false';
// Exercise both historical schema variants, backfill, permanence, and non-reuse.
for (const extra of [false, true]) {
  const d = new Database(':memory:');
  d.exec(`CREATE TABLE media(id INTEGER PRIMARY KEY); CREATE TABLE students(id INTEGER PRIMARY KEY);
    CREATE TABLE questions(id INTEGER PRIMARY KEY, text TEXT${extra ? ', question_id TEXT, reference TEXT, explanation_image_media_id INTEGER' : ''});
    INSERT INTO questions(id,text) VALUES(90,'old'),(300,'existing');`);
  up(d);
  assert.deepEqual(d.prepare('SELECT question_id FROM questions ORDER BY id').all().map(q => q.question_id), ['MP0070001','MP0070002']);
  assert.equal(d.prepare('SELECT text FROM questions WHERE id=90').get().text, 'old');
  assert.throws(() => d.exec("UPDATE questions SET question_id='MP0070999' WHERE id=90"));
  d.exec("DELETE FROM questions WHERE id=300; INSERT INTO questions(id,text) VALUES(301,'new')");
  assert.equal(d.prepare('SELECT question_id FROM questions WHERE id=301').get().question_id, 'MP0070003');
  assert.throws(() => d.exec("INSERT INTO questions(id,question_id) VALUES(302,'MP0070001')"));
  d.close();
}
const { runPendingMigrations } = await import('./migrate.mjs');
runPendingMigrations(); assert.equal(runPendingMigrations().ran, 0);
const { db } = await import('../server/db/index.js');
const { hashPassword } = await import('../server/middleware/auth.js');
db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,'super_admin')").run('test@example.test', hashPassword('QuestionTest123'));
db.exec(`INSERT INTO curricula(slug,status) VALUES('test','published');
 INSERT INTO subjects(slug,status) VALUES('test','published');
 INSERT INTO curriculum_subjects(curriculum_id,subject_id) VALUES(1,1);
 INSERT INTO modules(slug,subject_id,status) VALUES('test',1,'published');
 INSERT INTO topics(slug,module_id,status) VALUES('test',1,'published');`);
const server = spawn(process.execPath, ['server/app.js'], { env: process.env, stdio: ['ignore','pipe','pipe'] });
let logs = ''; server.stderr.on('data', b => { logs += b; });
const base = 'http://127.0.0.1:4097';
function client() {
  let cookie = '', token = '';
  return async (url, method='GET', body, expected=200, csrf=true) => {
    const headers = { Cookie: cookie };
    if (csrf) headers['X-CSRF-Token'] = token;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(base+url, {method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
    if(r.headers.get('set-cookie')) cookie=r.headers.get('set-cookie').split(';')[0];
    const data=await r.json();
    assert.equal(r.status, expected, JSON.stringify(data));
    if(data.csrfToken) token=data.csrfToken;
    return data;
  };
}
try {
  for(let i=0;i<50;i++) { try { if((await fetch(base+'/health')).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
  const admin=client(), a=client(), b=client(), guest=client();
  await admin('/api/admin/auth/login','POST',{email:'test@example.test',password:'QuestionTest123'});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  async function upload(bytes, type, expected=201) { const f=new FormData();f.append('file',new Blob([bytes],{type}),type==='image/png'?'test.png':'bad.txt');return admin('/api/admin/media/upload','POST',f,expected); }
  const im1=await upload(png,'image/png'),im2=await upload(png,'image/png');
  await upload('invalid','text/plain',400);await upload('invalid','image/png',400);await upload(Buffer.alloc(9*1024*1024),'image/png',400);
  const payload={topic_id:1, question_image_media_id:im1.id,explanation_image_media_id:im2.id,reference:'Gray’s Anatomy',translations:{uz:{question_text:'Test question',explanation_blocks:[{type:'paragraph',text:'Explanation text'}]}},options:[{option_key:'A',is_correct:true,translations:{uz:'Yes'}},{option_key:'B',is_correct:false,translations:{uz:'No'}}]};
  const q=await admin('/api/admin/questions','POST',payload,201);assert.equal(q.question_id,'MP0070001');
  const concurrent=await Promise.all(Array.from({length:8},()=>admin('/api/admin/questions','POST',payload,201)));
  assert.equal(new Set(concurrent.map(q=>q.question_id)).size,8);
  assert.equal((await admin('/api/admin/questions?question_id=mp0070001'))[0].id,q.id);
  assert.deepEqual(await admin('/api/admin/questions?question_id=MP0079999'),[]);
  await admin('/api/admin/questions/'+q.id,'PUT',{reference:'Updated',question_image_media_id:null,explanation_image_media_id:null});
  let full=await admin('/api/admin/questions/'+q.id);assert.equal(full.question_id,q.question_id);assert.equal(full.question_image_media_id,null);assert.equal(full.explanation_image_media_id,null);assert.equal(full.options.length,2);
  await admin('/api/admin/questions/'+q.id,'PUT',{...payload,question_id:'MP0079999'});
  await admin('/api/admin/questions/'+q.id,'PUT',{question_image_media_id:999999},400);
  await admin('/api/admin/questions/'+q.id+'/publish','POST',{publish_lang:'uz'});
  const duplicate=await admin('/api/admin/questions/'+q.id+'/duplicate','POST',{},201);
  assert.ok(duplicate.id);
  assert.notEqual((await admin('/api/admin/questions/'+duplicate.id)).question_id,q.question_id);
  for(const [api,contact] of [[a,'a@example.test'],[b,'b@example.test']]) await api('/api/auth/register','POST',{full_name:'Test Student',contact,password:'StudentTest123'},201);
  await guest('/api/auth/bookmarks','GET',null,401);
  await a('/api/auth/bookmarks/'+q.question_id,'PUT',null,403,false);
  await a('/api/auth/bookmarks/'+q.question_id,'PUT');await a('/api/auth/bookmarks/'+q.question_id,'PUT');
  await a('/api/auth/login','POST',{contact:'a@example.test',password:'StudentTest123'});
  assert.equal((await a('/api/auth/bookmarks')).bookmarks.length,1);assert.equal((await b('/api/auth/bookmarks')).bookmarks.length,0);
  const pub=await a('/api/public/learn/test/test/test/test/questions?lang=uz');
  assert.equal(pub.questions[0].bookmarked,true);assert.equal(pub.questions[0].reference,payload.reference);assert.equal(pub.questions[0].explanation_image.mediaId,im2.id);
  assert.equal((await fetch(base+'/api/public/media/'+im1.id)).status,200);
  await admin('/api/admin/media/'+im2.id+'/archive','POST',{},400);
  await a('/api/auth/bookmarks/'+q.question_id,'DELETE');assert.equal((await a('/api/auth/bookmarks')).bookmarks.length,0);
  await a('/api/auth/bookmarks/MP0079999','PUT',null,404);
  const plain = await admin('/api/admin/questions','POST',{...payload,question_image_media_id:null,explanation_image_media_id:null,reference:''},201);
  const plainFull = await admin('/api/admin/questions/'+plain.id);
  assert.equal(plainFull.question_image_media_id,null);assert.equal(plainFull.reference,'');
  const imageOnly = await admin('/api/admin/questions','POST',{...payload,translations:{uz:{question_text:'Image-only explanation',explanation_blocks:[]}}},201);
  await admin('/api/admin/questions/'+imageOnly.id+'/publish','POST',{publish_lang:'uz'});
  const {renderExplanationBlocks} = await import('../server/services/explanations.js');
  assert.ok(!renderExplanationBlocks([{type:'paragraph',text:'&lt;img src=x onerror=alert(1)&gt;'}]).includes('<img'));
  const richBlocks = [{type:'rich_text',delta:{ops:[{insert:'Clinical term',attributes:{bold:true,italic:true,underline:true,color:'#b02a2a'}},{insert:'\n',attributes:{header:2}},{insert:'First point'},{insert:'\n',attributes:{list:'bullet'}},{insert:'Separate paragraph\n'}]}}];
  const richQuestion = await admin('/api/admin/questions','POST',{...payload,translations:{uz:{question_text:'Rich explanation question',explanation_blocks:richBlocks}}},201);
  let richFull = await admin('/api/admin/questions/'+richQuestion.id);
  assert.deepEqual(richFull.translations.uz.explanation_blocks,richBlocks);
  await admin('/api/admin/questions/'+richQuestion.id,'PUT',{reference:'Rich source'});
  richFull = await admin('/api/admin/questions/'+richQuestion.id);
  assert.equal(richFull.question_id,richQuestion.question_id);
  assert.deepEqual(richFull.translations.uz.explanation_blocks,richBlocks);
  await admin('/api/admin/questions/'+richQuestion.id+'/publish','POST',{publish_lang:'uz'});
  const richPublic = (await a('/api/public/learn/test/test/test/test/questions?lang=uz')).questions.find(x=>x.question_id===richQuestion.question_id);
  for(const markup of ['<h2>','<strong>','<em>','<u>','color:#b02a2a','<ul><li>First point</li></ul>','<p>Separate paragraph</p>']) assert.ok(richPublic.explanation_html.includes(markup),markup);
  assert.deepEqual(db.pragma('foreign_key_check'),[]);
  console.log('PASS: migrations, backfill, IDs, concurrent creation, search, uploads, edit/removal, duplication, publish, media, CSRF, bookmark persistence and student isolation.');
} finally { server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); db.close(); fs.rmSync(dir, { recursive: true, force: true }); if(logs) console.error(logs); }
