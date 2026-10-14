import assert from 'node:assert/strict';
import fs from 'node:fs';
import {muscleCatalog,muscleCoverage,muscleMatches,defaultMuscleFilters} from '../src/data/muscular-atlas.js';
import {topicIds} from '../src/data/anatomy-topic.js';
import {getCard} from '../src/data/anatomy-dashboard.js';
const index=JSON.parse(fs.readFileSync('public/models/structure-index.json')).structures;
const records=muscleCatalog(index), coverage=muscleCoverage(index);
const buffer=fs.readFileSync('public/models/muscular.glb');
const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
const supplement=fs.readFileSync('public/models/abdominal.glb');
const ab=JSON.parse(supplement.subarray(20,20+supplement.readUInt32LE(12)));
const ids=new Set([...gltf.nodes,...ab.nodes].map(n=>n.extras?.structureId||n.name));
assert.equal(ab.meshes.length,8);
for(const n of ab.nodes)assert.equal(index[n.name].license,'CC BY-SA 4.0');
for(const r of Object.values(records)){
 assert(ids.has(r.modelId),`No real GLB node: ${r.id}`);
 assert(r.sourceParts.length,`No provenance: ${r.id}`);
 assert(!/papillary/.test(r.name));
 for(const key of ['latinName','compartment','side','layer','origin','insertion','action','innervation','bloodSupply','clinicalRelevance','aliases'])assert(key in r);
}
const all=topicIds(getCard('muscles-all'),index);assert.equal(all.size,Object.keys(records).length);
for(const [card,expected] of [['muscles-hand','hand'],['muscles-foot','foot'],['muscles-thorax','thorax'],['muscles-back','back']]){
 const region=topicIds(getCard(card),index);assert(region.size);for(const id of region)assert.equal(records[id].region,expected);
}
assert(coverage.find(r=>r.name==='masseter').modelIds.length===0);
assert(coverage.find(r=>r.name==='biceps brachii').modelIds.length===4);
const filters=defaultMuscleFilters();filters.side='left';
for(const r of Object.values(records)){if(r.side==='right')assert(!muscleMatches(r,filters));if(r.side==='left')assert(muscleMatches(r,filters));}
filters.side='both';filters.layers=['deep'];assert(Object.values(records).some(r=>muscleMatches(r,filters)));
assert(Object.values(records).filter(r=>muscleMatches(r,filters)).every(r=>r.layer==='deep'));
const report={sourceStructures:gltf.nodes.length+ab.nodes.length,supplementalStructures:ab.nodes.length,selectableMusculoskeletalStructures:all.size,triangles:[gltf,ab].reduce((sum,g)=>sum+g.meshes.reduce((n,m)=>n+m.primitives.reduce((a,p)=>a+g.accessors[p.indices].count/3,0),0),0),hasTextureCoordinates:gltf.meshes.some(m=>m.primitives.some(p=>p.attributes.TEXCOORD_0!==undefined)),hasTextures:!!gltf.textures?.length,regions:Object.values(records).reduce((a,r)=>(a[r.region]=(a[r.region]||0)+1,a),{}),unannotatedLayers:Object.values(records).filter(r=>r.layer==='unclassified').length,unknownSides:Object.values(records).filter(r=>r.side==='unknown').map(r=>({id:r.id,name:r.name})),missing:coverage.filter(r=>!r.modelIds.length),coverage};
fs.writeFileSync('docs/muscular-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${all.size} source-mapped structures, regional scopes, side/layer filters, explicit missing coverage; wrote docs/muscular-coverage.json`);
