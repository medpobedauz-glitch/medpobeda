import {db} from '../db/index.js';
export function recordQuestionHistory(id,userId,reason='edit') {
 const q=db.prepare('SELECT * FROM questions WHERE id=?').get(id);if(!q)return;
 const cms=db.prepare('SELECT * FROM question_cms WHERE question_id=?').get(id);if(!cms)return;
 const snapshot={question:q,cms,translations:db.prepare('SELECT * FROM question_translations WHERE question_id=?').all(id),options:db.prepare('SELECT o.*, (SELECT json_group_object(lang,text) FROM question_option_translations WHERE option_id=o.id) AS translations FROM question_options o WHERE question_id=? ORDER BY display_order').all(id),sources:db.prepare('SELECT * FROM question_source_links WHERE question_id=?').all(id),images:db.prepare('SELECT * FROM question_media_links WHERE question_id=?').all(id)};
 db.prepare('INSERT INTO question_history(question_id,version,snapshot,changed_by,reason) VALUES(?,?,?,?,?)').run(id,cms.version,JSON.stringify(snapshot),userId,reason);
 db.prepare('UPDATE question_cms SET version=version+1 WHERE question_id=?').run(id);
}
export function attachSource(id,sourceId,reference,metadata={}) {
 const source=sourceId?db.prepare('SELECT * FROM content_sources WHERE id=?').get(sourceId):null;
 const value=JSON.stringify({source,...metadata});
 if(!db.prepare('SELECT id FROM question_source_links WHERE question_id=? AND source_id IS ? AND source_reference=? AND metadata=?').get(id,sourceId||null,reference||'',value))db.prepare('INSERT INTO question_source_links(question_id,source_id,source_reference,metadata) VALUES(?,?,?,?)').run(id,sourceId||null,reference||'',value);
}
