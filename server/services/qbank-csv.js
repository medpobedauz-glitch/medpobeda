import {problem,fullQuestion,prepareQuestion,queryQuestions,findDuplicates} from './central-qbank.js';
import {db} from '../db/index.js';
export const CSV_FIELDS=[['ID','question_id'],['Subject','subject'],['Topic','topic'],['Subtopic','subtopic'],['Question Type','question_type'],['Difficulty','difficulty'],['Question English','question_english'],['Question Uzbek','question_uzbek'],...['english','uzbek'].flatMap(lang=>['a','b','c','d','e','f','g','h'].map(k=>['Option '+k.toUpperCase()+' '+(lang==='english'?'English':'Uzbek'),'option_'+k+'_'+lang])),['Correct Answer','correct_answer'],['Explanation English','explanation_english'],['Explanation Uzbek','explanation_uzbek'],['Source','source'],['Source Reference','source_reference'],['Tags','tags'],['Status','status'],['Created By','created_by_name'],['Reviewed By','reviewed_by_name'],['Created At','created_at'],['Updated At','updated_at']];
export function parseCsv(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>5*1024*1024)problem('CSV limit is 5 MB.');
 const input=raw.replace(/^\uFEFF/,'');const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'){if(input[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c==='"'){if(value||closed)problem('Malformed CSV quotes.');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>2001)problem('Import up to 2,000 rows per CSV.');}}else{if(closed)problem('Unexpected text after closing CSV quote.');value+=c;}}
 if(quoted)problem('CSV has an unclosed quoted field.');if(value||row.length){row.push(value);rows.push(row);}if(rows.length>2001)problem('Import up to 2,000 rows per CSV.');if(rows.length<2)problem('CSV needs a header and at least one question.');
 const headers=rows.shift();if(headers.some(h=>!h.trim())||new Set(headers).size!==headers.length)problem('CSV headers must be nonempty and unique.');if(rows.some(r=>r.length!==headers.length))problem('CSV rows must have the same number of columns as the header.');return {headers,rows};
}
const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function suggestedMapping(headers){return Object.fromEntries(CSV_FIELDS.map(([label,field])=>[field,headers.find(h=>key(h)===key(label)||key(h)===key(field))||'']));}
function findNamed(table,trans,fk,value,parentColumn,parentId){const sql=`SELECT DISTINCT x.id FROM ${table} x LEFT JOIN ${trans} tr ON tr.${fk}=x.id WHERE (lower(x.slug)=lower(?) OR lower(tr.name)=lower(?))`+(parentColumn?` AND x.${parentColumn}=?`:'');const rows=db.prepare(sql).all(value,value,...(parentColumn?[parentId]:[]));if(rows.length!==1)problem('Unknown or ambiguous '+table+': '+value);return rows[0].id;}
export function mapRows(csv,mapping,defaultSource){
 const allowed=new Set(CSV_FIELDS.map(x=>x[1]));for(const [field,column] of Object.entries(mapping)){if(!allowed.has(field)||column&&!csv.headers.includes(column))problem('Invalid CSV column mapping.');}
 return csv.rows.map((cells,index)=>{try{
  const data={};for(const [field,column] of Object.entries(mapping))if(column)data[field]=cells[csv.headers.indexOf(column)];
  data.subject_id=findNamed('subjects','subject_translations','subject_id',data.subject||'');data.topic_id=findNamed('modules','module_translations','module_id',data.topic||'','subject_id',data.subject_id);data.subtopic_id=findNamed('topics','topic_translations','topic_id',data.subtopic||'','module_id',data.topic_id);
  let sources=[];if(data.source)sources=db.prepare('SELECT id FROM content_sources WHERE name=? COLLATE NOCASE').all(data.source);if(sources.length>1)problem('Ambiguous source name.');data.source_id=sources[0]?.id||Number(defaultSource)||null;if(data.source&&!sources.length)problem('Create the source before importing: '+data.source);if(!data.source_id)problem('Select a source for imported questions.');
  data.status='review';data.question_type=data.question_type||'single_best';data.difficulty=(data.difficulty||'medium').toLowerCase();
  if(!data.question_english?.trim()&&!data.question_uzbek?.trim())problem('Question text is required in at least one language.');
  const ready=prepareQuestion(data);const matches=findDuplicates({...data,id:0,tags:ready.tags,options:ready.write.options});return {row:index+2,data,possible_duplicates:matches.slice(0,3)};
 }catch(e){return {row:index+2,error:e.cmsSafe?e.message:'Invalid row.'};}});
}
export function csvCell(value){let s=Array.isArray(value)?value.join(', '):String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function* exportCsv(filters){const {sql,params}=queryQuestions(filters);yield '\uFEFF'+CSV_FIELDS.map(([name])=>csvCell(name)).join(',')+'\r\n';for(const row of db.prepare('SELECT q.id'+sql+' ORDER BY q.id').iterate(...params)){const q=fullQuestion(row.id);yield CSV_FIELDS.map(([,field])=>csvCell(q[field])).join(',')+'\r\n';}}
