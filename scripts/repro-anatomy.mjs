// Node reproduction: load the real GLB and run the same logic as the browser's
// adaptRealScene + finalizeModel to surface the exact exception.
import fs from 'node:fs';
import * as THREE from 'three';

const buf = fs.readFileSync('/Users/ravijyran/Desktop/MedPobeda/public/models/human-body.glb');
// GLB: 12-byte header + chunks. Parse the JSON chunk to find mesh/node names,
// and the BIN chunk for geometry. We rebuild a minimal scene graph so the
// viewer's reparenting + label + layer logic runs against real data.
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const magic = dv.getUint32(0, true);
const version = dv.getUint32(4, true);
const totalLen = dv.getUint32(8, true);
if (magic !== 0x46546c67) throw new Error('not a GLB');
let off = 12;
let json = null;
let bin = null;
while (off < totalLen) {
  const clen = dv.getUint32(off, true);
  const ctype = dv.getUint32(off + 4, true);
  const cdata = buf.subarray(off + 8, off + 8 + clen);
  if (ctype === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(cdata));
  if (ctype === 0x004e4942) bin = cdata;
  off += 8 + clen;
}
console.log('GLB parsed: version', version, '| meshes', json.meshes.length, '| nodes', json.nodes.length, '| accessors', json.accessors.length);

// Build a scene graph mirroring the GLB node hierarchy, with real geometry.
const accessors = [];
for (const a of json.accessors) {
  if (a.bufferView === undefined) { accessors.push(null); continue; }
  const bv = json.bufferViews[a.bufferView];
  const arr = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  if (a.componentType === 5126) accessors.push(new Float32Array(arr.buffer, arr.byteOffset, a.count * (a.type === 'VEC3' ? 3 : a.type === 'VEC2' ? 2 : 4)));
  else if (a.componentType === 5125) accessors.push(new Uint32Array(arr.buffer, arr.byteOffset, a.count));
  else if (a.componentType === 5123) accessors.push(new Uint16Array(arr.buffer, arr.byteOffset, a.count));
  else accessors.push(null);
}
const scene = new THREE.Scene();
const nodeObjs = json.nodes.map((n) => {
  const o = n.mesh !== undefined ? new THREE.Mesh() : new THREE.Group();
  o.name = n.name || '';
  if (n.translation) o.position.fromArray(n.translation);
  if (n.rotation) o.quaternion.fromArray(n.rotation);
  if (n.scale) o.scale.fromArray(n.scale);
  return o;
});
json.nodes.forEach((n, i) => {
  const o = nodeObjs[i];
  if (n.children) n.children.forEach((c) => o.add(nodeObjs[c]));
  if (n.mesh !== undefined) {
    const m = json.meshes[n.mesh];
    const prim = m.primitives[0];
    const pos = accessors[prim.attributes.POSITION];
    const idx = accessors[prim.indices];
    const geo = new THREE.BufferGeometry();
    if (pos) geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (idx) geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    o.geometry = geo;
    o.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  }
});
if (json.scene !== undefined) {
  json.scenes[json.scene].nodes.forEach((n) => scene.add(nodeObjs[n]));
}

// Now run the viewer's adaptRealScene + finalizeModel logic verbatim.
function layerOf(id, index) { return (index && index[id] && index[id].layer) || (id === 'skin' ? 'skin' : 'organs'); }

const index = null; // simulate no structure-index.json for now
scene.updateMatrixWorld(true);
const meshes = [];
scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
console.log('meshes in scene:', meshes.length);
const group = new THREE.Group();
const layers = new Map();
const structureGroups = new Map();
try {
  for (const mesh of meshes) {
    const id = mesh.name || 'skin';
    const layer = layerOf(id, index);
    if (!layers.has(layer)) { const lg = new THREE.Group(); lg.name = 'layer_' + layer; layers.set(layer, lg); group.add(lg); }
    let sg = structureGroups.get(id);
    if (!sg) { sg = new THREE.Group(); sg.name = id; structureGroups.set(id, sg); layers.get(layer).add(sg); }
    sg.add(mesh);
    mesh.userData.structure = id;
    mesh.userData.layer = layer;
    mesh.userData.label = id;
    mesh.userData.system = null;
    mesh.frustumCulled = false;
  }
  console.log('adaptRealScene OK — layers:', [...layers.keys()].join(', '), '| structureGroups:', structureGroups.size);
} catch (err) {
  console.error('adaptRealScene THREW:', err.message);
}

// finalizeModel: traverse layers, collect structures, build labels (stubbed DOM).
const allMeshes = [];
const structureMeshes = new Map();
function collectStructure(m) {
  const sid = m.userData.structure;
  if (!sid) return;
  if (!structureMeshes.has(sid)) structureMeshes.set(sid, []);
  structureMeshes.get(sid).push(m);
}
try {
  layers.forEach((g, name) => {
    g.traverse((m) => { if (m.isMesh) { m.userData.layer = name; allMeshes.push(m); collectStructure(m); } });
  });
  console.log('finalizeModel traverse OK — allMeshes:', allMeshes.length, '| structureMeshes:', structureMeshes.size);
  // anchorFor uses getWorldPosition — needs world matrices updated after reparent.
  group.updateMatrixWorld(true);
  let anchorErr = null;
  try {
    const v = new THREE.Vector3();
    const m0 = allMeshes[0];
    m0.getWorldPosition(v);
    console.log('anchorFor sample OK:', v.toArray().map((n) => n.toFixed(2)).join(', '));
  } catch (err) { anchorErr = err; }
  if (anchorErr) console.error('anchorFor THREW:', anchorErr.message);
} catch (err) {
  console.error('finalizeModel THREW:', err.message);
}