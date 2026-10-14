import crypto from 'node:crypto';
import {db} from '../db/index.js';

// Option database IDs change on ordinary saves, so hash stable option keys and
// actual content instead. Status/source/explanation-only edits retain the cohort.
export function questionContentRevision(id){
 const question=db.prepare('SELECT question_type FROM question_cms WHERE question_id=?').get(id);
 const stems=db.prepare('SELECT lang,question_text FROM question_translations WHERE question_id=? AND trim(question_text)<>\'\' ORDER BY lang').all(id);
 const options=db.prepare(`SELECT o.option_key,o.is_correct,t.lang,t.text FROM question_options o
 LEFT JOIN question_option_translations t ON t.option_id=o.id
 WHERE o.question_id=? ORDER BY o.option_key,t.lang`).all(id);
 const images=db.prepare('SELECT question_image_media_id FROM questions WHERE id=?').get(id);
 const extraImages=db.prepare("SELECT media_id FROM question_media_links WHERE question_id=? AND role='question' ORDER BY media_id").all(id);
 return crypto.createHash('sha256').update(JSON.stringify({question,stems,options,images,extraImages})).digest('hex');
}
function fail(message,status=400){const error=new Error(message);error.status=status;error.answerSafe=true;throw error;}
export function recordQuestionAnswer(publicId,studentId,payload){return db.transaction(()=>{
 const q=db.prepare(`SELECT q.id,c.question_type FROM questions q JOIN question_cms c ON c.question_id=q.id
 JOIN topics t ON t.id=q.topic_id JOIN modules m ON m.id=t.module_id JOIN subjects s ON s.id=m.subject_id
 WHERE q.question_id=? COLLATE NOCASE AND q.status='published' AND t.status='published' AND m.status='published'
 AND s.status='published' AND EXISTS(SELECT 1 FROM curriculum_subjects cs JOIN curricula cur ON cur.id=cs.curriculum_id WHERE cs.subject_id=s.id AND cur.status='published')`).get(publicId);
 if(!q)fail('Question not found.',404);
 const revision=questionContentRevision(q.id);
 if(payload?.content_revision!==revision)fail('Question changed. Reload it before answering.',409);
 const keys=payload?.selected_keys;
 const options=db.prepare('SELECT option_key,is_correct FROM question_options WHERE question_id=? ORDER BY display_order').all(q.id);
 if(!Array.isArray(keys)||!keys.length||keys.length>8||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!options.some(o=>o.option_key===k))||(q.question_type!=='multiple_correct'&&keys.length!==1))fail('Choose valid answer options.');
 const correctKeys=options.filter(o=>o.is_correct).map(o=>o.option_key);
 const correct=keys.length===correctKeys.length&&keys.every(k=>correctKeys.includes(k));
 const inserted=db.prepare('INSERT OR IGNORE INTO student_question_answers(question_id,student_id,content_revision,selected_keys,is_correct) VALUES(?,?,?,?,?)').run(q.id,studentId,revision,JSON.stringify([...keys].sort()),Number(correct));
 const totals=db.prepare('SELECT count(*) total,sum(is_correct) correct FROM student_question_answers WHERE question_id=? AND content_revision=?').get(q.id,revision);
 const counts=db.prepare(`SELECT j.value key,count(*) count FROM student_question_answers a,json_each(a.selected_keys) j
 WHERE a.question_id=? AND a.content_revision=? GROUP BY j.value`).all(q.id,revision);
 const correctPercent=Math.round(100*totals.correct/totals.total);
 return {recorded:inserted.changes===1,content_revision:revision,total_learners:totals.total,correct_percent:correctPercent,incorrect_percent:100-correctPercent,
  options:options.map(o=>{const count=counts.find(c=>c.key===o.option_key)?.count||0;return {key:o.option_key,count,percentage:Math.round(100*count/totals.total)};})};
})();}
