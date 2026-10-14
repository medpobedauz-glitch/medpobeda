import {Router} from 'express';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {db} from '../db/index.js';
import {requireRole} from '../middleware/auth-roles.js';
import {csrfProtection} from '../middleware/csrf.js';
import {can,audit} from '../middleware/auth.js';
import {taxonomy} from '../services/pdf-classification.js';
import {problem,text,fullQuestion,listQuestions,saveQuestion,duplicates,resolveDuplicate,STATUSES,TYPES} from '../services/central-qbank.js';
import {aiConfig,translationDraft,translateSaved,assistQuestion} from '../services/qbank-ai.js';
import {parseCsv,suggestedMapping,mapRows,exportCsv,CSV_FIELDS} from '../services/qbank-csv.js';
const router=Router();router.use(requireRole('read'));router.use((req,res,next)=>['GET','HEAD'].includes(req.method)?next():csrfProtection(req,res,next));
function checkStatus(user,status){if(['approved','published','rejected'].includes(status)&&!can(user.role,'review')&&!can(user.role,'publish'))problem('Review permission is required.',403);}
const ids=body=>{if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>500||body.ids.some(x=>!Number.isInteger(x)||x<1))problem('Select 1–500 questions.');return [...new Set(body.ids)];};
function log(req,action,id,details={}){audit(req.user.id,action,'central_qbank',id,'Question Bank',details,req.ip);}
router.get('/context',(req,res)=>res.json({...taxonomy(),sources:db.prepare('SELECT * FROM content_sources ORDER BY name').all(),types:db.prepare('SELECT * FROM question_types').all(),statuses:STATUSES,ai:aiConfig(),can_write:can(req.user.role,'write'),can_review:can(req.user.role,'review')||can(req.user.role,'publish')}));
router.get('/stats',(_req,res)=>res.json({total:db.prepare('SELECT count(*) n FROM questions').get().n,statuses:db.prepare('SELECT workflow_status status,count(*) count FROM question_cms GROUP BY workflow_status').all(),subjects:db.prepare('SELECT m.subject_id id,count(*) count FROM questions q JOIN topics t ON t.id=q.topic_id JOIN modules m ON m.id=t.module_id GROUP BY m.subject_id').all(),topics:db.prepare('SELECT t.module_id id,count(*) count FROM questions q JOIN topics t ON t.id=q.topic_id GROUP BY t.module_id').all(),subtopics:db.prepare('SELECT topic_id id,count(*) count FROM questions GROUP BY topic_id').all(),sources:db.prepare('SELECT source_id id,count(*) count FROM question_cms GROUP BY source_id').all(),languages:db.prepare("SELECT lang,count(*) count FROM question_translations WHERE trim(question_text)<>'' GROUP BY lang").all()}));
router.get('/sources',(_req,res)=>res.json(db.prepare('SELECT * FROM content_sources ORDER BY name').all()));
function sourcePayload(body){if(!['book','platform','own','faculty','other'].includes(body.type))problem('Choose a valid source type.');const fields={};for(const key of ['name','author','publication','edition_year','reference_info','notes'])fields[key]=text(body[key]||'',key==='notes'||key==='reference_info'?10000:300);if(!fields.name)problem('Source name is required.');return {...fields,type:body.type};}
router.post('/sources',requireRole('write'),(req,res)=>{const s=sourcePayload(req.body);const id=db.prepare('INSERT INTO content_sources(name,type,author,publication,edition_year,reference_info,notes,created_by) VALUES(?,?,?,?,?,?,?,?)').run(s.name,s.type,s.author,s.publication,s.edition_year,s.reference_info,s.notes,req.user.id).lastInsertRowid;log(req,'create_source',id);res.status(201).json({id,...s});});
router.put('/sources/:id',requireRole('write'),(req,res)=>{const old=db.prepare('SELECT * FROM content_sources WHERE id=?').get(Number(req.params.id));if(!old)problem('Source not found.',404);const s=sourcePayload({...old,...req.body});db.prepare("UPDATE content_sources SET name=?,type=?,author=?,publication=?,edition_year=?,reference_info=?,notes=?,updated_at=datetime('now') WHERE id=?").run(s.name,s.type,s.author,s.publication,s.edition_year,s.reference_info,s.notes,old.id);log(req,'edit_source',old.id,{before:old,after:s});res.json({id:old.id,...s});});
router.get('/questions',(req,res)=>res.json(listQuestions(req.query)));
router.post('/export',async(req,res)=>{const filters=req.body?.filters||{};if(req.body.ids)filters.ids=ids(req.body);const iterator=exportCsv(filters);const first=iterator.next();res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="medical-question-bank.csv"');res.write(first.value);for(const chunk of iterator){if(res.destroyed)break;if(!res.write(chunk))await once(res,'drain');}res.end();});
router.post('/import/columns',requireRole('write'),(req,res)=>{const parsed=parseCsv(req.body.csv);res.json({headers:parsed.headers,mapping:suggestedMapping(parsed.headers),fields:CSV_FIELDS,rows:parsed.rows.slice(0,5),total:parsed.rows.length});});
router.post('/import/preview',requireRole('write'),(req,res)=>{
 const parsed=parseCsv(req.body.csv),rows=mapRows(parsed,req.body.mapping||{},req.body.source_id);const errors=rows.filter(r=>r.error);const token=crypto.randomUUID();
 db.prepare("DELETE FROM csv_import_previews WHERE expires_at<datetime('now')").run();
 if(!errors.length)db.prepare("INSERT INTO csv_import_previews(token,user_id,data,expires_at) VALUES(?,?,?,datetime('now','+1 hour'))").run(token,req.user.id,JSON.stringify(rows.map(r=>r.data)));
 res.json({token:errors.length?null:token,total:rows.length,rows:rows.slice(0,20),errors});
});
router.post('/import/confirm',requireRole('write'),(req,res)=>{const result=db.transaction(()=>{
 const preview=db.prepare("SELECT * FROM csv_import_previews WHERE token=? AND user_id=? AND expires_at>datetime('now')").get(String(req.body.token||''),req.user.id);if(!preview)problem('Preview expired. Preview your CSV again.');if(preview.consumed)return JSON.parse(preview.result);
 const rows=JSON.parse(preview.data).map(data=>{const q=saveQuestion(data,req.user);return {id:q.id,question_id:q.question_id};});db.prepare('UPDATE csv_import_previews SET consumed=1,result=? WHERE token=?').run(JSON.stringify(rows),preview.token);return rows;})();log(req,'import_csv',null,{count:result.length});res.status(201).json({rows:result});});
router.post('/bulk',requireRole('write','review','publish'),(req,res)=>{
 const selected=ids(req.body);const status=req.body.status;if(!STATUSES.includes(status)&&req.body.action!=='move')problem('Choose a valid bulk action.');if(status)checkStatus(req.user,status);
 if(req.body.action==='move'&&!can(req.user.role,'write'))problem('Editing permission is required.',403);
 const rows=db.transaction(()=>selected.map(id=>{const q=fullQuestion(id);if(req.body.versions?.[id]!==q.version)problem('A selected question changed. Refresh the list.',409);return saveQuestion({version:q.version,...(req.body.action==='move'?{subject_id:req.body.subject_id,topic_id:req.body.topic_id,subtopic_id:req.body.subtopic_id,status:'review'}:{status})},req.user,id);} ))();log(req,'bulk_'+(status||'move'),null,{ids:selected});res.json({rows});
});
router.post('/translate-draft',requireRole('write'),async(req,res)=>res.json(await translationDraft(req.body.question||{},req.body.source,req.body.target,req.body.retranslate===true)));
router.post('/assist',requireRole('write'),async(req,res)=>res.json(await assistQuestion(req.body.question||{},req.body.task)));
router.post('/questions',requireRole('write'),(req,res)=>{checkStatus(req.user,req.body.status);const q=saveQuestion(req.body,req.user);log(req,'create',q.id);res.status(201).json(q);});
router.get('/questions/:id',(req,res)=>res.json(fullQuestion(req.params.id)));
router.put('/questions/:id',requireRole('write'),(req,res)=>{checkStatus(req.user,req.body.status);const q=saveQuestion(req.body,req.user,Number(req.params.id));log(req,'edit',q.id);res.json(q);});
router.get('/questions/:id/history',(req,res)=>{fullQuestion(req.params.id);res.json(db.prepare('SELECT * FROM question_history WHERE question_id=? ORDER BY id DESC LIMIT 100').all(Number(req.params.id)).map(h=>({...h,snapshot:JSON.parse(h.snapshot)})));});
router.get('/questions/:id/duplicates',(req,res)=>res.json({rows:duplicates(Number(req.params.id))}));
router.post('/questions/:id/duplicates',requireRole('write'),(req,res)=>{if(req.body.action!=='keep')checkStatus(req.user,'rejected');const q=resolveDuplicate(Number(req.params.id),Number(req.body.other_id),req.body.action,req.user,req.body);log(req,'duplicate_'+req.body.action,q.id,{other:req.body.other_id});res.json(q);});
router.post('/questions/:id/translate',requireRole('write'),async(req,res)=>{const result=await translateSaved(Number(req.params.id),req.body.version,req.body.source,req.body.target,req.body.retranslate===true,req.user);log(req,'translate',Number(req.params.id),{source:req.body.source,target:req.body.target});res.json(result);});
router.use((err,req,res,next)=>err.cmsSafe?res.status(err.status||400).json({error:err.message}):next(err));
export default router;
