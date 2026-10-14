import { MUSCLE_REGIONS } from './muscular-atlas.js';
// MedPobeda - Anatomy Dashboard Data Structure
// Centralised, data-driven curriculum for the Anatomy Dashboard.
// Each section maps to a system/region of the body. Each card maps to
// existing anatomy models (structure-index.json + GLB files) so the same
// 3D viewer is reused without duplication.
//
// CARD STATUS:
//   'available'     — a real model exists that the viewer can show
//   'coming-soon'   — architecture is ready, model will be added later
//
// CARD FIELDS:
//   modelId  → structure-id in structure-index.json (or null)
//   file     → which GLB file to load (human-body.glb, muscular.glb, ...)
//   layer    → visibility layer (skin, muscles, bones, organs, vessels, nerves)
//   system   → anatomical system tag to enable
//   region   → optional body-region preset (head, upper, lower, thorax, abdomen, pelvis)
//   preset   → optional viewer preset (currently 'skull')
//   proxy    → true when an exact structure is absent and a close related
//              model is used as a study stand-in (e.g. Jejunum → small_intestine)
//
// Titles and one-line blurbs are trilingual here so new topics can be added
// without touching the page or component code.

export const ANATOMY_SECTIONS = [
  {
    id: 'bones',
    title: { en: 'Bones', uz: 'Suyaklar', ru: 'Кости' },
    subtitle: { en: 'Skeletal System', uz: 'Suyak tizimi', ru: 'Костная система' },
    cards: [
      {
        id: 'bones-cranium',
        title: { en: 'Bones of Cranium', uz: 'Kalla suyagi suyaklari', ru: 'Кости черепа' },
        blurb: {
          en: 'Cranial and facial bones that enclose and protect the brain.',
          uz: 'Miyani o‘rab himoya qiluvchi kalla va yuz suyaklari.',
          ru: 'Кости мозгового и лицевого отделов, образующие череп.',
        },
        preset: 'skull', modelId: 'skull', file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'head', status: 'available',
      },
      {
        id: 'bones-trunk',
        title: { en: 'Bones of Trunk', uz: 'Gavda suyaklari', ru: 'Кости туловища' },
        blurb: {
          en: 'Vertebral column, sternum and ribs of the axial skeleton.',
          uz: 'Umurtqa pog‘onasi, to‘sh suyagi va qovurg‘alar.',
          ru: 'Позвоночник, грудина и рёбра осевого скелета.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'thorax', status: 'available',
      },
      {
        id: 'bones-upper-limb',
        title: { en: 'Bones of Upper Limb', uz: 'Yuqori qo‘l suyaklari', ru: 'Кости верхней конечности' },
        blurb: {
          en: 'Clavicle, scapula, arm and forearm skeleton.',
          uz: 'O‘mrov, kurak hamda qo‘l va bilak suyaklari.',
          ru: 'Ключица, лопатка, плечевая кость и кости предплечья.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'upper', status: 'available',
      },
      {
        id: 'bones-lower-limb',
        title: { en: 'Bones of Lower Limb', uz: 'Pastki oyoq suyaklari', ru: 'Кости нижней конечности' },
        blurb: {
          en: 'Pelvic girdle, thigh, leg and foot skeleton.',
          uz: 'Chanoq, son, boldir va oyoq suyaklari.',
          ru: 'Таз, бедро, голень и кости стопы.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'lower', status: 'available',
      },
    ],
  },

{
    id: 'joints',
    title: { en: 'Joints', uz: 'Bo‘g‘imlar', ru: 'Суставы' },
    subtitle: { en: 'Articular System', uz: 'Bo‘g‘im tizimi', ru: 'Суставная система' },
    cards: [
      {
        id: 'joints-type',
        title: { en: 'Joint Type', uz: 'Bo‘g‘im turlari', ru: 'Типы суставов' },
        blurb: {
          en: 'Fibrous, cartilaginous and synovial joints.',
          uz: 'Tolali, tog‘ayli va siynovial bo‘g‘imlar.',
          ru: 'Фиброзные, хрящевые и синовиальные соединения.',
        },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'joints-movement',
        title: { en: 'Articular Movement', uz: 'Bo‘g‘im harakatlari', ru: 'Движения суставов' },
        blurb: {
          en: 'Flexion, extension, rotation and other joint movements.',
          uz: 'Bukilish, yozilish, aylanish va boshqa bo‘g‘im harakatlari.',
          ru: 'Сгибание, разгибание, вращение и другие движения суставов.',
        },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'joints-head-neck',
        title: { en: 'Joints of Head and Neck', uz: 'Bosh va bo‘yin bo‘g‘imlari', ru: 'Суставы головы и шеи' },
        blurb: {
          en: 'Temporomandibular joint and cervical articulations.',
          uz: 'Chakka-pastki jag‘ bo‘g‘imi va bo‘yin bo‘g‘imlari.',
          ru: 'Височно-нижнечелюстной сустав и соединения шеи.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'head', status: 'available',
      },
      {
        id: 'joints-upper-limb',
        title: { en: 'Joints of Upper Limb', uz: 'Yuqori qo‘l bo‘g‘imlari', ru: 'Суставы верхней конечности' },
        blurb: {
          en: 'Shoulder, elbow, wrist and hand joints.',
          uz: 'Yelka, tirsak, bilak va qo‘l bo‘g‘imlari.',
          ru: 'Плечевой, локтевой, лучезапястный суставы и суставы кисти.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'upper', status: 'available',
      },
      {
        id: 'joints-lower-limb',
        title: { en: 'Joints of Lower Limb', uz: 'Pastki oyoq bo‘g‘imlari', ru: 'Суставы нижней конечности' },
        blurb: {
          en: 'Hip, knee, ankle and foot joints.',
          uz: 'Chanoq-son, tizza, to‘piq va oyoq bo‘g‘imlari.',
          ru: 'Тазобедренный, коленный, голеностопный суставы и суставы стопы.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'lower', status: 'available',
      },
      {
        id: 'joints-trunk',
        title: { en: 'Joints of Trunk', uz: 'Gavda bo‘g‘imlari', ru: 'Суставы туловища' },
        blurb: {
          en: 'Vertebral, costal and pelvic articulations.',
          uz: 'Umurtqa, qovurg‘a va chanoq bo‘g‘imlari.',
          ru: 'Соединения позвонков, рёбер и таза.',
        },
        modelId: null, file: 'human-body.glb', layer: 'bones', system: 'skeletal', region: 'thorax', status: 'available',
      },
    ],
  },
  {
    id: 'muscles',
    title: { en: 'Muscles and Muscular System', uz: 'Mushaklar va mushak tizimi', ru: 'Мышцы и мышечная система' },
    subtitle: { en: 'Muscular System', uz: 'Mushak tizimi', ru: 'Мышечная система' },
    cards: [
      {
        id: 'muscles-head-neck',
        title: { en: 'Muscles of Head and Neck', uz: 'Bosh va bo‘yin mushaklari', ru: 'Мышцы головы и шеи' },
        blurb: {
          en: 'Available eye, tongue and neck structures; see the atlas for missing facial muscles.',
          uz: 'Mavjud ko‘z, til va bo‘yin mushaklari; yetishmayotgan modellar atlasda.',
          ru: 'Доступные мышцы глаз, языка и шеи; отсутствующие модели указаны в атласе.',
        },
        modelId: null, file: 'muscular.glb', layer: 'muscles', system: 'muscular', region: 'head', status: 'available',
      },
      {
        id: 'muscles-trunk',
        title: { en: 'Muscles of Trunk', uz: 'Gavda mushaklari', ru: 'Мышцы туловища' },
        blurb: {
          en: 'Chest, abdominal and back muscle groups.',
          uz: 'Ko‘krak, qorin va orqa mushak guruhlari.',
          ru: 'Мышцы груди, живота и спины.',
        },
        modelId: null, file: 'muscular.glb', layer: 'muscles', system: 'muscular', region: 'thorax', status: 'available',
      },
      {
        id: 'muscles-upper-limb',
        title: { en: 'Muscles of Upper Limb', uz: 'Yuqori qo‘l mushaklari', ru: 'Мышцы верхней конечности' },
        blurb: {
          en: 'Shoulder, arm, forearm and hand muscles.',
          uz: 'Yelka, qo‘l, bilak va kaft mushaklari.',
          ru: 'Мышцы плеча, руки, предплечья и кисти.',
        },
        modelId: null, file: 'muscular.glb', layer: 'muscles', system: 'muscular', region: 'upper', status: 'available',
      },
      {
        id: 'muscles-lower-limb',
        title: { en: 'Muscles of Lower Limb', uz: 'Pastki oyoq mushaklari', ru: 'Мышцы нижней конечности' },
        blurb: {
          en: 'Gluteal, thigh, leg and foot muscles.',
          uz: 'Gluteal, son, boldir va oyoq mushaklari.',
          ru: 'Ягодичные мышцы, мышцы бедра, голени и стопы.',
        },
        modelId: null, file: 'muscular.glb', layer: 'muscles', system: 'muscular', region: 'lower', status: 'available',
      },
    ],
  },
{
    id: 'arteries',
    title: { en: 'Arteries', uz: 'Arteriyalar', ru: 'Артерии' },
    subtitle: { en: 'Arterial System', uz: 'Arterial tizim', ru: 'Артериальная система' },
    cards: [
      {
        id: 'arteries-head-neck',
        title: { en: 'Arteries of Head and Neck', uz: 'Bosh va bo‘yin arteriyalari', ru: 'Артерии головы и шеи' },
        blurb: {
          en: 'Carotid and facial arterial supply of the head.',
          uz: 'Bosh va bo‘yin arteriyalari.',
          ru: 'Артерии головы и шеи.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'arterial', region: 'head', status: 'available',
      },
      {
        id: 'arteries-trunk',
        title: { en: 'Arteries of Trunk', uz: 'Gavda arteriyalari', ru: 'Артерии туловища' },
        blurb: {
          en: 'Aorta and its thoracic branches.',
          uz: 'Aorta va uning ko‘krak shoxlari.',
          ru: 'Аорта и её грудные ветви.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'arterial', region: 'thorax', status: 'available',
      },
      {
        id: 'arteries-upper-limb',
        title: { en: 'Arteries of Upper Limb', uz: 'Yuqori qo‘l arteriyalari', ru: 'Артерии верхней конечности' },
        blurb: {
          en: 'Subclavian, axillary, brachial and radial arteries.',
          uz: 'O‘mrov osti, qo‘ltiq osti, yelka va radial arteriyalar.',
          ru: 'Подключичная, подмышечная, плечевая и лучевая артерии.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'arterial', region: 'upper', status: 'available',
      },
      {
        id: 'arteries-lower-limb',
        title: { en: 'Arteries of Lower Limb', uz: 'Pastki oyoq arteriyalari', ru: 'Артерии нижней конечности' },
        blurb: {
          en: 'Femoral, popliteal, tibial and foot arteries.',
          uz: 'Son, tizza ostidagi, boldir va oyoq arteriyalari.',
          ru: 'Бедренная, подколенная, берцовые артерии и артерии стопы.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'arterial', region: 'lower', status: 'available',
      },
    ],
  },
  {
    id: 'heart',
    title: { en: 'Heart', uz: 'Yurak', ru: 'Сердце' },
    subtitle: { en: 'Cardiovascular System', uz: 'Yurak-qon tomir tizimi', ru: 'Сердечно-сосудистая система' },
    cards: [
      {
        id: 'heart',
        title: { en: 'Heart', uz: 'Yurak', ru: 'Сердце' },
        blurb: {
          en: 'The muscular pump of the cardiovascular system.',
          uz: 'Yurak-qon tomir tizimining mushak nasosi.',
          ru: 'Мышечный насос сердечно-сосудистой системы.',
        },
        modelId: 'heart', file: 'human-body.glb', layer: 'organs', system: 'cardiac', status: 'available',
      },
    ],
  },
  {
    id: 'veins',
    title: { en: 'Veins', uz: 'Venalar', ru: 'Вены' },
    subtitle: { en: 'Venous System', uz: 'Venoz tizim', ru: 'Венозная система' },
    cards: [
      {
        id: 'veins-head-neck',
        title: { en: 'Veins of Head and Neck', uz: 'Bosh va bo‘yin venalari', ru: 'Вены головы и шеи' },
        blurb: {
          en: 'Jugular and facial venous drainage.',
          uz: 'Bo‘yin va yuz venalari.',
          ru: 'Яремные и лицевые вены.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'venous', region: 'head', status: 'available',
      },
      {
        id: 'veins-trunk',
        title: { en: 'Veins of Trunk', uz: 'Gavda venalari', ru: 'Вены туловища' },
        blurb: {
          en: 'Venae cavae and thoracic venous trunks.',
          uz: 'Kovak venalar va ko‘krak venalari.',
          ru: 'Полые вены и венозные стволы грудной клетки.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'venous', region: 'thorax', status: 'available',
      },
      {
        id: 'veins-upper-limb',
        title: { en: 'Veins of Upper Limb', uz: 'Yuqori qo‘l venalari', ru: 'Вены верхней конечности' },
        blurb: {
          en: 'Cephalic, basilic and brachial veins.',
          uz: 'Kalla, bazilik va yelka venalari.',
          ru: 'Цефалическая, базиликовая и плечевые вены.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'venous', region: 'upper', status: 'available',
      },
      {
        id: 'veins-lower-limb',
        title: { en: 'Veins of Lower Limb', uz: 'Pastki oyoq venalari', ru: 'Вены нижней конечности' },
        blurb: {
          en: 'Great saphenous, femoral and tibial veins.',
          uz: 'Katta to‘riq osti, son va boldir venalari.',
          ru: 'Большая подкожная, бедренная и берцовые вены.',
        },
        modelId: null, file: 'cardiovascular.glb', layer: 'vessels', system: 'venous', region: 'lower', status: 'available',
      },
    ],
  },
{
    id: 'nervous',
    title: { en: 'Nervous System', uz: 'Nerv tizimi', ru: 'Нервная система' },
    subtitle: { en: 'Neurological System', uz: 'Nerv tizimi', ru: 'Нервная система' },
    cards: [
      {
        id: 'nervous-central',
        title: { en: 'Central Nervous System', uz: 'Markaziy nerv tizimi', ru: 'Центральная нервная система' },
        blurb: {
          en: 'Brain and spinal cord.',
          uz: 'Miya va orqa miya.',
          ru: 'Головной и спинной мозг.',
        },
        modelId: 'brain', file: 'nervous.glb', layer: 'nerves', system: 'nervous', region: 'head', status: 'available',
      },
      {
        id: 'nervous-pns-head',
        title: { en: 'Peripheral Nervous System — Head and Neck', uz: 'Periferik nerv tizimi — bosh va bo‘yin', ru: 'ПНС — голова и шея' },
        blurb: {
          en: 'Cranial nerves innervating the head and neck.',
          uz: 'Bosh va bo‘yinni innervatsiya qiluvchi bosh miya nervlari.',
          ru: 'Черепные нервы головы и шеи.',
        },
        modelId: null, file: 'nervous.glb', layer: 'nerves', system: 'nervous', region: 'head', status: 'available',
      },
      {
        id: 'nervous-pns-trunk',
        title: { en: 'Peripheral Nervous System — Trunk', uz: 'Periferik nerv tizimi — gavda', ru: 'ПНС — туловище' },
        blurb: {
          en: 'Spinal nerves of the trunk.',
          uz: 'Gavda orqa miya nervlari.',
          ru: 'Спинномозговые нервы туловища.',
        },
        modelId: null, file: 'nervous.glb', layer: 'nerves', system: 'nervous', region: 'thorax', status: 'available',
      },
      {
        id: 'nervous-pns-upper',
        title: { en: 'Peripheral Nervous System — Upper Limb', uz: 'Periferik nerv tizimi — yuqori qo‘l', ru: 'ПНС — верхняя конечность' },
        blurb: {
          en: 'Brachial plexus and upper-limb nerves.',
          uz: 'Yelka chigali va yuqori qo‘l nervlari.',
          ru: 'Плечевое сплетение и нервы верхней конечности.',
        },
        modelId: null, file: 'nervous.glb', layer: 'nerves', system: 'nervous', region: 'upper', status: 'available',
      },
      {
        id: 'nervous-pns-lower',
        title: { en: 'Peripheral Nervous System — Lower Limb', uz: 'Periferik nerv tizimi — pastki oyoq', ru: 'ПНС — нижняя конечность' },
        blurb: {
          en: 'Lumbosacral plexus and lower-limb nerves.',
          uz: 'Bel-chanoq chigali va pastki oyoq nervlari.',
          ru: 'Пояснично-крестцовое сплетение и нервы нижней конечности.',
        },
        modelId: null, file: 'nervous.glb', layer: 'nerves', system: 'nervous', region: 'lower', status: 'available',
      },
    ],
  },
{
    id: 'lymphoid',
    title: { en: 'Lymphoid System', uz: 'Limfa tizimi', ru: 'Лимфоидная система' },
    subtitle: { en: 'Immune System', uz: 'Immun tizimi', ru: 'Иммунная система' },
    cards: [
      {
        id: 'lymphoid-primary',
        title: { en: 'Primary Lymphoid Organs', uz: 'Birlamchi limfoid a’zolar', ru: 'Первичные лимфоидные органы' },
        blurb: {
          en: 'Thymus and bone marrow.',
          uz: 'Aykurtcha (timus) va suyak ko‘migi.',
          ru: 'Тимус и костный мозг.',
        },
        modelId: 'thymus', file: 'human-body.glb', layer: 'organs', system: 'lymphatic', status: 'available',
      },
      {
        id: 'lymphoid-secondary',
        title: { en: 'Secondary Lymphoid Organs', uz: 'Ikkilamchi limfoid a’zolar', ru: 'Вторичные лимфоидные органы' },
        blurb: {
          en: 'Spleen and lymph nodes.',
          uz: 'Taloq va limfa tugunlari.',
          ru: 'Селезёнка и лимфатические узлы.',
        },
        modelId: 'spleen', file: 'human-body.glb', layer: 'organs', system: 'lymphatic', status: 'available',
      },
      {
        id: 'lymphoid-head-neck',
        title: { en: 'Lymph Nodes of Head and Neck', uz: 'Bosh va bo‘yin limfa tugunlari', ru: 'Лимфатические узлы головы и шеи' },
        blurb: { en: 'Cervical and facial lymph node groups.', uz: 'Bo‘yin va yuz limfa tugunlari.', ru: 'Шейные и лицевые лимфатические узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'lymphoid-thoracic',
        title: { en: 'Thoracic Lymph Nodes', uz: 'Ko‘krak limfa tugunlari', ru: 'Лимфатические узлы грудной клетки' },
        blurb: { en: 'Mediastinal and bronchial node groups.', uz: 'Ko‘ks oralig‘i va bronx limfa tugunlari.', ru: 'Медиастинальные и бронхиальные узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'lymphoid-abdominal',
        title: { en: 'Abdominal Lymph Nodes', uz: 'Qorin limfa tugunlari', ru: 'Лимфатические узлы брюшной полости' },
        blurb: { en: 'Retroperitoneal and mesenteric node groups.', uz: 'Qorin parda orti va ichak tutqichi limfa tugunlari.', ru: 'Забрюшинные и брыжеечные узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'lymphoid-pelvic',
        title: { en: 'Pelvic Lymph Nodes', uz: 'Chanoq limfa tugunlari', ru: 'Лимфатические узлы таза' },
        blurb: { en: 'Iliac and pelvic node groups.', uz: 'Yonbosh va chanoq limfa tugunlari.', ru: 'Подвздошные и тазовые узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'lymphoid-upper-limb',
        title: { en: 'Lymph Nodes of Upper Limb', uz: 'Yuqori qo‘l limfa tugunlari', ru: 'Лимфатические узлы верхней конечности' },
        blurb: { en: 'Axillary and cubital node groups.', uz: 'Qo‘ltiq osti va tirsak limfa tugunlari.', ru: 'Подмышечные и локтевые узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
      {
        id: 'lymphoid-lower-limb',
        title: { en: 'Lymph Nodes of Lower Limb', uz: 'Pastki oyoq limfa tugunlari', ru: 'Лимфатические узлы нижней конечности' },
        blurb: { en: 'Inguinal and popliteal node groups.', uz: 'Chov va tizza osti limfa tugunlari.', ru: 'Паховые и подколенные узлы.' },
        modelId: null, file: null, layer: null, system: null, status: 'coming-soon',
      },
    ],
  },
{
    id: 'senses',
    title: { en: 'Sense Organs', uz: 'Sezgi a’zolari', ru: 'Органы чувств' },
    subtitle: { en: 'Sensory System', uz: 'Sezgi tizimi', ru: 'Сенсорная система' },
    cards: [
      {
        id: 'sense-olfactory',
        title: { en: 'Olfactory Organ', uz: 'Hid bilish a’zosi', ru: 'Обонятельный орган' },
        blurb: {
          en: 'Olfactory epithelium of the nasal cavity.',
          uz: 'Burun bo‘shlig‘idagi hid bilish epiteliysi.',
          ru: 'Обонятельный эпителий носовой полости.',
        },
        modelId: null, file: null, layer: 'organs', system: 'sensory', status: 'coming-soon',
      },
      {
        id: 'sense-eye',
        title: { en: 'Eye', uz: 'Ko‘z', ru: 'Глаз' },
        blurb: {
          en: 'The organ of vision.',
          uz: 'Ko‘rish a’zosi.',
          ru: 'Орган зрения.',
        },
        modelId: 'eye', file: 'human-body.glb', layer: 'organs', system: 'sensory', status: 'available',
      },
      {
        id: 'sense-ear',
        title: { en: 'Ear', uz: 'Quloq', ru: 'Ухо' },
        blurb: {
          en: 'The organ of hearing and balance.',
          uz: 'Eshitish va muvozanat a’zosi.',
          ru: 'Орган слуха и равновесия.',
        },
        modelId: null, file: null, layer: 'organs', system: 'sensory', status: 'coming-soon',
      },
    ],
  },
  {
    id: 'respiratory',
    title: { en: 'Respiratory System', uz: 'Nafas olish tizimi', ru: 'Дыхательная система' },
    subtitle: { en: 'Pulmonary System', uz: 'Nafas olish tizimi', ru: 'Лёгочная система' },
    cards: [
      {
        id: 'resp-larynx',
        title: { en: 'Larynx', uz: 'Hilqum', ru: 'Гортань' },
        blurb: {
          en: 'Voice box and airway entrance.',
          uz: 'Ovoz paychalarini saqlovchi nafas yo‘li.',
          ru: 'Гортань — голосовой аппарат и вход в дыхательные пути.',
        },
        modelId: null, file: null, layer: 'organs', system: 'respiratory', status: 'coming-soon',
      },
      {
        id: 'resp-trachea',
        title: { en: 'Trachea', uz: 'Kekirdak', ru: 'Трахея' },
        blurb: {
          en: 'The cartilaginous airway to the bronchi.',
          uz: 'Bronxlarga olib boruvchi tog‘ayli nafas yo‘li.',
          ru: 'Хрящевой воздухоносный путь к бронхам.',
        },
        modelId: 'trachea', file: 'human-body.glb', layer: 'organs', system: 'respiratory', status: 'available',
      },
      {
        id: 'resp-lungs',
        title: { en: 'Lungs', uz: 'O‘pkalar', ru: 'Лёгкие' },
        blurb: {
          en: 'Paired organs of gas exchange.',
          uz: 'Gaz almashinuvi juft a’zolari.',
          ru: 'Парные органы газообмена.',
        },
        modelId: 'lungs', file: 'human-body.glb', layer: 'organs', system: 'respiratory', status: 'available',
      },
      {
        id: 'resp-pleura',
        title: { en: 'Pleura', uz: 'Plevra', ru: 'Плевра' },
        blurb: {
          en: 'The serous membrane around the lungs.',
          uz: 'O‘pkalarni o‘rab turuvchi seroz parda.',
          ru: 'Серозная оболочка, окружающая лёгкие.',
        },
        modelId: null, file: null, layer: 'organs', system: 'respiratory', status: 'coming-soon',
      },
    ],
  },
{
    id: 'digestive',
    title: { en: 'Alimentary System', uz: 'Ovqat hazm qilish tizimi', ru: 'Пищеварительная система' },
    subtitle: { en: 'Digestive System', uz: 'Hazm tizimi', ru: 'Пищеварительная система' },
    cards: [
      {
        id: 'digest-teeth',
        title: { en: 'Teeth', uz: 'Tishlar', ru: 'Зубы' },
        blurb: {
          en: 'Incisors, canines, premolars and molars.',
          uz: 'Kesuvchi, qoziq va oziq tishlar.',
          ru: 'Резцы, клыки, премоляры и моляры.',
        },
        modelId: 'teeth', file: 'human-body.glb', layer: 'bones', system: 'skeletal', status: 'available',
      },
      {
        id: 'digest-oral-cavity',
        title: { en: 'Oral Cavity', uz: 'Og‘iz bo‘shlig‘i', ru: 'Ротовая полость' },
        blurb: {
          en: 'Mouth, tongue and palate.',
          uz: 'Og‘iz, til va tanglay.',
          ru: 'Полость рта, язык и нёбо.',
        },
        modelId: null, file: null, layer: 'organs', system: 'digestive', status: 'coming-soon',
      },
      {
        id: 'digest-glands-mouth',
        title: { en: 'Glands of Mouth', uz: 'Og‘iz bezlari', ru: 'Слюнные железы рта' },
        blurb: {
          en: 'Salivary glands of the oral cavity.',
          uz: 'Og‘iz bo‘shlig‘i so‘lak bezlari.',
          ru: 'Слюнные железы ротовой полости.',
        },
        modelId: 'salivary_glands', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
      {
        id: 'digest-pharynx',
        title: { en: 'Pharynx', uz: 'Hilqum', ru: 'Глотка' },
        blurb: {
          en: 'The shared airway and food passage.',
          uz: 'Nafas va ovqat o‘tadigan umumiy yo‘l.',
          ru: 'Общий путь для воздуха и пищи.',
        },
        modelId: null, file: null, layer: 'organs', system: 'digestive', status: 'coming-soon',
      },
      {
        id: 'digest-esophagus',
        title: { en: 'Esophagus', uz: 'Qizilo‘ngach', ru: 'Пищевод' },
        blurb: {
          en: 'The muscular tube from pharynx to stomach.',
          uz: 'Hilqumdan oshqozongacha bo‘lgan mushak nay.',
          ru: 'Мышечная трубка от глотки до желудка.',
        },
        modelId: 'esophagus', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
      {
        id: 'digest-stomach',
        title: { en: 'Stomach', uz: 'Oshqozon', ru: 'Желудок' },
        blurb: {
          en: 'The main chamber of chemical digestion.',
          uz: 'Kimyoviy hazmning asosiy bo‘limi.',
          ru: 'Основной отдел химического переваривания.',
        },
        modelId: 'stomach', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
      {
        id: 'digest-liver',
        title: { en: 'Liver', uz: 'Jigar', ru: 'Печень' },
        blurb: {
          en: 'The largest gland, producer of bile.',
          uz: 'Eng yirik bez — o‘t ishlab chiqaradi.',
          ru: 'Крупнейшая железа, вырабатывает желчь.',
        },
        modelId: 'liver', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
      {
        id: 'digest-gallbladder',
        title: { en: 'Gallbladder', uz: 'O‘t pufagi', ru: 'Желчный пузырь' },
        blurb: {
          en: 'Stores and concentrates bile.',
          uz: 'O‘tni saqlaydi va quyuqlashtiradi.',
          ru: 'Хранит и концентрирует желчь.',
        },
        modelId: 'gallbladder', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
      {
        id: 'digest-pancreas',
        title: { en: 'Pancreas', uz: 'Oshqozon osti bezi', ru: 'Поджелудочная железа' },
        blurb: {
          en: 'Digestive enzymes and insulin production.',
          uz: 'Hazm fermentlari va insulin ishlab chiqaradi.',
          ru: 'Вырабатывает ферменты и инсулин.',
        },
        modelId: 'pancreas', file: 'human-body.glb', layer: 'organs', system: 'digestive', status: 'available',
      },
{
        id: 'digest-duodenum',
        title: { en: 'Duodenum', uz: 'O‘n ikki barmoqli ichak', ru: 'Двенадцатиперстная кишка' },
        blurb: {
          en: 'First part of the small intestine.',
          uz: 'Ingichka ichakning boshlang‘ich qismi.',
          ru: 'Начальный отдел тонкой кишки.',
        },
        modelId: null, file: null, layer: 'organs', system: 'digestive', status: 'coming-soon',
      },
      {
        id: 'digest-jejunum',
        title: { en: 'Jejunum', uz: 'Och ichak', ru: 'Тощая кишка' },
        blurb: {
          en: 'Middle small intestine (study proxy: small intestine).',
          uz: 'Ingichka ichak o‘rta qismi (o‘quv o‘rni: ingichka ichak).',
          ru: 'Средний отдел тонкой кишки (учебный аналог: тонкая кишка).',
        },
        modelId: 'small_intestine', file: 'human-body.glb', layer: 'organs', system: 'digestive', proxy: true, status: 'available',
      },
      {
        id: 'digest-ileum',
        title: { en: 'Ileum', uz: 'Yonbosh ichak', ru: 'Подвздошная кишка' },
        blurb: {
          en: 'Final small intestine (study proxy: small intestine).',
          uz: 'Ingichka ichak oxirgi qismi (o‘quv o‘rni: ingichka ichak).',
          ru: 'Конечный отдел тонкой кишки (учебный аналог: тонкая кишка).',
        },
        modelId: 'small_intestine', file: 'human-body.glb', layer: 'organs', system: 'digestive', proxy: true, status: 'available',
      },
      {
        id: 'digest-colon',
        title: { en: 'Colon', uz: 'Yo‘g‘on ichak', ru: 'Ободочная кишка' },
        blurb: {
          en: 'Large intestine (study proxy: large intestine).',
          uz: 'Yo‘g‘on ichak (o‘quv o‘rni: yo‘g‘on ichak).',
          ru: 'Толстая кишка (учебный аналог: толстая кишка).',
        },
        modelId: 'large_intestine', file: 'human-body.glb', layer: 'organs', system: 'digestive', proxy: true, status: 'available',
      },
      {
        id: 'digest-rectum',
        title: { en: 'Rectum', uz: 'To‘g‘ri ichak', ru: 'Прямая кишка' },
        blurb: {
          en: 'Terminal large intestine (study proxy: large intestine).',
          uz: 'Yo‘g‘on ichak oxirgi qismi (o‘quv o‘rni: yo‘g‘on ichak).',
          ru: 'Конечный отдел толстой кишки (учебный аналог: толстая кишка).',
        },
        modelId: 'large_intestine', file: 'human-body.glb', layer: 'organs', system: 'digestive', proxy: true, status: 'available',
      },
      {
        id: 'digest-peritoneum',
        title: { en: 'Peritoneum', uz: 'Qorin parda', ru: 'Брюшина' },
        blurb: {
          en: 'Serous membrane lining the abdominal cavity.',
          uz: 'Qorin bo‘shlig‘ini qoplovchi seroz parda.',
          ru: 'Серозная оболочка брюшной полости.',
        },
        modelId: null, file: null, layer: 'organs', system: 'digestive', status: 'coming-soon',
      },
    ],
  },
{
    id: 'urinary',
    title: { en: 'Urinary System', uz: 'Siydik ajratish tizimi', ru: 'Мочевыделительная система' },
    subtitle: { en: 'Excretory System', uz: 'Ajratish tizimi', ru: 'Выделительная система' },
    cards: [
      {
        id: 'urinary-kidney',
        title: { en: 'Kidney', uz: 'Buyrak', ru: 'Почка' },
        blurb: {
          en: 'Filters blood and forms urine.',
          uz: 'Qonni filtrlaydi va siydik hosil qiladi.',
          ru: 'Фильтрует кровь и образует мочу.',
        },
        modelId: 'kidney_left', file: 'human-body.glb', layer: 'organs', system: 'urinary', status: 'available',
      },
      {
        id: 'urinary-ureter',
        title: { en: 'Ureter', uz: 'Siydik yo‘li', ru: 'Мочеточник' },
        blurb: {
          en: 'Carries urine to the bladder.',
          uz: 'Siydikni pufakka olib boradi.',
          ru: 'Проводит мочу в мочевой пузырь.',
        },
        modelId: 'ureter_left', file: 'human-body.glb', layer: 'organs', system: 'urinary', status: 'available',
      },
      {
        id: 'urinary-bladder',
        title: { en: 'Urinary Bladder', uz: 'Siydik pufagi', ru: 'Мочевой пузырь' },
        blurb: {
          en: 'Stores urine before voiding.',
          uz: 'Siydikni saqlaydi.',
          ru: 'Накапливает мочу.',
        },
        modelId: 'urinary_bladder', file: 'human-body.glb', layer: 'organs', system: 'urinary', status: 'available',
      },
      {
        id: 'urinary-male-genital',
        title: { en: 'Male Genital System', uz: 'Erkak jinsiy tizimi', ru: 'Мужская половая система' },
        blurb: {
          en: 'Male reproductive organs.',
          uz: 'Erkak jinsiy a’zolari.',
          ru: 'Мужские половые органы.',
        },
        modelId: null, file: 'human-body.glb', layer: 'organs', system: 'reproductive', status: 'available',
      },
      {
        id: 'urinary-female-genital',
        title: { en: 'Female Genital System', uz: 'Ayol jinsiy tizimi', ru: 'Женская половая система' },
        blurb: {
          en: 'Female reproductive organs.',
          uz: 'Ayol jinsiy a’zolari.',
          ru: 'Женские половые органы.',
        },
        modelId: null, file: null, layer: 'organs', system: 'reproductive', status: 'coming-soon',
      },
    ],
  },
  {
    id: 'endocrine',
    title: { en: 'Endocrine Glands', uz: 'Endokrin bezlar', ru: 'Эндокринные железы' },
    subtitle: { en: 'Hormonal System', uz: 'Gormonal tizim', ru: 'Гормональная система' },
    cards: [
      {
        id: 'endocrine-pineal',
        title: { en: 'Pineal Gland (Pineal Body)', uz: 'Epifiz (qarag‘ay bez)', ru: 'Эпифиз (шишковидное тело)' },
        blurb: {
          en: 'Melatonin-secreting gland of the brain.',
          uz: 'Melatonin ishlab chiqaruvchi miya bezi.',
          ru: 'Железа мозга, вырабатывающая мелатонин.',
        },
        modelId: 'pineal', file: 'human-body.glb', layer: 'organs', system: 'endocrine', status: 'available',
      },
      {
        id: 'endocrine-thyroid',
        title: { en: 'Thyroid Gland', uz: 'Qalqonsimon bez', ru: 'Щитовидная железа' },
        blurb: {
          en: 'Metabolism-regulating gland of the neck.',
          uz: 'Modda almashinuvini boshqaruvchi bo‘yin bezi.',
          ru: 'Железа шеи, регулирующая обмен веществ.',
        },
        modelId: null, file: null, layer: 'organs', system: 'endocrine', status: 'coming-soon',
      },
      {
        id: 'endocrine-parathyroid',
        title: { en: 'Parathyroid Glands', uz: 'Qalqonoldi bezlari', ru: 'Околощитовидные железы' },
        blurb: {
          en: 'Calcium-regulating glands behind the thyroid.',
          uz: 'Qalqonsimon bez orqasidagi kalsiyni boshqaruvchi bezlar.',
          ru: 'Околощитовидные железы, регулирующие кальций.',
        },
        modelId: null, file: null, layer: 'organs', system: 'endocrine', status: 'coming-soon',
      },
      {
        id: 'endocrine-pituitary',
        title: { en: 'Pituitary Gland (Hypophysis)', uz: 'Gipofiz (miya osti bezi)', ru: 'Гипофиз (питуитарная железа)' },
        blurb: {
          en: 'The master gland of the endocrine system.',
          uz: 'Endokrin tizimning bosh bezi.',
          ru: 'Главная железа эндокринной системы.',
        },
        modelId: 'pituitary', file: 'human-body.glb', layer: 'organs', system: 'endocrine', status: 'available',
      },
      {
        id: 'endocrine-adrenal',
        title: { en: 'Adrenal Gland (Suprarenal Gland)', uz: 'Buyrak usti bezi', ru: 'Надпочечник (надпочечная железа)' },
        blurb: {
          en: 'Stress-hormone glands above the kidneys.',
          uz: 'Buyraklar ustidagi stress gormonlari bezlari.',
          ru: 'Надпочечные железы стрессовых гормонов.',
        },
        modelId: 'adrenal_left', file: 'human-body.glb', layer: 'organs', system: 'endocrine', status: 'available',
      },
    ],
  },
];
// Exact models only: a whole bowel or regional skeleton is not a segmented
// intestinal organ or a dedicated joint model.
for (const section of ANATOMY_SECTIONS) for (const card of section.cards) {
 if(card.proxy || section.id==='joints' || ['nervous-pns-trunk','nervous-pns-upper','nervous-pns-lower'].includes(card.id)) card.status='coming-soon';
}
// Use real regional bone geometry as an explicitly labelled reference for
// joint topics; this is not a fabricated joint or a joint-motion simulation.
for(const card of ANATOMY_SECTIONS.find(s=>s.id==='joints').cards){
 const region=card.id.includes('head')?'head':card.id.includes('lower')?'lower':card.id.includes('trunk')?'thorax':'upper';
 const id=region==='head'?'bones-cranium':region==='lower'?'bones-lower-limb':region==='thorax'?'bones-trunk':'bones-upper-limb';
 card.previewReference={id,file:'human-body.glb',system:'skeletal',region,...(region==='head'?{preset:'skull'}:{})};
}
// Full-body and regional cards share the same provider, engine and metadata.
const muscleSection = ANATOMY_SECTIONS.find(s=>s.id==='muscles');
muscleSection.cards.unshift({id:'muscles-all',title:{en:'Whole-body muscular atlas',uz:'Butun tana mushaklari',ru:'Мышечный атлас всего тела'},blurb:{en:'Explore available segmented muscles; review coverage gaps in the atlas.',uz:'Mavjud mushaklarni o‘rganing; yetishmayotgan modellar atlasda ko‘rsatilgan.',ru:'Изучайте доступные мышцы; отсутствующие модели указаны в атласе.'},modelId:null,file:'muscular.glb',layer:'muscles',system:'muscular',status:'available'});
for(const [region,[en,uz,ru]] of Object.entries(MUSCLE_REGIONS)){
 if(['head-neck','unclassified'].includes(region))continue;
 muscleSection.cards.push({id:'muscles-'+region,title:{en,uz,ru},blurb:{en:'Available source structures',uz:'Mavjud anatomik tuzilmalar',ru:'Доступные анатомические структуры'},muscleRegion:region,modelId:null,file:'muscular.glb',layer:'muscles',system:'muscular',status:'available'});
}

// Flat lookup for quick access
export const ANATOMY_CARDS = ANATOMY_SECTIONS.flatMap((s) => s.cards);
export function getCard(id) { return ANATOMY_CARDS.find((c) => c.id === id); }
export function getSection(id) { return ANATOMY_SECTIONS.find((s) => s.id === id); }

// Localized title helper: returns title/blurb for the requested language
// (falling back to English) so components never have to branch on language.
export function lname(obj, lang) { return obj?.[lang] || obj?.en || ''; }
export function cardTitle(card, lang) { return lname(card.title, lang); }
export function cardBlurb(card, lang) { return lname(card.blurb, lang); }

// Map a card to viewer query params for the existing /anatomy-3d viewer.
// Preset takes precedence over a focus structure (e.g. skull opens the
// full cranium, not a single selectable mesh).
export function cardToViewerParams(card) {
  if (card.status !== 'available') return null;
  const params = new URLSearchParams();
  params.set('topic', card.id);
  if (card.system) params.set('system', card.system);
  if (card.layer) params.set('layer', card.layer);
  if (card.file) params.set('file', card.file);
  if (card.region) params.set('region', card.region);
  if (card.preset) params.set('preset', card.preset);
  else if (card.modelId) params.set('focus', card.modelId);
  return params.toString();
}

// Viewer topic: expose the card so the 3D page can build its breadcrumb
// and apply preset/region/system/focus in the correct order.
export function cardForTopic(topic) { return getCard(topic); }
