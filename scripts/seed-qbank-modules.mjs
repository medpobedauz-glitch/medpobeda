// Add editable section shells only. Never overwrite existing modules or invent questions.
import { db } from '../server/db/index.js';
const rows = {
 anatomy: [
 ['bones-joints-cartilage','Bones, joints and cartilage','Suyaklar, bo‘g‘imlar va tog‘aylar','Кости, суставы и хрящи'],
 ['muscles-tendons','Muscles and tendons','Mushaklar va paylar','Мышцы и сухожилия'],
 ['cardiovascular-lymphatic-nervous','Cardiovascular, lymphatic and nervous systems','Yurak-qon tomir, limfa va asab tizimlari','Сердечно-сосудистая, лимфатическая и нервная системы']],
 farmakologiya:[['general','General pharmacology','Umumiy farmakologiya','Общая фармакология'],['systems','System pharmacology','Tizimlar farmakologiyasi','Фармакология систем'],['clinical','Clinical pharmacology','Klinik farmakologiya','Клиническая фармакология']],
 biokimyo:[['molecules','Biomolecules and enzymes','Biomolekulalar va fermentlar','Биомолекулы и ферменты'],['metabolism','Metabolism','Moddalar almashinuvi','Обмен веществ'],['genetics','Molecular genetics','Molekulyar genetika','Молекулярная генетика']],
 mikrobiologiya:[['bacteria','Bacteriology','Bakteriologiya','Бактериология'],['viruses','Virology','Virusologiya','Вирусология'],['fungi-parasites','Mycology and parasitology','Mikologiya va parazitologiya','Микология и паразитология']],
 patologiya:[['general','General pathology','Umumiy patologiya','Общая патология'],['systemic','Systemic pathology','Tizimli patologiya','Системная патология']],
 'ichki-kasalliklar':[['cardiology','Cardiology','Kardiologiya','Кардиология'],['respiratory','Respiratory medicine','Nafas tizimi kasalliklari','Пульмонология'],['gastroenterology','Gastroenterology','Gastroenterologiya','Гастроэнтерология'],['endocrinology','Endocrinology','Endokrinologiya','Эндокринология']],
 'umumiy-jarrohlik':[['principles','Surgical principles','Jarrohlik asoslari','Основы хирургии'],['perioperative','Perioperative care','Operatsiya atrofidagi parvarish','Периоперационный уход'],['abdominal','Abdominal surgery','Qorin bo‘shlig‘i jarrohligi','Абдоминальная хирургия']],
 pediatriya:[['development','Growth and development','O‘sish va rivojlanish','Рост и развитие'],['neonatology','Neonatology','Neonatologiya','Неонатология'],['childhood','Childhood diseases','Bolalar kasalliklari','Детские болезни']],
 'akusherlik-va-ginekologiya':[['obstetrics','Obstetrics','Akusherlik','Акушерство'],['gynecology','Gynecology','Ginekologiya','Гинекология']],
 'gistologiya-va-embriologiya':[['tissues','Cells and tissues','Hujayralar va to‘qimalar','Клетки и ткани'],['organs','Organ histology','A’zolar gistologiyasi','Гистология органов'],['development','Embryonic development','Embrional rivojlanish','Эмбриональное развитие']],
 'otorinolaringologiya-lor':[['ear','Ear and hearing','Quloq va eshitish','Ухо и слух'],['nose','Nose and sinuses','Burun va sinuslar','Нос и пазухи'],['throat','Pharynx and larynx','Halqum va hiqildoq','Глотка и гортань']],
 oftalmologiya:[['anatomy','Eye anatomy and examination','Ko‘z anatomiyasi va tekshiruvi','Анатомия и обследование глаза'],['diseases','Eye diseases','Ko‘z kasalliklari','Заболевания глаз']],
 onkologiya:[['biology','Tumour biology','O‘sma biologiyasi','Биология опухолей'],['diagnosis','Cancer diagnosis','Saraton diagnostikasi','Диагностика рака'],['treatment','Treatment principles','Davolash tamoyillari','Принципы лечения']],
 urologiya:[['kidney','Kidney and ureter','Buyrak va siydik nayi','Почки и мочеточники'],['bladder','Bladder and urethra','Qovuq va siydik chiqarish kanali','Мочевой пузырь и уретра']],
 'shoshilinch-tibbiyot':[['assessment','Initial assessment and resuscitation','Dastlabki baholash va reanimatsiya','Первичная оценка и реанимация'],['trauma','Trauma','Travma','Травма'],['emergencies','Medical emergencies','Shoshilinch holatlar','Неотложные состояния']],
 radiologiya:[['principles','Imaging principles','Tasvirlash asoslari','Основы лучевой диагностики'],['xray','X-ray and CT','Rentgen va KT','Рентгенография и КТ'],['mri-ultrasound','MRI and ultrasound','MRT va ultratovush','МРТ и УЗИ']],
 fiziologiya:[['cell','Cell physiology','Hujayra fiziologiyasi','Физиология клетки'],['systems','Systems physiology','Tizimlar fiziologiyasi','Физиология систем'],['integration','Integrated physiology','Integrativ fiziologiya','Интегративная физиология']],
 nevrologiya:[['examination','Neurological examination','Nevrologik tekshiruv','Неврологическое обследование'],['central','Central nervous system','Markaziy asab tizimi','Центральная нервная система'],['peripheral','Peripheral nerves and muscles','Periferik nervlar va mushaklar','Периферические нервы и мышцы']],
 gistologiya:[['cells','Cell biology','Hujayra biologiyasi','Биология клетки'],['tissues','Basic tissues','Asosiy to‘qimalar','Основные ткани'],['organs','Organ histology','A’zolar gistologiyasi','Гистология органов']],
 embriologiya:[['early','Early development','Dastlabki rivojlanish','Раннее развитие'],['organs','Organ development','A’zolar rivojlanishi','Развитие органов'],['placenta','Placenta and fetal development','Yo‘ldosh va homila rivojlanishi','Плацента и развитие плода']]
};
let added = 0;
db.transaction(() => {
 for (const subject of db.prepare('SELECT id,slug FROM subjects').all()) {
  const templates = rows[subject.slug] || [];
  const max = db.prepare('SELECT COALESCE(MAX(display_order),0) n FROM modules WHERE subject_id=?').get(subject.id).n;
  for (const [i,[key,en,uz,ru]] of templates.entries()) {
   const slug = `${subject.slug}-${key}`;
   // Check translated names too, to avoid duplicating a manually created section.
   if (db.prepare('SELECT m.id FROM modules m LEFT JOIN module_translations t ON t.module_id=m.id WHERE m.slug=? OR (m.subject_id=? AND lower(t.name)=lower(?))').get(slug,subject.id,en)) continue;
   const id = db.prepare("INSERT INTO modules(subject_id,slug,status,display_order) VALUES (?,?,'published',?)").run(subject.id,slug,max+i+1).lastInsertRowid;
   for (const [lang,name] of Object.entries({en,uz,ru})) db.prepare('INSERT INTO module_translations(module_id,lang,name,description) VALUES (?,?,?,?)').run(id,lang,name,'');
   added++;
  }
 }
})();
console.log(`Added ${added} module sections. Existing content preserved.`);
db.close();
