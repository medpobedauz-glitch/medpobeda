import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANATOMY_CONTENT } from '../src/data/anatomy-content.js';
import { anatomyMessages } from '../src/data/anatomy-messages.js';
const dir=new URL('../public/models/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('structure-index.json',dir)));
const index=manifest.structures;
assert.match(manifest.sourceRevision,/^[a-f0-9]{40}$/);
const files=[...new Set(Object.values(index).map(e=>e.file))];
const seen=new Set();
for(const file of files){
 assert(file);
 const bytes=fs.readFileSync(new URL(file,dir));
 assert.deepEqual(zlib.gunzipSync(fs.readFileSync(new URL(file+'.gz',dir))),bytes);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let count=0;
 gltf.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let node=mesh;while(node&&!node.userData.structureId)node=node.parent;
  assert(node,'Every mesh has a stable structure ID');
  const id=node.userData.structureId;assert(index[id],id);seen.add(id);count++;
  assert(node.userData.sourceMeshIds.length);
  const positions=mesh.geometry.attributes.position;assert(positions.count>0);
  assert(Number.isFinite(positions.getX(0)));
  const normals=mesh.geometry.attributes.normal;assert(normals.normalized);assert(normals.array instanceof Int16Array);
 });
 console.log(file,count,'mesh primitives parsed');
}
for(const [id,entry] of Object.entries(index)){
 assert(seen.has(id),'Missing mesh: '+id);assert(entry.sourceParts.length);
 for(const source of entry.sourceParts){assert.match(source.id,/^FJ\d+[A-Z]*$/);assert.match(source.conceptId,/^FMA\d+$/);}
}
const required=['skull','mandible','clavicle','scapula','sternum','ribs','spine','humerus','radius','ulna','pelvis','femur','patella','tibia','fibula','brain','spinal_cord','heart','lungs','liver'];
for(const id of required){
 const c=ANATOMY_CONTENT.find(c=>c.id===id);assert(c,id);assert(c.latinName);assert(c.relatedLessonId&&c.relatedMcqTopicId);
 for(const lang of ['en','uz','ru'])for(const field of ['n','d','f','l'])assert(c.info[lang][field],id+'/'+lang+'/'+field);
 if(id!=='spinal_cord')assert(index[id]||index[id+'_left'],id);
}
assert(!index.spinal_cord,'Do not mislabel the central canal as the spinal cord');
assert.equal(index.central_canal.sourceParts[0].conceptId,'FMA78497');
for(const lang of ['uz','ru'])assert.deepEqual(Object.keys(anatomyMessages[lang]),Object.keys(anatomyMessages.en));
assert(ANATOMY_CONTENT.find(c=>c.id==='femur').info.uz.f.includes('bo‘g‘im'));
console.log('PASS:',seen.size,'mapped structures;',required.length,'required trilingual study entries; full spinal-cord mesh explicitly unavailable.');
