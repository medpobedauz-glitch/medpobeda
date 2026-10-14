import { MUSCLE_REGIONS, MUSCLE_LAYERS, muscleLabel, muscleCatalog, muscleCoverage } from '../data/muscular-atlas.js';
const labels={
 selected:['Selected muscle','Tanlangan mushak','Выбранная мышца'],
 references:['Anatomical references','Anatomiya manbalari','Анатомические источники'],
 hideMuscle:['Hide muscle','Mushakni yashirish','Скрыть мышцу'],undo:['Undo hide / restore','Bekor qilish','Отменить скрытие / возврат'],
 dissection:['Dissection','Qatlamlarni o‘rganish','Препарирование'],revealAbs:['Reveal abs','Qorin mushaklarini ochish','Открыть мышцы пресса'],
 hidden:['Hidden structures','Yashirilgan tuzilmalar','Скрытые структуры'],show:['Show','Ko‘rsatish','Показать'],
 absNote:['Abdominal study view: external and internal obliques are hidden. Restore to see the intact model.','Qorin o‘rganish ko‘rinishi: tashqi va ichki qiyshiq mushaklar yashirilgan. To‘liq model uchun tiklang.','Учебный вид живота: наружные и внутренние косые мышцы скрыты. Восстановите для полного вида.'],
 location:['Location','Joylashuvi','Расположение'],relations:['Structure & relationships','Tuzilishi va qo‘shni tuzilmalar','Строение и взаимоотношения'],
 quality:['Detailed lighting (more GPU use)','Batafsil yoritish (GPU yuklamasi oshadi)','Детальное освещение (нагрузка на GPU)'],
 controls:['Muscular atlas','Mushaklar atlasi','Мышечный атлас'],regions:['Regions','Hududlar','Области'],layers:['Dissection layers','Anatomik qatlamlar','Слои препарирования'],
 superficial:['Superficial','Yuzaki','Поверхностные'],intermediate:['Intermediate','Oraliq','Промежуточные'],deep:['Deep','Chuqur','Глубокие'],unclassified:['Not classified','Tasniflanmagan','Не классифицировано'],connective:['Connective tissue','Biriktiruvchi to‘qima','Соединительная ткань'],
 both:['Both sides','Ikkala tomon','Обе стороны'],left:['Left only','Faqat chap','Только слева'],right:['Right only','Faqat o‘ng','Только справа'],
 context:['Transparent surroundings','Atrofni shaffof qilish','Прозрачное окружение'],structures:['Individual structures','Alohida tuzilmalar','Отдельные структуры'],coverage:['Asset coverage','Model qamrovi','Наличие моделей'],missing:['Model unavailable','Model mavjud emas','Модель отсутствует'],
 note:['Source geometry has no fiber textures. Some muscles and layer annotations are missing.','Manba modelida tola teksturalari yo‘q. Ayrim mushaklar va qatlam ma’lumotlari yetishmaydi.','Исходная геометрия без текстур волокон. Часть мышц и данных о слоях отсутствует.'],
 layerNote:['Layers describe regional depth; unclassified structures remain separate.','Qatlamlar hududiy chuqurlikni bildiradi; tasniflanmagan tuzilmalar alohida.','Слои отражают глубину в области; неклассифицированные структуры выделены отдельно.'],
 fascia:['Superficial fascia — unavailable','Yuzaki fastsiya — mavjud emas','Поверхностная фасция — недоступна'],tendons:['Separate tendons — unavailable','Alohida paylar — mavjud emas','Отдельные сухожилия — недоступны'],
 skin:['Skin','Teri','Кожа'],bones:['Bones','Suyaklar','Кости'],restore:['Restore hidden','Yashirilganlarni tiklash','Вернуть скрытые'],
 superior:['Superior','Yuqoridan','Сверху'],inferior:['Inferior','Pastdan','Снизу'],
 origin:['Origin','Boshlanishi','Начало'],insertion:['Insertion','Birikishi','Прикрепление'],action:['Action','Harakati','Действие'],innervation:['Innervation','Innervatsiya','Иннервация'],bloodSupply:['Blood supply','Qon ta’minoti','Кровоснабжение'],clinicalRelevance:['Clinical relevance','Klinik ahamiyati','Клиническое значение'],compartment:['Compartment','Bo‘lim','Компартмент'],latinName:['Latin name','Lotincha nomi','Латинское название'],
 unannotated:['Not yet annotated','Hali izohlanmagan','Ещё не аннотировано'],side:['Side','Tomon','Сторона'],midline:['Midline','O‘rta chiziq','Срединная линия'],unknown:['Unspecified in source','Manbada ko‘rsatilmagan','Не указано в источнике'],
};
export const muscleText=(key,lang)=>muscleLabel(labels[key]||[key,key,key],lang);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function muscleControlsHtml(index,lang,scope) {
 const records=Object.values(muscleCatalog(index)).filter(r=>!scope||scope.has(r.id));
 const regions=Object.keys(MUSCLE_REGIONS).filter(region=>records.some(r=>r.region===region));
 const coverage=muscleCoverage(index).filter(r=>!scope||regions.includes(r.region));
 const tr=k=>esc(muscleText(k,lang));
 return `<details class="muscle-controls"><summary>${tr('controls')}</summary><div class="muscle-controls-body">
 <p class="muscle-source-note">${tr('note')}</p>
 <label>${tr('side')}<select data-muscle-side>${['both','left','right'].map(k=>`<option value="${k}">${tr(k)}</option>`).join('')}</select></label>
 <label><input type="checkbox" data-muscle-quality>${tr('quality')}</label>
 <label><input type="checkbox" data-muscle-context>${tr('context')}</label>
 <fieldset><legend>${tr('regions')}</legend>${regions.map(r=>`<label><input type="checkbox" data-muscle-region="${r}" checked>${esc(muscleLabel(MUSCLE_REGIONS[r],lang))} <small>${records.filter(m=>m.region===r).length}</small></label>`).join('')}</fieldset>
 <fieldset><legend>${tr('layers')}</legend>${MUSCLE_LAYERS.map(k=>`<label><input type="checkbox" data-muscle-layer="${k}" checked>${tr(k)} <small>${records.filter(m=>m.layer===k).length}</small></label>`).join('')}
 ${!scope||scope.size===Object.keys(muscleCatalog(index)).length?['skin','skeletal'].map(k=>`<label><input type="checkbox" data-muscle-system="${k}">${tr(k==='skeletal'?'bones':k)}</label>`).join(''):''}
 <label><input type="checkbox" disabled>${tr('fascia')}</label><label><input type="checkbox" disabled>${tr('tendons')}</label><p>${tr('layerNote')}</p></fieldset>
 <details><summary>${tr('structures')} (${records.length})</summary><button type="button" class="anat3d-ctrl-btn" data-action="restore">${tr('restore')}</button>${records.map(r=>`<div class="muscle-structure-row" data-muscle-row="${r.id}"><input type="checkbox" checked data-muscle-visible="${r.id}" aria-label="${esc(r.name)}"><button type="button" data-locate="${r.id}">${esc(r.name)}</button></div>`).join('')}</details>
 <details><summary>${tr('coverage')} · ${coverage.filter(r=>!r.modelIds.length).length} ${tr('missing')}</summary>${coverage.filter(r=>!r.modelIds.length).map(r=>`<p>${esc(r.name)} — ${tr('missing')}</p>`).join('')}</details>
 </div></details>`;
}
export function muscleInfoHtml(record,lang) {
 const tr=k=>esc(muscleText(k,lang));
 const field=(label,value)=>`<div class="anat3d-info__field"><div class="anat3d-info__label">${label}</div><div class="anat3d-info__value">${esc(value||muscleText('unannotated',lang))}</div></div>`;
 const refs=[...new Set([record.referenceUrl,record.relationsUrl,...(record.additionalReferences||[])].filter(Boolean))];
 return `<p>${esc(muscleLabel(MUSCLE_REGIONS[record.region]||MUSCLE_REGIONS.unclassified,lang))} · ${tr(record.side)} · ${tr(record.layer)}</p>`+
 ['latinName','location','relations','compartment','origin','insertion','action','innervation','bloodSupply','clinicalRelevance'].map(k=>field(tr(k),typeof record[k]==='object'?record[k]?.[lang]||record[k]?.en:record[k])).join('')+
 (refs.length?`<details class="muscle-references"><summary>${tr('references')}</summary>${refs.map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener">${i+1}. ${esc(new URL(url).hostname)} ↗</a>`).join('')}</details>`:'');
}
