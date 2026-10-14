// Source names/IDs come from the existing GLB index, never from screen position.
// Side is retained only when explicitly supplied by the source.
const bones = {
 'Frontal bone':['Os frontale','Frontal bone','Peshona suyagi','Лобная кость'],
 'Parietal bone':['Os parietale','Parietal bone','Tepa suyagi','Теменная кость'],
 'Temporal bone':['Os temporale','Temporal bone','Chakka suyagi','Височная кость'],
 'Occipital bone':['Os occipitale','Occipital bone','Ensa suyagi','Затылочная кость'],
 'Sphenoid bone':['Os sphenoidale','Sphenoid bone','Ponasimon suyak','Клиновидная кость'],
 'Ethmoid':['Os ethmoidale','Ethmoid bone','G‘alvirsimon suyak','Решётчатая кость'],
 'Nasal bone':['Os nasale','Nasal bone','Burun suyagi','Носовая кость'],
 'Maxilla':['Maxilla','Maxilla','Yuqori jag‘ suyagi','Верхняя челюсть'],
 'Zygomatic bone':['Os zygomaticum','Zygomatic bone','Yonoq suyagi','Скуловая кость'],
 'Palatine bone':['Os palatinum','Palatine bone','Tanglay suyagi','Нёбная кость'],
 'Vomer':['Vomer','Vomer','Dimog‘ suyagi','Сошник'],
};
const notes = {
 'Frontal bone':{
  d:['An unpaired cranial bone forming the forehead.','Peshonani hosil qiluvchi toq kalla suyagi.','Непарная кость черепа, образующая лоб.'],
  l:['Anterior cranium, above the orbits.','Kallaning oldingi qismida, ko‘z kosalari ustida.','Передняя часть черепа, над глазницами.'],
  f:['Protects the anterior brain and contributes to the orbital roof.','Miyaning old qismini himoya qiladi va ko‘z kosasi tomini hosil qilishda qatnashadi.','Защищает передние отделы мозга и участвует в образовании крыши глазницы.'],
  features:[['Supraorbital margin','Glabella','Orbital surface'],['Ko‘z kosasining yuqori qirrasi','Glabella','Ko‘z kosasi yuzasi'],['Надглазничный край','Глабелла','Глазничная поверхность']],
  related:['Parietal bone','Sphenoid bone','Ethmoid'],
 },
 'Maxilla':{
  d:['A paired facial bone forming the upper jaw.','Yuqori jag‘ni hosil qiluvchi juft yuz suyagi.','Парная лицевая кость, образующая верхнюю челюсть.'],
  l:['Central face, below the orbit.','Yuzning markazida, ko‘z kosasi ostida.','Центральная часть лица, под глазницей.'],
  f:['Supports upper teeth and contributes to the hard palate and orbital floor.','Yuqori tishlarni tutadi, qattiq tanglay va ko‘z kosasi tubini hosil qilishda qatnashadi.','Удерживает верхние зубы и участвует в образовании твёрдого нёба и дна глазницы.'],
  features:[['Alveolar process','Palatine process','Infraorbital foramen'],['Alveolyar o‘siq','Tanglay o‘sig‘i','Ko‘z kosasi osti teshigi'],['Альвеолярный отросток','Нёбный отросток','Подглазничное отверстие']],
  related:['Zygomatic bone','Nasal bone','Palatine bone'],
 },
};
export function expandSkullIndex(index) {
 const result={...index};
 for(const parentId of ['skull','teeth']) {
  const parent=index[parentId];if(!parent)continue;
  parent.sourceParts.forEach((part,primitiveIndex)=>{
   const id='skull_'+part.id;
   result[id]={...parent,name:part.name,sourceParts:[part],sourceParent:parentId,primitiveIndex,skull:true};
  });
 }
 if(result.mandible)result.mandible={...result.mandible,skull:true};
 return result;
}
export function bindSkullPrimitives(gltf,index) {
 gltf.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const association=gltf.parser.associations.get(mesh);
  if(association?.meshes===undefined)return;
  const definition=gltf.parser.json.meshes[association.meshes];
  const parentId=definition.extras?.structureId;
  if(!['skull','teeth'].includes(parentId))return;
  const sources=index[parentId]?.sourceParts;
  // The builder writes primitives and sourceMeshIds in identical source order.
  // Refuse ambiguous or mismatched exports rather than inventing a mapping.
  if(!sources || sources.length!==definition.primitives.length || definition.extras.sourceMeshIds?.length!==sources.length)return;
  const primitive=association.primitives;
  const source=sources[primitive];
  if(!source || definition.extras.sourceMeshIds[primitive]!==source.id)return;
  mesh.userData.anatomyId='skull_'+source.id;
 });
}
const cache=new WeakMap();
export function skullRecord(entry) {
 if(!entry?.sourceParent)return null;
 if(cache.has(entry))return cache.get(entry);
 const source=entry.sourceParts[0];
 const side=/^(Left|Right) /.exec(source.name)?.[1];
 const base=source.name.replace(/^(Left|Right) /,'');
 const key=Object.keys(bones).find(k=>k.toLowerCase()===base.toLowerCase());
 const bone=bones[key];const note=notes[key];
 const tooth=/^(Left|Right) (upper|lower) (?:(first|second|central|lateral) )?secondary (molar|premolar|incisor|canine) tooth$/.exec(source.name);
 const languages=['en','uz','ru'];
 const info=Object.fromEntries(languages.map((lang,i)=>{
  let name=bone?.[i+1]||source.name;
  if(bone && side)name+=' · '+(side==='Left'?['Left','Chap','Слева']:['Right','O‘ng','Справа'])[i];
  if(tooth){
   const terms={molar:['Molar','Katta oziq tish','Моляр'],premolar:['Premolar','Kichik oziq tish','Премоляр'],incisor:['Incisor','Kesuvchi tish','Резец'],canine:['Canine','Qoziq tish','Клык']};
   const order={first:['First','Birinchi','Первый'],second:['Second','Ikkinchi','Второй'],central:['Central','Markaziy','Центральный'],lateral:['Lateral','Yon','Боковой']};
   name=[terms[tooth[4]][i],tooth[3]?order[tooth[3]][i]:null,(tooth[2]==='upper'?['Upper','Yuqori','Верхний']:['Lower','Pastki','Нижний'])[i],(side==='Left'?['Left','Chap','Слева']:['Right','O‘ng','Справа'])[i]].filter(Boolean).join(' · ');
  }
  return [lang,{n:name,d:note?.d[i],l:note?.l[i],f:note?.f[i],features:note?.features[i]}];
 }));
 const record={id:'skull_'+source.id,latinName:bone?.[0]||null,aliases:[source.name,base,bone?.[0]].filter(Boolean),system:'skeletal',region:'head',info,related:[],relatedNames:note?.related||[],reviewStatus:'needs-anatomist-review',referenceUrl:note?'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull':null};
 cache.set(entry,record);return record;
}
