import { t, langPath, getLang } from '../i18n/index.js';
import { getCurriculumById, getSubjectName, getSubjectDescription } from '../data/curricula.js';
import { renderNotFound } from './404.js';
const words={
 en:{back:'All curricula',overview:'Curriculum overview',duration:'Typical degree duration',years:'years',subjects:'Subjects to explore',coverage:'Sample subject coverage',notice:'These are introductory subject areas on MedPobeda, not a complete university syllabus. Subject hours, semesters and lesson lengths will be added when confirmed.',durationNote:'Duration refers to the university degree, not a MedPobeda subscription or online course. The examples below follow published Uzbek university programmes; confirm the duration and curriculum with your own university.',source:'University programme reference',explore:'Explore this curriculum',format:'Study format',fulltime:'Full-time university study'},
 uz:{back:'Barcha yo‘nalishlar',overview:'Ta’lim yo‘nalishi haqida',duration:'Odatdagi ta’lim muddati',years:'yil',subjects:'O‘rganiladigan fanlar',coverage:'Fanlarning namunaviy ro‘yxati',notice:'Bular MedPobeda’dagi boshlang‘ich fan yo‘nalishlari, universitetning to‘liq o‘quv rejasi emas. Fan soatlari, semestrlar va dars davomiyligi tasdiqlangach qo‘shiladi.',durationNote:'Muddat universitetdagi ta’limga tegishli, MedPobeda obunasi yoki onlayn kursga emas. Misollar O‘zbekiston universitetlarining e’lon qilingan dasturlariga asoslangan; muddat va o‘quv rejasini o‘z universitetingiz bilan aniqlashtiring.',source:'Universitet dasturi manbasi',explore:'Yo‘nalishni o‘rganish',format:'Ta’lim shakli',fulltime:'Kunduzgi universitet ta’limi'},
 ru:{back:'Все направления',overview:'Обзор направления',duration:'Типичная продолжительность обучения',years:'лет',subjects:'Предметы для изучения',coverage:'Примерный список предметов',notice:'Это вводные предметы MedPobeda, а не полный учебный план университета. Часы, семестры и длительность уроков будут добавлены после подтверждения.',durationNote:'Срок относится к университетской программе, а не к подписке или онлайн-курсу MedPobeda. Примеры основаны на опубликованных программах университетов Узбекистана; уточняйте сроки и учебный план в своём университете.',source:'Источник: университетская программа',explore:'Изучить направление',format:'Форма обучения',fulltime:'Очное обучение в университете'},
};
export function renderCurriculumDetail(lang,params={}) {
 const c=getCurriculumById(params.track);if(!c)return renderNotFound();
 const w=words[getLang()]||words.en;
 const years=c.id==='medicine'?6:5;
 const source='https://bsmi.uz/en/announcements/to-the-attention-of-applicants-who-want-to-get-a-higher-medical-education-and-intend-to-study-at-the-leading-higher-medical-educational-institutions-of-the-world/';
 return {titleKey:'curriculum.'+c.id+'.title',descKey:'curriculum.'+c.id+'.desc',activePage:'curricula',bodyHtml:
 '<section class="academic-detail academic-card--'+c.id+'"><div class="container">'+
 '<a class="academic-detail__back" href="'+langPath('curricula')+'">← '+w.back+'</a>'+
 '<div class="academic-detail__hero"><div><p class="academic-detail__eyebrow">'+w.overview+'</p><h1>'+t('curriculum.'+c.id+'.title')+'</h1><p>'+t('curriculum.'+c.id+'.desc')+'</p>'+
 '<a class="btn btn--primary" href="'+langPath('curricula')+'?track='+c.id+'#subject-explorer-body">'+w.explore+' →</a></div><img src="/images/curricula/'+c.id+'.png" alt="" width="1536" height="1024"></div>'+
 '<dl class="academic-detail__facts"><div><dt>'+w.duration+'</dt><dd>'+years+' '+w.years+'</dd></div><div><dt>'+w.format+'</dt><dd>'+w.fulltime+'</dd></div><div><dt>'+w.coverage+'</dt><dd>'+c.subjects.length+'</dd></div></dl>'+
 '<p class="academic-detail__note">'+w.durationNote+' <a href="'+source+'" target="_blank" rel="noopener noreferrer">'+w.source+' ↗</a></p>'+
 '<div class="academic-detail__heading"><h2>'+w.subjects+'</h2><p>'+w.notice+'</p></div>'+
 '<div class="academic-detail__subjects">'+c.subjects.map((subject,i)=>'<article><span class="academic-detail__number">'+String(i+1).padStart(2,'0')+'</span><h3>'+getSubjectName(subject.id)+'</h3><p>'+getSubjectDescription(subject.id)+'</p></article>').join('')+'</div></div></section>',init:null};
}
