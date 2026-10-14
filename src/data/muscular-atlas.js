import { abdominalAnnotation } from './abdominal-anatomy.js';
// Real source structures only. Never synthesize geometry or infer anatomy from position.
// Provider entries can override these conservative name mappings via entry.anatomy.
export const MUSCLE_REGIONS = {
 'head-neck': ['Head & Neck','Bosh va bo‘yin','Голова и шея'], thorax:['Thorax','Ko‘krak','Грудная клетка'],
 abdomen:['Abdomen','Qorin','Живот'], back:['Back','Orqa','Спина'], shoulder:['Shoulder','Yelka','Плечевой пояс'],
 arm:['Arm','Yuqori qo‘l','Плечо'], forearm:['Forearm','Bilak','Предплечье'], hand:['Hand','Kaft','Кисть'],
 pelvis:['Pelvis','Chanoq','Таз'], gluteal:['Gluteal Region','Dumba','Ягодичная область'],
 thigh:['Thigh','Son','Бедро'], leg:['Leg','Boldir','Голень'], foot:['Foot','Oyoq panjasi','Стопа'],
 unclassified:['Unclassified','Tasniflanmagan','Не классифицировано'],
};
export const muscleLabel = (values,lang='en') => values[{en:0,uz:1,ru:2}[lang]??0];
// Requested coverage is a manifest, not a claim that every required asset exists.
const required = {
 'head-neck':'frontalis|occipitalis|temporalis|masseter|orbicularis oculi|orbicularis oris|buccinator|zygomaticus major|zygomaticus minor|risorius|nasalis|mentalis|platysma|sternocleidomastoid|scalenus|digastric|mylohyoid|geniohyoid|stylohyoid|sternohyoid|sternothyroid|thyrohyoid|omohyoid|longus capitis|longus colli|medial pterygoid|lateral pterygoid',
 thorax:'pectoralis major|pectoralis minor|serratus anterior|external intercostal|internal intercostal|innermost intercostal|subclavius|transversus thoracis|diaphragm',
 abdomen:'rectus abdominis|external oblique|internal oblique|transversus abdominis|pyramidalis|quadratus lumborum',
 back:'trapezius|latissimus dorsi|rhomboid major|rhomboid minor|levator scapulae|iliocostalis|longissimus|spinalis|multifidus|rotator|semispinalis|splenius|intertransversarius|interspinalis|serratus posterior|levatores costarum',
 shoulder:'deltoid|supraspinatus|infraspinatus|teres major|teres minor|subscapularis',
 arm:'biceps brachii|brachialis|coracobrachialis|triceps brachii|anconeus',
 forearm:'pronator teres|flexor carpi radialis|palmaris longus|flexor carpi ulnaris|flexor digitorum superficialis|flexor digitorum profundus|flexor pollicis longus|pronator quadratus|brachioradialis|extensor carpi radialis longus|extensor carpi radialis brevis|extensor digitorum|extensor carpi ulnaris|supinator|abductor pollicis longus|extensor pollicis longus|extensor pollicis brevis|extensor indicis|extensor digiti minimi',
 hand:'abductor pollicis brevis|flexor pollicis brevis|opponens pollicis|adductor pollicis|palmaris brevis|lumbricals of hand|interossei of hand|abductor digiti minimi of hand|flexor digiti minimi brevis of hand|opponens digiti minimi of hand',
 pelvis:'coccygeus|iliococcygeus|pubococcygeus|puborectalis|perineal|external anal sphincter',
 gluteal:'gluteus maximus|gluteus medius|gluteus minimus|tensor fasciae latae|piriformis|obturator internus|gemellus inferior|gemellus superior|quadratus femoris|iliotibial tract',
 thigh:'sartorius|rectus femoris|vastus lateralis|vastus medialis|vastus intermedius|iliacus|psoas major|pectineus|adductor longus|adductor brevis|adductor magnus|adductor minimus|gracilis|obturator externus|biceps femoris|semitendinosus|semimembranosus',
 leg:'tibialis anterior|extensor hallucis longus|extensor digitorum longus|fibularis tertius|fibularis longus|fibularis brevis|gastrocnemius|soleus|plantaris|popliteus|tibialis posterior|flexor hallucis longus|flexor digitorum longus',
 foot:'extensor hallucis brevis|extensor digitorum brevis|abductor hallucis|flexor digitorum brevis|abductor digiti minimi of foot|flexor digiti minimi brevis of foot|opponens digiti minimi of foot|flexor hallucis brevis|adductor hallucis|quadratus plantae|lumbrical of foot|interosseous of foot',
};
export const MUSCLE_REQUIREMENTS = Object.entries(required).flatMap(([region,names])=>names.split('|').map(name=>({name,region})));
function normalized(name) {
 return name.toLowerCase().replace(/\b(left|right)\s*/g,'').replace(/\bmuscle\b/g,'').replace(/\s+/g,' ').trim()
  .replace('flexor accessorius','quadratus plantae').replace('intertransversarii','intertransversarius').replace('interspinales','interspinalis');
}
function matches(name,target) {
 // Digit muscles must be assigned to the hand/foot, not the similarly named forearm/leg muscles.
 if(target==='extensor digitorum') return /extensor digitorum$/.test(name);
 if(target.includes(' of ')) { const [a,b]=target.split(' of ');return name.includes(a)&&name.endsWith(b); }
 return new RegExp('(?:^|\\s)'+target+'(?:$|\\s)').test(name);
}
export function muscleRecord(id,entry) {
 if(entry.system!=='muscular' || /papillary/.test(entry.name))return null;
 const n=normalized(entry.name);
 const requirement=MUSCLE_REQUIREMENTS.find(r=>matches(n,r.name));
 const region=requirement?.region || (/capitis|colli|hyoid|scalen|arytenoid|aryepiglott|vocalis|cricothyroid|glossus|palatini|uvular|palpebrae|^(inferior|superior) oblique$|^(inferior|superior|medial|lateral) rectus$/.test(n)?'head-neck':'unclassified');
 // Layer means regional dissection depth, not a global physical shell.
 // Keep ambiguous structures unclassified until a reviewed annotation is supplied.
 let layer='unclassified';
 if(/pectoralis major|external oblique|trapezius|latissimus dorsi|deltoid|biceps brachii|platysma|sternocleidomastoid|gluteus maximus|gastrocnemius|sartorius/.test(n))layer='superficial';
 if(/internal oblique|gluteus medius|soleus|flexor digitorum superficialis/.test(n))layer='intermediate';
 if(/transversus abdominis|gluteus minimus|pectoralis minor|subclavius|pronator quadratus|flexor digitorum profundus|flexor pollicis longus|tibialis posterior|flexor hallucis longus|flexor digitorum longus|vastus intermedius|longus capitis|longus colli|multifidus|rotator|intertransvers|interspinal/.test(n))layer='deep';
 if(/iliotibial tract/.test(n))layer='connective';
 const side=/\bleft\b/i.test(entry.name)?'left':/\bright\b/i.test(entry.name)?'right':id==='diaphragm'?'midline':'unknown';
 const aliases=[n, n.replace(/fibularis/g,'peroneus'),...(/flexor accessorius/i.test(entry.name)?['quadratus plantae']:[])];
 return {id,name:entry.name,latinName:null,region,compartment:null,side,layer,origin:null,insertion:null,action:null,innervation:null,bloodSupply:null,clinicalRelevance:null,modelId:entry.file?id:null,aliases,
   annotationStatus:'source-name mapping; educational review pending',sourceParts:entry.sourceParts||[],
   ...(/biceps brachii/.test(n)?{
     latinName:'Musculus biceps brachii',compartment:'Anterior arm',
     origin:/long head/.test(n)?'Supraglenoid tubercle of the scapula and superior glenoid labrum.':/short head/.test(n)?'Coracoid process of the scapula.':null,
     insertion:'Radial tuberosity; forearm fascia through the bicipital aponeurosis.',
     action:'Flexes the elbow and supinates the forearm.',innervation:'Musculocutaneous nerve.',
     bloodSupply:'Muscular branches of the brachial artery.',
     referenceUrl:'https://www.ncbi.nlm.nih.gov/books/NBK519538/',
   }:{}),...abdominalAnnotation(n),...entry.anatomy,id,modelId:entry.file?id:null};
}
export function muscleCatalog(index) {return Object.fromEntries(Object.entries(index).map(([id,e])=>[id,muscleRecord(id,e)]).filter(([,r])=>r));}
export function muscleCoverage(index) {
 const records=Object.values(muscleCatalog(index));
 return MUSCLE_REQUIREMENTS.map(r=>({...r,modelIds:records.filter(m=>m.region===r.region&&matches(normalized(m.name),r.name)&&m.modelId).map(m=>m.id)}));
}
export const MUSCLE_LAYERS=['superficial','intermediate','deep','unclassified','connective'];
export function defaultMuscleFilters(){return {regions:Object.keys(MUSCLE_REGIONS),layers:[...MUSCLE_LAYERS],side:'both',context:false};}
export function muscleMatches(record,filters) {
 return !record || (filters.regions.includes(record.region)&&filters.layers.includes(record.layer)&&(filters.side==='both'||record.side===filters.side||record.side==='midline'));
}
export const MUSCLE_TOPIC_REGIONS={
 'muscles-head-neck':['head-neck'], 'muscles-trunk':['thorax','abdomen','back'],
 'muscles-upper-limb':['shoulder','arm','forearm','hand'], 'muscles-lower-limb':['pelvis','gluteal','thigh','leg','foot'],
};
export function muscleTopicRegions(card){return card.id==='muscles-all'?Object.keys(MUSCLE_REGIONS):MUSCLE_TOPIC_REGIONS[card.id] || (card.muscleRegion?[card.muscleRegion]:[]);}
