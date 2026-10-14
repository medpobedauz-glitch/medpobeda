// MedPobeda - Anatomy 3D data
// Structure catalogue (selectable organs/bones), system definitions and quiz items.
// Every structure has a stable `id` that must match mesh names in the GLB model
// (e.g. a mesh named "heart" maps to this "heart" entry; left/right pairs use
// "kidney_left", "kidney_right" etc). Real medical GLB files dropped into
// /models/human-body.glb replace the procedural placeholder automatically.
//
// Content is localised: info.n / info.f / info.l / info.d / info.c per language.

 export const ANATOMY_SYSTEMS = [
  { id: 'skeletal',     structures: ['skull', 'spine', 'ribs', 'pelvis', 'humerus_left', 'humerus_right', 'radius_left', 'radius_right', 'ulna_left', 'ulna_right', 'femur_left', 'femur_right', 'tibia_left', 'tibia_right'] },
  { id: 'muscular',     structures: [] },
  { id: 'nervous',     structures: ['brain', 'spinal_cord'] },
  { id: 'cardiovascular', structures: ['heart', 'aorta'] },
  { id: 'respiratory',  structures: ['lungs', 'trachea'] },
  { id: 'digestive',    structures: ['liver', 'stomach', 'pancreas', 'small_intestine', 'large_intestine'] },
  { id: 'urinary',      structures: ['kidney_left', 'kidney_right', 'urinary_bladder'] },
  { id: 'reproductive', structures: [] },
  { id: 'endocrine',    structures: ['pancreas', 'thyroid'] },
  { id: 'lymphatic',   structures: ['spleen'] },
];

// Each entry: id, system, layer, meshes (names used by the 3D model), related (ids), info per lang.
export const ANATOMY_STRUCTURES = [
  {
    id: 'brain', system: 'nervous', layer: 'organs', meshes: ['brain'],
    related: ['skull', 'spinal_cord'],
    info: {
      en: { n: 'Brain', f: 'Controls thought, memory, movement and regulates body functions.', l: 'Inside the cranial cavity, protected by the skull.', d: 'The central organ of the nervous system, made of billions of interconnected neurons.', c: 'Stroke, trauma and infections can damage brain tissue; early recognition of neurological deficits is vital.' },
      ru: { n: 'Головной мозг', f: 'Управляет мышлением, памятью, движением и регулирует функции организма.', l: 'В полости черепа, под защитой костей черепа.', d: 'Центральный орган нервной системы, состоящий из миллиардов нейронов.', c: 'Инсульт, травма и инфекции могут повредить ткани мозга; важно распознать неврологические нарушения.' },
      uz: { n: 'Miya', f: 'Fikrlash, xotira, harakatni boshqaradi va organizm funksiyalarini tartibga soladi.', l: 'Kalla suyagi ichidagi kranial bo‘shliqda.', d: 'Nerv sistemasining markaziy organi; milliardlab neyronlardan iborat.', c: 'Insult, jarohat va infeksiyalar miya to‘qimasini shikastlashi mumkin; nevrologik buzilishlarni erta aniqlash muhim.' } },
    },
  {
    id: 'heart', system: 'cardiovascular', layer: 'organs', meshes: ['heart'],
    related: ['aorta', 'lungs'],
    info: {
      en: { n: 'Heart', f: 'Pumps blood through the body, delivering oxygen and nutrients to tissues.', l: 'Thoracic cavity (mediastinum), between the lungs, slightly left of center.', d: 'A muscular pump with four chambers(two atria and two ventricles, forming the core of the cardiovascular system.', c: 'Coronary artery disease and myocardial infarction(heart attack) arise from blocked coronary vessels.' },
      ru: { n: 'Сердце', f: 'Перекачивает кровь по телу, доставляя тканям кислород и питательные вещества.', l: 'Грудная полость (средостение), между лёгкими, слегка смещено влево.', d: 'Мышечный насос с четырьмя камерами(два предсердия и два желудочка, основа сердечно-сосудистой системы.', c: 'Ишемическая болезнь сердца и инфаркт миокарда возникают при закупорке коронарных сосудов.' },
      uz: { n: 'Yurak', f: 'Qonni butun tan bo‘ylab haydaydi, to‘qimalarga kislorod va ozuqa moddalarini yetkazadi.', l: 'Ko‘krak bo‘shlig‘ida (mediastinumда, о‘pka o‘rtasida, markazdan bir oz chapda).', d: 'To‘rt kamerali (ikki bo‘lmacha, ikki qorincha( mushak nasosi — yurak-qon tomir sistemasining asosi.', c: 'Koronar arteriya kasalligi va miokard infarkti (yurak xuruji) koronar tomirlar tiqilishida kelib chiqadi.' } },
    },
{
    id: 'lungs', system: 'respiratory', layer: 'organs', meshes: ['lungs'],
    related: ['heart', 'trachea'],
    info: {
      en: { n: 'Lungs', f: 'Exchange oxygen and carbon dioxide between air and blood.', l: 'Thoracic cavity, one on each side of the heart, protected by the ribcage.', d: 'Paired, spongy organs divided into lobes;the right lung has three lobes,the left has two.', c: 'Asthma, pneumonia, COPD,and smoking-related lung disease affect the airways and alveoli.' },
      ru: { n: 'Лёгкие', f: 'Обеспечивают газообмен(кислород и углекислый газу между воздухом и кровью.', l: 'Грудная полость, по обе стороны от сердца, под защитой рёбер.', d: 'Парные губчатые органы, разделённые на доли: правое лёгкое имеет три доли, левое — две.', c: 'Астма, пневмония, ХОБЛ и болезни, связанные с курением, поражают дыхательные пути и альвеолы.' },
      uz: { n: 'O‘pkalar', f: 'Havo va qon o‘rtasida kislorod va karbonat angidrid almashinuvini ta’minlaydi.', l: 'Ko‘krak bo‘shlig‘ida, yurakdan ikki tomonda, qovurg‘alar himoyasida.', d: 'Juff, g‘ovak organlar bo‘laklarga bo‘lingan: o‘ng o‘pka uсh bo‘lakka, chap o‘pka ikkiga ega.', c: 'Astma, pnevmoniya, KOAH va chekish bilan bog‘liq kasalliklar nafas yo‘llari va alveolalarni zararlaydi.' } },
    },
  {
    id: 'trachea', system: 'respiratory', layer: 'organs', meshes: ['trachea'],
    related: ['lungs'],
    info: {
      en: { n: 'Trachea', f: 'Carries air from the larynx tothe bronchi and lungs.', l: 'Neck and upper chest,in front of the esophagus.', d: 'A fibromuscular tube(about 10–12 cm, reinforced with C-shaped cartilage rings.', c: 'Aspiration of a foreign body can obstruct the airway — a medical emergency.' },
      ru: { n: 'Трахея', f: 'Проводит воздух от гортани к бронхам и лёгким.', l: 'Шея и верхняя часть груди, спереди от пищевода.', d: 'Фиброзно-мышечная трубка(около 10–12 см, укреплённая хрящевыми кольцами.', c: 'Аспирация инородного тела может перекрыть дыхательные пути — неотложное состояние.' },
      uz: { n: 'Traxeya', f: 'Havoni hiqildoqdan bronxlar va o‘pkalarga o‘tkazadi.', l: 'Bo‘yin va ko‘krakning yuqori qismida, qizilo‘ngachdan oldinda.', d: 'Taxminan 10–12 sm uzunlikdagi tolali-mushak nay; yarim halqa shaklidagi tog‘aylar bilan mustahkamlangan.', c: 'Begona jism aspiratsiyasi nafas yo‘lini to‘sib qo‘yishi mumkin — shoshilinch tibbiy holat.' } },
    },
  {
    id: 'liver', system: 'digestive', layer: 'organs', meshes: ['liver'],
    related: ['stomach', 'pancreas'],
    info: {
      en: { n: 'Liver', f: 'Filters blood, produces bile, metabolises drugs and nutrients,and stores glycogen.', l: 'Right upper quadrant of the abdomen, under the diaphragm.', d: 'The largest internal organ;it regenerates rapidly after injury.', c: 'Cirrhosis, hepatitis,and fatty liver disease impair its metabolic functions.' },
      ru: { n: 'Печень', f: 'Фильтрует кровь, вырабатывает желчь, метаболизирует лекарства и питательные вещества, запасает гликоген.', l: 'Правое подреберье, под диафрагмой.', d: 'Крупнейший внутренний орган; быстро восстанавливается после повреждения.', c: 'Цирроз, гепатит и жировая болезнь печени нарушают её метаболические функции.' },
      uz: { n: 'Jigar', f: 'Qonni filtrlaydi, o‘t ishlab chiqaradi, dori va ozuqa moddalarini almashinuvini boshqaradi, glikogen zaxiralaydi.', l: 'Qorin bo‘shlig‘ining о‘ng yuqori qismida, diafragma ostida.', d: 'Eng katta ichki organ; shikastlanishdan keyin tez tiklana oladi.', c: 'Sirroz, gepatit va yog‘li jigar kasalligi uning metabolik funksiyalarini buzadi.' } },
    },
{
    id: 'stomach', system: 'digestive', layer: 'organs', meshes: ['stomach'],
    related: ['pancreas', 'liver'],
    info: {
      en: { n: 'Stomach', f: 'Stores food, mixes it with gastric juice,and begins protein digestion.', l: 'Left upper abdomen, under the diaphragm, between the esophagus and duodenum.', d: 'A J-shaped muscular sac with folds(rugae) что expands during a meal.', c: 'Gastritis, peptic ulcer disease,and GERD are common gastric disorders.' },
      ru: { n: 'Желудок', f: 'Запасает пищу, перемешивает её с желудочным соком и начинает переваривание белков.', l: 'Левое подреберье, под диафрагмой, между пищеводом и двенадцатиперстной кишкой.', d: 'J-образный мышечный мешок со складками(ругами, растягивающийся во время еды.', c: 'Гастрит, язвенная болезнь и ГЭРБ — частые заболевания желудка.' },
      uz: { n: 'Oshqozon', f: 'Ovqatni saqlaydi, me’da shirasi bilan aralashtiradi va oqsillar hazmini boshlaydi.', l: 'Qorinning chap yuqori qismida, diafragma ostida, qizilo‘ngach va o‘n ikki barmoq ichak o‘rtasida.', d: 'J shaklidagi mushak xalta; ovqatlanish paytida cho‘ziladigan burmalari(ruga( bor.', c: 'Gastrit, oshqozon yara kasalligi va GEKB(gastroezofagial reflyuks) кeng tarqalgan me’da kasalliklaridir.' } },
    },
  {
    id: 'pancreas', system: 'digestive', layer: 'organs', meshes: ['pancreas'],
    related: ['stomach', 'liver'],
    info: {
      en: { n: 'Pancreas', f: 'Produces digestive enzymes,and secretes insulin and glucagon toregulate blood sugar.', l: 'Retroperitoneal, behind the stomach, across the posterior abdominal wall.', d: 'A mixed gland: exocrine(digestive juice)and endocrine(islets of Langerhans.', c: 'Acute pancreatitis and diabetes mellitus involve the pancreas.' },
      ru: { n: 'Поджелудочная железа', f: 'Вырабатывает пищеварительные ферменты и секретирует инсулин и глюкагон для регуляции сахара крови.', l: 'Забрюшинно, позади желудка, поперёк задней брюшной стенки.', d: 'Смешанная железа: экзокринная(пищеварительный сок) и эндокринная(островки Лангерганса.', c: 'Острый панкреатит и сахарный диабет связаны с поджелудочной железой.' },
      uz: { n: 'Oshqozon osti bezi', f: 'Hazm fermentlarini ishlab chiqaradi; qondagi qand miqdorini boshqarish uchun insulin va glyukagon ajratadi.', l: 'Retroperitoneal, oshqozon orqasida, qorin orqa devori bo‘ylab.', d: 'Aralash bez: ekzokrin(hazm shirasi) va endokrin(Langerhans orolchalari) qismlardan iborat.', c: 'O‘tkir pankreatit va qandli diabet oshqozon osti bezi bilan bog‘liq.' } },
    },
  {
    id: 'spleen', system: 'lymphatic', layer: 'organs', meshes: ['spleen'],
    related: ['liver', 'stomach'],
    info: {
      en: { n: 'Spleen', f: 'Filters blood, removes old red blood cells,and supports immune defence.', l: 'Left upper abdomen, under the diaphragm, alongside the stomach.', d: 'A soft, fist-sized lymphatic organ with abundant blood supply.', c: 'Rupture from trauma causes life-threatening bleeding; enlargement(splenomegaly) occurs in infections.' },
      ru: { n: 'Селезёнка', f: 'Фильтрует кровь, удаляет старые эритроциты и поддерживает иммунную защиту.', l: 'Левое подреберье, под диафрагмой, рядом с желудком.', d: 'Мягкий лимфоидный орган размером с кулак с обильным кровоснабжением.', c: 'Разрыв при травме вызывает опасное кровотечение; увеличение(спленомегалия) бывает при инфекциях.' },
      uz: { n: 'Taloq', f: 'Qonni filtrlaydi, eski eritrotsitlarni olib tashlaydi va immun himoyani qo‘llab-quvvatlaydi.', l: 'Qorinning chap yuqori qismida, diafragma ostida, oshqozon yonida.', d: 'Yumshoq, musht kattaligidagi limfoid organ; qon bilan yaxshi ta’minlangan.', c: 'Jarohatda yorilishi hayot uchun xavfli qon ketishiga olib keladi; kattalashuvi(splenomegaliya) infeksiyalarda kuzatiladi.' } },
    },
{
    id: 'kidney_left', groupId: 'kidneys', system: 'urinary', layer: 'organs', meshes: ['kidney_left'],
    related: ['urinary_bladder', 'spine'],
    info: {
      en: { n: 'Left Kidney', f: 'Filters blood, produces urine,and regulates fluid, electrolytes,and blood pressure.', l: 'Retroperitoneal, left side of the spine at waist level.', d: 'A bean-shaped organ containing about a million nephrons.', c: 'Kidney stones, pyelonephritis,and chronic kidney disease are common renal problems.' },
      ru: { n: 'Левая почка', f: 'Фильтрует кровь, вырабатывает мочу, регулирует жидкость, электролиты и давление крови.', l: 'Забрюшинно, слева от позвоночника на уровне поясницы.', d: 'Бобовидный орган, содержащий около миллиона нефронов.', c: 'Камни почек, пиелонефрит и хроническая болезнь почек— частые проблемы.' },
      uz: { n: 'Chap buyrak', f: 'Qonni filtrlaydi, siydik ishlab chiqaradi, suyuqlik, elektrolitlar va qon bosimini boshqaradi.', l: 'Retroperitoneal, umurtqa pog‘onasidan chapda, bel sohasida.', d: 'Loviya shaklidagi organ; taxminan bir million nefrondan iborat.', c: 'Buyrak toshlari, pielonefrit va surunkali buyrak kasalligi keng tarqalgan muammolardir.' } },
    },
  {
    id: 'kidney_right', groupId: 'kidneys', system: 'urinary', layer: 'organs', meshes: ['kidney_right'],
    related: ['urinary_bladder', 'spine'],
    info: {
      en: { n: 'Right Kidney', f: 'Filters blood, produces urine,and regulates fluid, electrolytes,and blood pressure.', l: 'Retroperitoneal, right side of the spine at waist level.', d: 'A bean-shaped organ containing about a million nephrons.', c: 'Kidney stones, pyelonephritis,and chronic kidney disease are common renal problems.' },
      ru: { n: 'Правая почка', f: 'Фильтрует кровь, вырабатывает мочу, регулирует жидкость, электролиты и давление крови.', l: 'Забрюшинно, справа от позвоночника на уровне поясницы.', d: 'Бобовидный орган, содержащий около миллиона нефронов.', c: 'Камни почек, пиелонефрит и хроническая болезнь почек— частые проблемы.' },
      uz: { n: 'O‘ng buyrak', f: 'Qonni filtrlaydi, siydik ishlab chiqaradi, suyuqlik, elektrolitlar va qon bosimini boshqaradi.', l: 'Retroperitoneal, umurtqa pog‘onasidan o‘ngda, bel sohasida.', d: 'Loviya shaklidagi organ; taxminan bir million nefrondan iborat.', c: 'Buyrak toshlari, pielonefrit va surunkali buyrak kasalligi keng tarqalgan muammolardir.' } },
    },
{
    id: 'small_intestine', system: 'digestive', layer: 'organs', meshes: ['small_intestine'],
    related: ['large_intestine', 'stomach'],
    info: {
      en: { n: 'Small Intestine', f: 'Absorbs most nutrients and minerals from digested food.', l: 'Central abdomen, coiled between the stomach and large intestine.', d: 'A ~6 m tube with three segments: duodenum, jejunum, ileum;vast absorptive surface.', c: 'Celiac disease, Crohn disease,and obstruction affect the small bowel.' },
      ru: { n: 'Тонкая кишка', f: 'Всасывает большую часть питательных веществ и минералов из переваренной пищи.', l: 'Центральная часть живота, между желудком и толстой кишкой.', d: 'Трубка около 6 м с тремя отделами: двенадцатиперстная, тощая и подвздошная кишки; огромная всасывающая поверхность.', c: 'Целиакия, болезнь Крона и кишечная непроходимость поражают тонкий кишечник.' },
      uz: { n: 'Ingichka ichak', f: 'Hazm bo‘lgan ovqatdan ozuqa moddalari va minerallarning katta qismini so‘rib oladi.', l: 'Qorin markazida, oshqozon va yo‘g‘on ichak o‘rtasida oʻralgan holda.', d: 'Taxminan 6 m uzunlikdagi nay; uch qismdan iborat: o‘n ikki barmoq, och va yonbosh ichaklar.', c: 'Seliakiya, Kron kasalligi va ichak tutilishi ingichka ichakni zararlaydi.' } },
    },
  {
    id: 'large_intestine', system: 'digestive', layer: 'organs', meshes: ['large_intestine'],
    related: ['small_intestine', 'urinary_bladder'],
    info: {
      en: { n: 'Large Intestine', f: 'Absorbs water and electrolytes,and forms and eliminates faeces.', l: 'Frame-shaped, around the small intestine throughout the abdomen.', d: 'About 1.5 m long: cecum, colon(ascending, transverse, descending, sigmoid,and rectum.', c: 'Colorectal cancer, diverticulitis,and inflammatory bowel disease are major colonic disorders.' },
      ru: { n: 'Толстая кишка', f: 'Всасывает воду и электролиты, формирует и выводит каловые массы.', l: 'Рамкообразно окружает тонкую кишку по всему животу.', d: 'Длина около 1,5 м: слепая, ободочная(восходящая, поперечная, нисходящая, сигмовидная( и прямая кишки.', c: 'Рак толстой кишки, дивертикулит и воспалительные болезни кишечника— основные заболевания.' },
      uz: { n: 'Yo‘g‘on ichak', f: 'Suv va elektrolitlarni so‘rib oladi, najasni shakllantiradi va chiqaradi.', l: 'Ramka shaklida, ingichka ichakni o‘rab, butun qorin bo‘ylab joylashgan.', d: 'Taxminan 1.5 m uzunlikda: ko‘richak, yo‘g‘on ichak(kutariluvchi, ko‘ndalang, tushuvchi, sigmasimon)) va to‘g‘ri ichakdan iborat.', c: 'Yo‘g‘on ichak saratoni, divertikulit va yallig‘lanishli ichak kasalliklari asosiy xastaliklardir.' } },
    },
{
    id: 'urinary_bladder', system: 'urinary', layer: 'organs', meshes: ['urinary_bladder'],
    related: ['kidney_left', 'pelvis'],
    info: {
      en: { n: 'Urinary Bladder', f: 'Stores urine until voluntary voiding.', l: 'Pelvic cavity, behind the pubic symphysis.', d: 'A hollow, muscular, distensible organ;capacity ~400–600 ml in adults.', c: 'Cystitis, bladder stones,and urinary retention involve the bladder.' },
      ru: { n: 'Мочевой пузырь', f: 'Накапливает мочу до произвольного мочеиспускания.', l: 'Полость таза, позади лобкового симфиза.', d: 'Полый мышечный растяжимый орган; ёмкость ~400–600 мл у взрослых.', c: 'Цистит, камни пузыря и задержка мочи связаны с мочевым пузырём.' },
      uz: { n: 'Siydik pufagi', f: 'Ixtiyoriy siyishgacha siydikni saqlab turadi.', l: 'Tos bo‘shlig‘ida, qov sinfizidan orqada.', d: 'Bo‘shliqli, mushakli, cho‘ziluvchan organ; kattalarning sig‘imi ~400–600 ml.', c: 'Sistit, pufak toshlari va siydik tutilishi siydik pufagi bilan bog‘liq.' } },
    },
  {
    id: 'thyroid', system: 'endocrine', layer: 'organs', meshes: ['thyroid'],
    related: ['trachea'],
    info: {
      en: { n: 'Thyroid Gland', f: 'Regulates metabolism, growth,and body temperature via thyroxine(T4)and triiodothyronine(T3).', l: 'Neck, anterior tothe trachea, just below the larynx.', d: 'A butterfly-shaped endocrine gland with two lobes connected by an isthmus.', c: 'Hypothyroidism, hyperthyroidism,and goitre are common thyroid conditions.' },
      ru: { n: 'Щитовидная железа', f: 'Регулирует обмен веществ, рост и температуру тела через тироксин(Т4)и трийодтиронин(Т3).', l: 'Шея, спереди от трахеи, чуть ниже гортани.', d: 'Эндокринная железа в форме бабочки с двумя долями, соединёнными перешейком.', c: 'Гипотиреоз, гипертиреоз и зоб— частые заболевания щитовидной железы.' },
      uz: { n: 'Qalqonsimon bez', f: 'Tiroksin(T4) va triyodtironin(T3) orqali modda almashinuvi, o‘sish va tana haroratini boshqaradi.', l: 'Bo‘yinda, traxeyadan oldinda, hiqildoqdan sal pastda.', d: 'Kapalak shaklidagi endokrin bez; ikki bo‘lagi istmus bilan birlashgan.', c: 'Gipotireoz, gipertireoz va bo‘qoq qalqonsimon bezning keng tarqalgan kasalliklaridir.' } },
    },
{
    id: 'aorta', system: 'cardiovascular', layer: 'vessels', meshes: ['aorta'],
    related: ['heart'],
    info: {
      en: { n: 'Aorta', f: 'Distributes oxygenated blood from the left ventricleton all body tissues.', l: 'Leaves the heart, arches over it,and descends through the chest and abdomen.', d: 'The largest artery;its ascending, arch, thoracic,and abdominal segments.', c: 'Aortic aneurysm and dissection are life-threatening emergencies.' },
      ru: { n: 'Аорта', f: 'Распределяет артериальную кровь от левого желудочка ко всем тканям тела.', l: 'Выходит из сердца, дугой огибает его и спускается через грудь и живот.', d: 'Самая крупная артерия; выделяют восходящую часть, дугу, грудной и брюшной отделы.', c: 'Аневризма и расслоение аорты— угрожающие жизни состояния.' },
      uz: { n: 'Aorta', f: 'Kislorodli qonni chap qorinchadan barcha to‘qimalarga tarqatadi.', l: 'Yurakdan chiqib, ustiдан yoy bo‘lib o‘tadi va ko‘krak hamda qorin bo‘ylab tushadi.', d: 'Eng katta arteriya; ko‘tariluvchi qism, yoy, ko‘krak va qorin qismlaridan iborat.', c: 'Aorta anevrizmasi va yorilishi hayot uchun xavfli holatlardir.' } },
    },
  {
    id: 'spinal_cord', system: 'nervous', layer: 'nerves', meshes: ['spinal_cord'],
    related: ['brain', 'spine'],
    info: {
      en: { n: 'Spinal Cord', f: 'Conducts signals between the brain and body;coordinates reflexes.', l: 'Within the vertebral canal,from the foramen magnum to~L1–L2.', d: 'A cylindrical column of nerve tissue protected by the meninges and vertebrae.', c: 'Spinal cord injury may cause paralysis below the level of damage.' },
      ru: { n: 'Спинной мозг', f: 'Проводит сигналы между мозгом и телом; координирует рефлексы.', l: 'В позвоночном канале, от большого затылочного отверстия до ~L1–L2.', d: 'Цилиндрический тяж нервной ткани, защищённый оболочками и позвонками.', c: 'Травма спинного мозга может вызвать паралич ниже уровня повреждения.' },
      uz: { n: 'Orqa miya', f: 'Miya va tana o‘rtasida signallarni o‘tkazadi; reflekslarni muvofiqlashtiradi.', l: 'Umurtqa kanalida, katta ensa teshigidan ~L1–L2 darajagacha.', d: 'Nerv to‘qimasining silindrsimon tizmasi; pardalar va umurtqalar bilan himoyalangan.', c: 'Orqa miya jarohati zararlanish darajasidan pastda falajga olib kelishi mumkin.' } },
    },
  {
    id: 'skull', system: 'skeletal', layer: 'bones', meshes: ['skull'],
    related: ['brain', 'spine'],
    info: {
      en: { n: 'Skull', f: 'Protects the brain and supports facial structures.', l: 'Head;consists of the cranial vault and facial bones.', d: '22 bones fused in adults(except the mandible) form the skull.', c: 'Skull fractures can injure the brain;CT imaging is used for assessment.' },
      ru: { n: 'Череп', f: 'Защищает головной мозг и поддерживает лицевые структуры.', l: 'Голова; состоит из мозгового черепа и лицевых костей.', d: '22 кости, срастающиеся у взрослых(кроме нижней челюсти, образуют череп.', c: 'Переломы черепа могут повредить мозг; для оценки применяют КТ.' },
      uz: { n: 'Kalla suyagi', f: 'Miyani himoya qiladi va yuz tuzilmalarini qo‘llab turadi.', l: 'Bosh; miya qutisi va yuz suyaklaridan iborat.', d: 'Kattalarda birlashgan 22 suyak(mandibuladan tashqari( kalla suyagini hosil qiladi.', c: 'Kalla suyagi sinishi miyani shikastlashi mumkin; baholash uchun KT qo‘llaniladi.' } },
    },
{
    id: 'spine', system: 'skeletal', layer: 'bones', meshes: ['spine'],
    related: ['spinal_cord', 'pelvis'],
    info: {
      en: { n: 'Vertebral Column (Spine', f: 'Supports the trunk, protects the spinal cord,and allows movement.', l: 'Posterior midline,from the skull base tothe pelvis(24 movable vertebrae).', d: '33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral(fused) and 4 coccygeal.', c: 'Herniated discs, scoliosis,and spinal stenosis are common spinal disorders.' },
      ru: { n: 'Позвоночник', f: 'Поддерживает туловище, защищает спинной мозг и обеспечивает движение.', l: 'По средней линии сзади, от основания черепа до таза(24 подвижных позвонка).', d: '33 позвонка: 7 шейных, 12 грудных, 5 поясничных, 5 крестцовых(сросшихся) и 4 копчиковых.', c: 'Грыжи дисков, сколиоз и стеноз позвоночного канала— частые заболевания.' },
      uz: { n: 'Umurtqa pog‘onasi', f: 'Tanani qo‘llab turadi, orqa miyani himoya qiladi va harakatni ta’minlaydi.', l: 'Orqa o‘rta chiziqda, kalla suyagi asosidan tos suyagigacha(24 harakatchan umurtqa).', d: '33 umurtqa: 7 bo‘yin, 12 ko‘krak, 5 bel, 5 dumg‘aza(birikkan) va 4 dum suyagi.', c: 'Disk churrasi, skolioz va umurtqa kanali stenozi keng tarqalgan kasalliklardir.' } },
    },
  {
    id: 'ribs', system: 'skeletal', layer: 'bones', meshes: ['ribs'],
    related: ['spine', 'lungs'],
    info: {
      en: { n: 'Ribcage', f: 'Protects the heart, lungs,and other thoracic organs;assists breathing.', l: 'Thorax;12 pairs articulate posteriorly with the thoracic vertebrae.', d: 'Elastic bony arches connected anteriorly by costal cartilage tothe sternum.', c: 'Rib fractures are common in chest trauma;flail chest affects breathing.' },
      ru: { n: 'Рёбра', f: 'Защищают сердце, лёгкие и другие органы груди; участвуют в дыхании.', l: 'Грудная клетка: 12 пар сзади сочленяются с грудными позвонками.', d: 'Эластичные костные дуги, спереди соединённые рёберными хрящами с грудиной.', c: 'Переломы рёбер часты при травме груди; флотирующая грудь нарушает дыхание.' },
      uz: { n: 'Qovurg‘alar', f: 'Yurak, o‘pka va ko‘krak a’zolarini himoya qiladi; nafas olishga yordam beradi.', l: 'Ko‘krak qafasi: 12 juft, orqada ko‘krak umurtqalari bilan bo‘g‘imlanadi.', d: 'Elastik suyak yoylar; oldinda tog‘aylar orqali to‘sh suyagiga birlashadi.', c: 'Qovurg‘a sinishlari ko‘krak jarohatlarida keng tarqalgan; falayali ko‘krak nafasni buzadi.' } },
    },
  {
    id: 'pelvis', system: 'skeletal', layer: 'bones', meshes: ['pelvis'],
    related: ['spine', 'femur_left'],
    info: {
      en: { n: 'Pelvis', f: 'Transmits weight from the trunk tothe legs;protects pelvic organs.', l: 'Base of the trunk,between the lumbar spine and lower limbs.', d: 'A ring formed by two hip bones,the sacrum and the coccyx.', c: 'Pelvic fractures,especially in the elderly,can be severe.' },
      ru: { n: 'Таз', f: 'Передаёт вес туловища на ноги; защищает органы таза.', l: 'Основание туловища, между поясничным отделом и нижними конечностями.', d: 'Кольцо, образованное двумя тазовыми костями, крестцом и копчиком.', c: 'Переломы таза, особенно у пожилых, могут быть тяжёлыми.' },
      uz: { n: 'Tos suyagi', f: 'Tana og‘irligini oyoqlarga uzatadi; tos a’zolarini himoya qiladi.', l: 'Tana asosida, bel umurtqalari va pastki oyoqlar o‘rtasida.', d: 'Ikki tos suyagi, dumg‘aza va dum suyagidan hosil bo‘lgan halqa.', c: 'Tos sinishlari, ayniqsa keksalarda, og‘ir bo‘lishi mumkin.' } },
    },
];

// Shared left/right content (name differs by side) - keeps the file compact.
function limbPair({ base, related, names, en, ru, uz }) {
  const make = (side) => ({
    id: base + '_' + side, groupId: base, system: 'skeletal', layer: 'bones',
    meshes: [base + '_' + side], related,
    info: {
      en: Object.assign({}, en, { n: names.en[side] }),
      ru: Object.assign({}, ru, { n: names.ru[side] }),
      uz: Object.assign({}, uz, { n: names.uz[side] }),
    },
  });
  return [make('left'), make('right')];
}

ANATOMY_STRUCTURES.push(
  ...limbPair({
    base: 'humerus', related: ['radius_left', 'ulna_left'],
    names: { en: { left: 'Humerus (Left)', right: 'Humerus (Right)' }, ru: { left: 'Плечевая кость (левая)', right: 'Плечевая кость (правая)' }, uz: { left: 'Yelka suyagi (chap)', right: 'Yelka suyagi (o‘ng)' } },
    en: { f: 'Forms the upper arm;articulates at the shoulder and elbow.', l: 'Upper arm,between the shoulder joint and the elbow.', d: 'The longest bone of the upper limb;its head fits the glenoid cavity.', c: 'Proximal humeral fractures are common in falls on an outstretched hand.' },
    ru: { f: 'Образует плечо; участвует в плечевом и локтевом суставах.', l: 'Плечо, между плечевым и локтевым суставами.', d: 'Самая длинная кость верхней конечности; головка входит в суставную впадину.', c: 'Переломы проксимального отдела часты при падении на вытянутую руку.' },
    uz: { f: 'Yelkani hosil qiladi; yelka va tirsak bo‘g‘imlarida qatnashadi.', l: 'Yelka, yelka va tirsak bo‘g‘imlari o‘rtasida.', d: 'Yuqori oyoq-qo‘lning eng uzun suyagi; boshi bo‘g‘im chuqurchasiga mos tushadi.', c: 'Yelka suyagi proksimal qismining sinishi qo‘l uzatilgan holatda yiqilishda keng tarqalgan.' },
  }),
  ...limbPair({
    base: 'radius', related: ['humerus_left', 'ulna_left'],
    names: { en: { left: 'Radius (Left)', right: 'Radius (Right)' }, ru: { left: 'Лучевая кость (левая)', right: 'Лучевая кость (правая)' }, uz: { left: 'Bilak suyagi–tirsak (chap)', right: 'Bilak suyagi–tirsak (o‘ng)' } },
    en: { f: 'The lateral forearm bone;allows pronation and supination.', l: 'Forearm,on the thumb(lateral) side.', d: 'The shorter forearm bone;articulates with the wrist bones.', c: 'Scaphoid fractures near the wrist can interrupt blood supply to the bone.' },
    ru: { f: 'Латеральная кость предплечья; обеспечивает пронацию и супинацию.', l: 'Предплечье, со стороны большого пальца(латерально).', d: 'Более короткая кость предплечья; сочленяется с костями запястья.', c: 'Переломы ладьевидной кости могут нарушить кровоснабжение кости.' },
    uz: { f: 'Bilakning lateral suyagi; pronatsiya va supinatsiyani ta’minlaydi.', l: 'Bilak, bosh barmoq tomonida(lateral).', d: 'Bilakning qisqaroq suyagi; bilak suyaklari bilan bo‘g‘imlanadi.', c: 'Bilakdagi yondosh suyak sinishi suyakning qon ta’minotini buzishi mumkin.' },
  }),
...limbPair({
    base: 'ulna', related: ['humerus_left', 'radius_left'],
    names: { en: { left: 'Ulna (Left)', right: 'Ulna (Right)' }, ru: { left: 'Локтевая кость (левая)', right: 'Локтевая кость (правая)' }, uz: { left: 'Tirsak suyagi (chap)', right: 'Tirsak suyagi (o‘ng)' } },
    en: { f: 'The medial forearm bone;forms the elbow joint with the humerus.', l: 'Forearm,on the little-finger(medial) side.', d: 'Longer than the radius;its olecranon forms the elbow tip.', c: 'Olecranon fractures occur from direct elbow trauma.' },
    ru: { f: 'Медиальная кость предплечья; образует локтевой сустав с плечевой костью.', l: 'Предплечье, со стороны мизинца(медиально).', d: 'Длиннее лучевой кости; локтевой отросток образует вершину локтя.', c: 'Переломы локтевого отростка возникают при прямой травме локтя.' },
    uz: { f: 'Bilakning medial suyagi; yelka suyagi bilan tirsak bo‘g‘imini hosil qiladi.', l: 'Bilak, jimjiloq barmoq tomonida(medial).', d: 'Bilak suyagidan uzunroq; tirsak o‘sig‘i tirsak uchini hosil qiladi.', c: 'Tirsak o‘sig‘i sinishi tirsakka to‘g‘ridan-to‘g‘ri jarohatda uchraydi.' },
  }),
  ...limbPair({
    base: 'femur', related: ['pelvis', 'tibia_left'],
    names: { en: { left: 'Femur (Left)', right: 'Femur (Right)' }, ru: { left: 'Бедренная кость (левая)', right: 'Бедренная кость (правая)' }, uz: { left: 'Son suyagi (chap)', right: 'Son suyagi (o‘ng)' } },
    en: { f: 'Thigh bone;transmits weight and supports locomotion.', l: 'Thigh,from the hip joint tothe knee.', d: 'The longest and strongest bone in the body;its neck is prone to fracture.', c: 'Hip fragility fractures are common in osteoporosis,especially in older adults.' },
    ru: { f: 'Кость бедра; передаёт вес и обеспечивает локомоцию.', l: 'Бедро, от тазобедренного сустава до колена.', d: 'Самая длинная и прочная кость; шейка подвержена переломам.', c: 'Переломы шейки бедра часты при остеопорозе, особенно у пожилых.' },
    uz: { f: 'Son suyagi; og‘irlikni uzatadi va harakatni ta’minlaydi.', l: 'Son, son bo‘g‘imidan tizzagacha.', d: 'Tana(ning eng uzun va mustahkam suyagi; bo‘yni sinishga moyil.', c: 'Osteoporozda, ayniqsa keksalarda, son bo‘g‘imining sinishi keng tarqalgan.' },
  }),
  ...limbPair({
    base: 'tibia', related: ['femur_left'],
    names: { en: { left: 'Tibia (Left)', right: 'Tibia (Right)' }, ru: { left: 'Большеберцовая кость (левая)', right: 'Большеберцовая кость (правая)' }, uz: { left: 'Katta boldir suyagi (chap)', right: 'Katta boldir suyagi (o‘ng)' } },
    en: { f: 'The main weight-bearing bone of the lower leg.', l: 'Medial side of the lower leg,below the knee.', d: 'The second-largest bone in the body;forms the shin.', c: 'Tibial shaft fractures are common in high-energy trauma.' },
    ru: { f: 'Основная несущая кость голени.', l: 'Медиальная сторона голени, ниже колена.', d: 'Вторая по величине кость тела; образует переднюю поверхность голени.', c: 'Переломы диафиза большеберцовой кости часты при высокоэнергетической травме.' },
    uz: { f: 'Boldirning asosiy yuk ko‘taruvchi suyagi.', l: 'Boldirning medial tomoni, tizza ostida.', d: 'Tana(ning ikkinchi eng katta suyagi; boldir old yuzasini hosil qiladi.', c: 'Katta boldir suyagi sinishi kuchli jarohatlarda keng tarqalgan.' },
  }),
);

// Lookup maps + searchable index (all idioms resolved at runtime per language).
const STRUCTURE_BY_ID = new Map(ANATOMY_STRUCTURES.map((s) => [s.id, s]));
const SYSTEM_BY_ID = new Map(ANATOMY_SYSTEMS.map((s) => [s.id, s]));

export function getStructure(id) {
  return STRUCTURE_BY_ID.get(id) || null;
}
export function getStructureNames(id) {
  // English fallback id-based names for ids missing explicit entries (never happens today).
  const s = STRUCTURE_BY_ID.get(id);
  return s ? s.info : null;
}
export function getSystem(id) {
  return SYSTEM_BY_ID.get(id) || null;
}
export function getSystemStructures(systemId) {
  const sys = SYSTEM_BY_ID.get(systemId);
  return sys ? sys.structures : [];
}
// Quiz bank (localised). correct: index into options array.
export const ANATOMY_QUIZ = [
  {
    q: { en: 'Which organ pumps blood throughout the body?', ru: 'Какой орган перекачивает кровь по всему телу?', uz: 'Qaysi organ qonni butun tan bo‘ylab haydaydi?' },
    options: {
      en: ['Liver', 'Heart', 'Kidney', 'Lung'],
      ru: ['Печень', 'Сердце', 'Почка', 'Лёгкое'],
      uz: ['Jigar', 'Yurak', 'Buyrak', 'O‘pka'],
    },
    correct: 1,
    hintId: 'heart',
    explanation: {
      en: 'The heart is a four-chambered muscular pump. Its rhythmic contractions circulate blood, carrying oxygen and nutrients to every tissue.',
      ru: 'Сердце — мышечный насос с четырьмя камерами. Его ритмичные сокращения перекачивают кровь, доставляя кислород и питательные вещества.',
      uz: 'Yurak to‘rt kamerali mushak nasosdir. Uning ritmik qisqarishlari qonni aylantirib, kislorod va ozuqa moddalarini to‘qimalarga yetkazadi.',
    },
  },
  {
    q: { en: 'Which organ is responsible for gas exchange in the body?', ru: 'Какой орган отвечает за газообмен в организме?', uz: 'Qaysi organ gaz almashinuvi uchun mas’ul?' },
    options: {
      en: ['Stomach', 'Brain', 'Lungs', 'Spleen'],
      ru: ['Желудок', 'Головной мозг', 'Лёгкие', 'Селезёнка'],
      uz: ['Oshqozon', 'Miya', 'O‘pkalar', 'Taloq'],
    },
    correct: 2,
    hintId: 'lungs',
    explanation: {
      en: 'The lungs exchange oxygen and carbon dioxide between inhaled air and the blood across the thin walls of millions of alveoli.',
      ru: 'Лёгкие обменивают кислород и углекислый газ между вдыхаемым воздухом и кровью через тонкие стенки миллионов альвеол.',
      uz: 'O‘pkalar nafas olingan havo va qon o‘rtasida kislorod hamda karbonat angidrid almashinuvini millionlab alveolalar devori orqali amalga oshiradi.',
    },
  },
  {
    q: { en: 'Which organ produces bile and filters the blood?', ru: 'Какой орган вырабатывает желчь и фильтрует кровь?', uz: 'Qaysi organ o‘t ishlab chiqaradi va qonni filtrlaydi?' },
    options: {
      en: ['Pancreas', 'Spleen', 'Kidney', 'Liver'],
      ru: ['Поджелудочная железа', 'Селезёнка', 'Почка', 'Печень'],
      uz: ['Oshqozon osti bezi', 'Taloq', 'Buyrak', 'Jigar'],
    },
    correct: 3,
    hintId: 'liver',
    explanation: {
      en: 'The liver filters blood, produces bile needed for fat digestion, metabolises drugs and stores glycogen.',
      ru: 'Печень фильтрует кровь, вырабатывает желчь для переваривания жиров, метаболизирует лекарства и запасает гликоген.',
      uz: 'Jigar qonni filtrlaydi, yog‘ hazmi uchun o‘t ishlab chiqaradi, dorilarni parchalaydi va glikogen zaxiralaydi.',
    },
  },
  {
    q: { en: 'Which bone structure protects the brain?', ru: 'Какая костная структура защищает головной мозг?', uz: 'Qaysi suyak tuzilmasi miyani himoya qiladi?' },
    options: {
      en: ['Pelvis', 'Ribs', 'Skull', 'Femur'],
      ru: ['Таз', 'Рёбра', 'Череп', 'Бедренная кость'],
      uz: ['Tos suyagi', 'Qovurg‘alar', 'Kalla suyagi', 'Son suyagi'],
    },
    correct: 2,
    hintId: 'skull',
    explanation: {
      en: 'The skull is a rigid case of 22 fused bones that surrounds and protects the brain and supports facial structures.',
      ru: 'Череп — прочный каркас из 22 сросшихся костей, который окружает и защищает головной мозг и поддерживает лицо.',
      uz: 'Kalla suyagi — 22 ta birlashgan suyakdan iborat mustahkam quti; miyani o‘rab himoya qiladi va yuzni qo‘llab turadi.',
    },
  },
  {
    q: { en: 'Where is the pancreas located?', ru: 'Где расположена поджелудочная железа?', uz: 'Oshqozon osti bezi qayerda joylashgan?' },
    options: {
      en: ['In the skull', 'Behind the stomach', 'In the pelvis', 'In front of the larynx'],
      ru: ['В черепе', 'Позади желудка', 'В полости таза', 'Спереди от гортани'],
      uz: ['Kalla suyagida', 'Oshqozon orqasida', 'Tos bo‘shlig‘ida', 'Hiqildoq oldida'],
    },
    correct: 1,
    hintId: 'pancreas',
    explanation: {
      en: 'The pancreas lies retroperitoneally, behind the stomach, producing digestive enzymes and hormones such as insulin.',
      ru: 'Поджелудочная железа расположена забрюшинно, позади желудка, и вырабатывает пищеварительные ферменты и гормоны, включая инсулин.',
      uz: 'Oshqozon osti bezi retroperitoneal, oshqozon orqasida joylashgan bo‘lib, hazm fermentlari va insulin kabi gormonlar ishlab chiqaradi.',
    },
  },
  {
    q: { en: 'Which structure connects the brain to the peripheral nerves?', ru: 'Какая структура соединяет головной мозг с периферическими нервами?', uz: 'Qaysi tuzilma miyani periferik nervlar bilan bog‘laydi?' },
    options: {
      en: ['Trachea', 'Aorta', 'Spinal cord', 'Esophagus'],
      ru: ['Трахея', 'Аорта', 'Спинной мозг', 'Пищевод'],
      uz: ['Traxeya', 'Aorta', 'Orqa miya', 'Qizilo‘ngach'],
    },
    correct: 2,
    hintId: 'spinal_cord',
    explanation: {
      en: 'The spinal cord runs inside the vertebral column and carries signals between the brain and the rest of the body, also coordinating reflexes.',
      ru: 'Спинной мозг проходит внутри позвоночника, проводит сигналы между мозгом и телом, а также координирует рефлексы.',
      uz: 'Orqa miya umurtqa pog‘onasi ichida joylashgan; miya va tana o‘rtasida signallarni o‘tkazadi, shuningdek reflekslarni muvofiqlashtiradi.',
    },
  },
];

export const ANATOMY_HINT_STRUCTURE = 'heart';
