import { t, langPath } from '../i18n/index.js';
import { curriculaData, getSubjectName } from '../data/curricula.js';
import { curriculumIcons } from '../pages/curricula-icons.js';

export function curriculumCatalogHtml() {
  return '<div class="academic-cards">'+curriculaData.map(c=>
    '<a class="academic-card academic-card--'+c.id+'" href="'+langPath('curricula/'+c.id)+'">'+
    '<img class="academic-card__art" src="/images/curricula/'+c.id+'.png" alt="" width="1536" height="1024" loading="lazy">'+
    '<span class="academic-card__icon" aria-hidden="true">'+(curriculumIcons[c.icon]||'')+'</span>'+
    '<h3>'+t('curriculum.'+c.id+'.title')+'</h3><p>'+t('curriculum.'+c.id+'.desc')+'</p>'+
    '<div class="academic-card__tags">'+c.subjects.slice(0,3).map(s=>'<span>'+getSubjectName(s.id)+'</span>').join('')+'<span>'+t('home.curricula.tag.more')+'</span></div>'+
    '<span class="academic-card__cta">'+t('home.curricula.cta')+' <span aria-hidden="true">→</span></span></a>'
  ).join('')+'</div>';
}
