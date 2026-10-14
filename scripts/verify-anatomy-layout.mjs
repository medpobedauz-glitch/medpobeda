import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3 } from 'three';
import { packAnatomy } from '../src/three/anatomy-layout.js';
const items=new Map();
for(const file of ['human-body','muscular','nervous','cardiovascular']){
 const bytes=fs.readFileSync(new URL('../public/models/'+file+'.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 scene.traverse(node=>{
  if(!node.userData.structureId || node.parent!==scene)return;
  const box=new Box3().setFromObject(node),size=box.getSize(box.min.clone());
  items.set(node.userData.structureId,{id:node.userData.structureId,width:size.x,height:size.y});
 });
}
assert(items.size>1500);
for(const aspect of [.4,1,2.2]){
 const slots=packAnatomy([...items.values()],aspect);assert.equal(slots.length,items.size);
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
  const a=slots[i],b=slots[j];
  assert(Math.abs(a.x-b.x)>(a.width+b.width)/2 || Math.abs(a.y-b.y)>(a.height+b.height)/2,`${a.id} overlaps ${b.id}`);
 }
 assert.deepEqual(slots,packAnatomy([...items.values()].reverse(),aspect));
 console.log('PASS',slots.length,'non-overlapping, deterministic layout slots at aspect',aspect);
}
assert.deepEqual(packAnatomy([]),[]);
