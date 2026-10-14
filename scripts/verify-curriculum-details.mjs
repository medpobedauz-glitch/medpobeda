import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setLang} from '../src/i18n/index.js';
import {renderCurriculumDetail} from '../src/pages/curriculum-detail.js';
import {curriculumCatalogHtml} from '../src/components/curriculum-catalog.js';
import {curriculaData,getSubjectName} from '../src/data/curricula.js';
globalThis.document={documentElement:{}};
for(const lang of ['uz','en','ru']) {
 setLang(lang);
 const cards=curriculumCatalogHtml();
 assert.equal((cards.match(/class="academic-card academic-card--/g)||[]).length,3);
 for(const track of curriculaData){
  assert(cards.includes(`href="/${lang}/curricula/${track.id}"`));
  const detail=renderCurriculumDetail(lang,{track:track.id});
  assert.equal(detail.titleKey,`curriculum.${track.id}.title`);
  for(const subject of track.subjects)assert(detail.bodyHtml.includes(getSubjectName(subject.id)));
  assert(detail.bodyHtml.includes('bsmi.uz'));
  assert(fs.existsSync(`public/images/curricula/${track.id}.png`));
 }
 assert.equal(renderCurriculumDetail(lang,{track:'unknown'}).titleKey,'notfound.title');
}
console.log('Curriculum cards and details: 3 tracks × 3 languages, subject coverage, source links and unknown-track handling OK.');
