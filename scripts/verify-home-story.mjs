// Exercise scene transitions and teardown without requiring a GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
let scene, renders=0, disposed=false, pending, scrollHandler, now=0;
function settle(){for(let i=0;i<160;i++){const fn=pending;pending=null;if(!fn)break;fn(now+=16.7);}}
class Renderer {
  setPixelRatio() {} setSize() {}
  render(value) { scene=value; renders++; }
  dispose() { disposed=true; }
}
globalThis.__storyThree={...THREE,WebGLRenderer:Renderer,TextureLoader:class {loadAsync(){return Promise.resolve(new THREE.Texture());}}};
globalThis.devicePixelRatio=1;
globalThis.requestAnimationFrame=fn=>{pending=fn;return 1;};
globalThis.cancelAnimationFrame=()=>{pending=null;};
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.ResizeObserver=class {observe(){} disconnect(){}};
globalThis.window={addEventListener(name,fn){if(name==='scroll')scrollHandler=fn;},removeEventListener(name){if(name==='scroll')scrollHandler=null;}};
const listeners={};
const canvas={addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name){delete listeners[name];}};
const captions=Array.from({length:4},()=>({hidden:false}));
const steps=Array.from({length:4},()=>({setAttribute(){}}));
const progress={style:{}};
let top=0;
const root={dataset:{},offsetHeight:3520,classList:{add(){},remove(){}},
 querySelector(s){return s==='canvas'?canvas:s.includes('stage')?{clientWidth:1280,clientHeight:800,offsetHeight:800}:progress;},
 querySelectorAll(s){return s.includes('chapter')?captions:steps;},
 getBoundingClientRect(){return {top};},addEventListener(){},removeEventListener(){}};
const source=fs.readFileSync(new URL('../src/three/home-story.js',import.meta.url),'utf8').replace("import * as THREE from 'three';",'const THREE=globalThis.__storyThree;');
const {mountHomeStory}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const cleanup=mountHomeStory(root);
await new Promise(resolve=>setTimeout(resolve,0));
for(let chapter=0;chapter<4;chapter++) {
 top=-chapter/3*(3520-800);scrollHandler();settle();
 assert.equal(root.dataset.chapter,String(chapter));
 assert.equal(captions.filter(c=>!c.hidden).length,1);
 scene.traverse(object=>{
  assert(object.position.toArray().every(Number.isFinite));
  assert(object.scale.toArray().every(Number.isFinite));
 });
 // Only one character stands in each settled chapter; introduction has none.
 const characters=scene.children.filter(o=>o.isGroup).slice(1);
 assert.equal(characters.filter(o=>o.visible).length,chapter===0?0:1);
 if(chapter>0){
  const wearer=characters.find(o=>o.visible),scope=scene.getObjectByName('neck-fitted-stethoscope');
  assert(wearer.userData.photographic,'all chapters use realistic portraits');
  assert(wearer.userData.ready,'portrait loaded');
  assert(wearer.children.some(o=>o.material?.map && o.material?.alphaMap),'portrait and background removal mask attached');
  assert.equal(scope.visible,false,'no second stethoscope over the portrait');
  assert.equal(wearer.rotation.y,0,'portrait remains front facing');
 }
}
// Sweep through the scroll range: exactly four consecutive caption states.
const transitions=[];
for(let p=0;p<=3;p+=.05){
 top=-p/3*(3520-800);scrollHandler();settle();
 if(transitions.at(-1)!==root.dataset.chapter)transitions.push(root.dataset.chapter);
 assert.equal(captions.filter(c=>!c.hidden).length,1);
}
assert.deepEqual(transitions,['0','1','2','3'],'no repeated student chapter');
top=0;scrollHandler();settle();assert.equal(root.dataset.chapter,'0');
cleanup();assert(disposed);assert.equal(scrollHandler,null);assert.equal(Object.keys(listeners).length,0);
assert(renders>=5);
console.log('Home story OK: four chapters, finite transforms, reverse scrolling, single-character stages and cleanup.');
