import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { finishAnatomyMaterial } from './anatomy-materials.js';
// MedPobeda - Anatomy Dashboard 3D Preview Renderer
// Shared, lightweight Three.js renderer that produces small static-preview
// thumbnails from the same GLB models used by the main Anatomy 3D viewer.
// Only initialises scenes lazily (IntersectionObserver) and shares a single
// renderer instance across all cards. Renders offscreen and blits the result
// onto each card's 2D canvas, so card canvases never own a WebGL context.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { topicIds, sourceStructure } from '../data/anatomy-topic.js';

let sharedRenderer = null;
let dracoLoader = null;
const glbCache = new Map();       // file -> loaded GLB scene (shared, never mutated)
const indexPromise = new Map();   // file -> Promise<structure-index structures map>

const PREVIEW_SIZE = 512;

function getRenderer() {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    sharedRenderer.setPixelRatio(1); // fixed offscreen target; keep previews cheap
    sharedRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);
    sharedRenderer.setClearColor(0x000000, 0);
  }
  return sharedRenderer;
}

function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  }
  return dracoLoader;
}

async function loadGLB(file) {
  if (glbCache.has(file)) return glbCache.get(file);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  const pending = new Promise((resolve, reject) => {
    loader.load('/models/' + file, gltf => resolve(gltf.scene), undefined, reject);
  });
  glbCache.set(file, pending);
  const scene = await pending.catch(error=>{glbCache.delete(file);throw error;});
  return scene;
}

// Structure metadata for a GLB (same JSON the main viewer consumes). Mesh
// names inside the GLBs match structure ids in this index.
function loadStructureIndex(file) {
  file = 'all'; // One index request shared across model files.
  if (!indexPromise.has(file)) {
    indexPromise.set(file, fetch('/models/structure-index.json')
      .then((res) => res.json())
      .then((json) => json.structures || {}));
  }
  return indexPromise.get(file);
}


export { getRenderer, getDracoLoader, loadGLB, glbCache };

// Resolve the structure ids a card's thumbnail should show, using the same
// structure-index metadata (and region math) as the main viewer. Meshes in the
// GLBs expose their structure id via userData.structureId (GLTF "extras").
const structureIdsForCard = topicIds;

// Collect the GLB meshes belonging to a card's resolved structure ids
function collectPreviewMeshes(scene, card, index) {
  const ids = structureIdsForCard(card, index);
  if (!ids.size || !scene) return [];
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const sid = sourceStructure(obj);
    if (ids.has(sid)) meshes.push(obj);
  });
  return meshes;
}

// Clean 2D placeholder for coming-soon topics or failed previews — drawn
// directly on the card canvas so it never depends on WebGL availability.
function drawPlaceholder(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(148,163,184,0.16)');
  g.addColorStop(1, 'rgba(148,163,184,0.02)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Minimal isometric wire cube — a calm, medical "model pending" mark.
  const s = w * 0.22, cx = w / 2, cy = h / 2, dy = s * 0.5;
  const pts = {
    a: [cx - s, cy], b: [cx, cy - dy], c: [cx + s, cy],
    d: [cx, cy + dy], e: [cx - s, cy - s * 0.9], f: [cx, cy - s * 1.4],
    g2: [cx + s, cy - s * 0.9], hh: [cx, cy - s * 0.4],
  };
  const P = pts;
  ctx.strokeStyle = 'rgba(148,163,184,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  [[P.a, P.b], [P.b, P.c], [P.c, P.d], [P.d, P.a], // top face
   [P.e, P.f], [P.f, P.g2], [P.g2, P.hh], [P.hh, P.e], // bottom face
   [P.a, P.e], [P.b, P.f], [P.c, P.g2], [P.d, P.hh]] // edges
    .forEach(([p, q]) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); });
  ctx.stroke();
}


const active = new Map();
let animationFrame=0, lastFrame=0, paused=false;
export function pausePreviews(value){paused=value;}
function paint(record,time){
 const {scene,camera,canvas,distance,center}=record;
 const angle=record.angle+Math.min(100,Math.max(0,time-(record.lastTime??time)))*.00018;
 record.lastTime=time;
 // Real camera orbit around the model, not a spinning flat image.
 const a=(paused||matchMedia('(prefers-reduced-motion: reduce)').matches)?record.angle:angle;
 record.angle=a;
 camera.position.set(center.x+Math.sin(a)*distance,center.y+distance*.08,center.z+Math.cos(a)*distance);
 camera.lookAt(center);
 const renderer=getRenderer();renderer.toneMapping=record.muscular?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=record.muscular?1.08:1;renderer.render(scene,camera);
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderer.domElement,0,0,canvas.width,canvas.height);
 canvas.dataset.rendered='true';canvas.dataset.angle=String(a);
}
function tick(time){
 animationFrame=0;
 if(time-lastFrame>100&&!document.hidden){
  lastFrame=time;
  for(const [canvas,record] of active){
   if(!canvas.isConnected){stopPreview(canvas);continue;}
   const r=canvas.getBoundingClientRect();
   if(r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&!paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches)paint(record,time);
  }
 }
 if(active.size)animationFrame=requestAnimationFrame(tick);
}
export function stopPreview(canvas){const record=active.get(canvas);if(!record)return;record.scene.traverse(m=>{if(m.isMesh){m.material.dispose();if(m.userData.previewOwned)m.geometry.dispose();}});active.delete(canvas);if(!active.size&&animationFrame){cancelAnimationFrame(animationFrame);animationFrame=0;}}
export async function createPreview(card,canvas){
 if(active.has(canvas))return;
 const effective=card.previewReference?{...card.previewReference,status:'available'}:card;
 if(!effective.file||effective.status!=='available'){drawPlaceholder(canvas);return;}
 const [source,index]=await Promise.all([loadGLB(effective.file),loadStructureIndex()]);
 const meshes=collectPreviewMeshes(source,effective,index);
 if(effective.system==='muscular'){const abdomen=await loadGLB('abdominal.glb');meshes.push(...collectPreviewMeshes(abdomen,effective,index));}
 if(!meshes.length)throw Error('No mapped geometry');
 const scene=new THREE.Scene();
 const add=(m,context=false)=>{
  const id=sourceStructure(m),entry=index[id]||{};
  const material=finishAnatomyMaterial(m.material.clone(),entry,id);
  if(context){material.color.set(0xb6bec6);material.transparent=true;material.opacity=.14;material.depthWrite=false;}
  const clone=new THREE.Mesh(m.geometry,material);clone.matrix.copy(m.matrixWorld);clone.matrix.decompose(clone.position,clone.quaternion,clone.scale);scene.add(clone);
 };
 meshes.forEach(m=>add(m));
 // Existing head/neck musculature provides shape behind the highlighted vessels.
 if(['venous','arterial','nervous'].includes(effective.system)&&effective.region==='head'){
  const [context,skullContext]=await Promise.all([loadGLB('muscular.glb'),loadGLB('human-body.glb')]);
  collectPreviewMeshes(skullContext,{id:'context-skull',preset:'skull',status:'available'},index).forEach(m=>add(m,true));
  collectPreviewMeshes(context,{id:'context-head',system:'muscular',region:'head',status:'available'},index).forEach(m=>add(m,true));
 }
 // Batch preview-only draw calls; selectable viewer meshes are untouched.
 const batches=new Map();
 scene.children.filter(m=>m.isMesh).forEach(m=>{const key=[m.material.color.getHex(),m.material.opacity,m.material.roughness,Object.keys(m.geometry.attributes).sort().join(','),!!m.geometry.index].join(':');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);});
 for(const group of batches.values()){
  if(group.length<2)continue;
  const geometries=group.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
  const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  if(!merged)continue;
  const mesh=new THREE.Mesh(merged,group[0].material);mesh.userData.previewOwned=true;
  group.forEach((m,i)=>{scene.remove(m);if(i)m.material.dispose();});scene.add(mesh);
 }
 const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3());
 const radius=bounds.getSize(new THREE.Vector3()).length()/2;
 const distance=radius/Math.sin(THREE.MathUtils.degToRad(15))*1.12;
 const camera=new THREE.PerspectiveCamera(30,1,.001,500);
 scene.add(new THREE.HemisphereLight(0xffffff,0x282633,1.5));
 const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(center.x+2,center.y+3,center.z+4);key.target.position.copy(center);scene.add(key,key.target);
 const rim=new THREE.DirectionalLight(0xdbe8ff,1.1);rim.position.set(center.x-3,center.y+1,center.z-3);rim.target.position.copy(center);scene.add(rim,rim.target);
 const record={scene,camera,canvas,distance,center,angle:.22,muscular:effective.system==='muscular'};active.set(canvas,record);paint(record,performance.now());
 if(!animationFrame)animationFrame=requestAnimationFrame(tick);
}
export function disposePreviewRenderer(){for(const canvas of [...active.keys()])stopPreview(canvas);}
