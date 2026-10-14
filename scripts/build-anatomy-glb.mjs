// MedPobeda — anatomy model builder.
// Converts BodyParts3D 4.0 (© The Database Center for Life Science, CC BY 4.0)
// chunked geometry (as packaged by the open-source "human-atlas" project) into
// per-system glTF-Binary models for the Anatomy 3D viewer.
//
//   node scripts/build-anatomy-glb.mjs [--src /path/to/dir]
//
// Outputs into public/models/:
//   human-body.glb        base: skeleton + skin + organs + great vessels
//   muscular.glb          all 400+ muscles (lazy-loaded)
//   cardiovascular.glb    full arterial + venous trees (lazy-loaded)
//   nervous.glb           full CNS + PNS + sensory (lazy-loaded)
//   structure-index.json  id → {name, system, layer, center}
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OUT = path.join(ROOT, 'public', 'models');
const SOURCE_REVISION = '1c38bf35c254a891200d3cedecfd57abebe83d8d';
const SRC = process.argv.includes('--src')
  ? path.resolve(process.argv[process.argv.indexOf('--src') + 1])
  : '/tmp/anatomy_src';

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'atlas.json'), 'utf8'));

// ---------- download + decompress chunks ----------
const chunks = [];
for (let i = 0; i < manifest.chunks.length; i++) {
  const file = path.join(SRC, path.basename(manifest.chunks[i].url)) + '.gz';
  if (!fs.existsSync(file)) {
    const url = 'https://raw.githubusercontent.com/ashemag/human-atlas/' + SOURCE_REVISION + '/public' + manifest.chunks[i].url + '.gz';
    process.stdout.write('downloading ' + path.basename(file) + '\n');
    const res = await fetch(url);
    if (!res.ok) throw new Error('download failed: ' + url);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  chunks.push(zlib.gunzipSync(fs.readFileSync(file)));
}

// ---------- naming rules ----------
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const side = (name) => (/left/i.test(name) ? 'left' : (/right/i.test(name) ? 'right' : null));
const sideSuffix = (p) => { const s = side(p.name); return s ? '_' + s : ''; };

// Brain ventricles are mis-filed under "cardiac" in the source manifest.
const BRAIN_OVERRIDES = new Set(['Third ventricle', 'Fourth ventricle', 'Left lateral ventricle', 'Right lateral ventricle', 'Interventricular foramen']);

const BONE_RULES = [
  { re: /tooth|teeth/i, id: () => 'teeth', n: 'Teeth' },
  { re: /^atlas$/i, id: () => 'cervical_vertebra_1', n: 'Atlas (C1)' },
  { re: /^axis$/i, id: () => 'cervical_vertebra_2', n: 'Axis (C2)' },
  { re: new RegExp('^(' + Object.keys(ORD).join('|') + ') cervical vertebra$', 'i'), id: (m) => 'cervical_vertebra_' + ORD[m[1].toLowerCase()], n: 'Cervical vertebra' },
  { re: new RegExp('^(' + Object.keys(ORD).join('|') + ') thoracic vertebra$', 'i'), id: (m) => 'thoracic_vertebra_' + ORD[m[1].toLowerCase()], n: 'Thoracic vertebra' },
  { re: new RegExp('^(' + Object.keys(ORD).join('|') + ') lumbar vertebra$', 'i'), id: (m) => 'lumbar_vertebra_' + ORD[m[1].toLowerCase()], n: 'Lumbar vertebra' },
  { re: /^sacrum$/i, id: () => 'sacrum', n: 'Sacrum' },
  { re: /^coccyx$/i, id: () => 'coccyx', n: 'Coccyx' },
  { re: /hyoid/i, id: () => 'hyoid', n: 'Hyoid bone' },
  { re: new RegExp('^(left|right) (' + Object.keys(ORD).join('|') + ') rib$', 'i'), id: (m) => 'rib_' + m[1].toLowerCase() + '_' + ORD[m[2].toLowerCase()], n: 'Rib' },
  { re: /sternum|xiphoid|manubrium/i, id: () => 'sternum', n: 'Sternum' },
  { re: /clavicle/i, id: (m, p) => 'clavicle' + sideSuffix(p), n: 'Clavicle' },
  { re: /scapula/i, id: (m, p) => 'scapula' + sideSuffix(p), n: 'Scapula' },
  { re: /humerus/i, id: (m, p) => 'humerus' + sideSuffix(p), n: 'Humerus' },
  { re: /\bradius\b/i, id: (m, p) => 'radius' + sideSuffix(p), n: 'Radius' },
  { re: /\bulna\b/i, id: (m, p) => 'ulna' + sideSuffix(p), n: 'Ulna' },
  { re: /femur/i, id: (m, p) => 'femur' + sideSuffix(p), n: 'Femur' },
  { re: /patella/i, id: (m, p) => 'patella' + sideSuffix(p), n: 'Patella' },
  { re: /\btibia\b/i, id: (m, p) => 'tibia' + sideSuffix(p), n: 'Tibia' },
  { re: /\bfibula\b/i, id: (m, p) => 'fibula' + sideSuffix(p), n: 'Fibula' },
  { re: /hip bone/i, id: () => 'pelvis', n: 'Pelvis (hip bone)' },
  { re: /calcaneus|talus|navicular|cuboid|cuneiform/i, id: (m, p) => 'tarsals' + sideSuffix(p), n: 'Tarsal bones' },
  { re: /capitate|hamate|lunate|scaphoid|triquetral|pisiform|trapezium|trapezoid|multangular/i, id: (m, p) => 'carpals' + sideSuffix(p), n: 'Carpal bones' },
  { re: /metacarpal/i, id: (m, p) => 'metacarpals' + sideSuffix(p), n: 'Metacarpal bones' },
  { re: /metatarsal/i, id: (m, p) => 'metatarsals' + sideSuffix(p), n: 'Metatarsal bones' },
  { re: /phalanx|phalanges/i, id: (m, p) => (/\btoe\b/i.test(p.name) ? 'foot_phalanges' : 'hand_phalanges') + sideSuffix(p), n: 'Phalanges' },
  { re: /frontal|parietal|temporal bone|occipital|sphenoid|ethmoid|zygomatic|maxilla|mandible|nasal bone|lacrimal bone|vomer|nasal concha|palatine|malleus|incus|stapes/i, id: () => 'skull', n: 'Skull' },
];

// ---------- organ / vessel / nerve rules ----------
const ORGAN_RULES = [
  { sys: 'urinary', re: /left kidney/i, id: () => 'kidney_left', n: 'Left kidney' },
  { sys: 'urinary', re: /right kidney/i, id: () => 'kidney_right', n: 'Right kidney' },
  { sys: 'urinary', re: /ureter/i, id: (m, p) => 'ureter' + sideSuffix(p), n: 'Ureter' },
  { sys: 'urinary', re: /urethra/i, id: () => 'urethra', n: 'Urethra' },
  { sys: 'urinary', re: /urinary bladder/i, id: () => 'urinary_bladder', n: 'Urinary bladder' },
  { sys: 'digestive', re: /liver/i, id: () => 'liver', n: 'Liver' },
  { sys: 'digestive', re: /stomach|pylorus|gastric/i, id: () => 'stomach', n: 'Stomach' },
  { sys: 'digestive', re: /pancreas/i, id: () => 'pancreas', n: 'Pancreas' },
  { sys: 'digestive', re: /gallbladder/i, id: () => 'gallbladder', n: 'Gallbladder' },
  { sys: 'digestive', re: /esophag/i, id: () => 'esophagus', n: 'Esophagus' },
  { sys: 'digestive', re: /small intestine|duodenum|jejunum|ileum/i, id: () => 'small_intestine', n: 'Small intestine' },
  { sys: 'digestive', re: /large intestine|colon|cecum|appendix|rectum|anal|sigmoid/i, id: () => 'large_intestine', n: 'Large intestine' },
  { sys: 'digestive', re: /parotid|submandibular|sublingual|salivary/i, id: () => 'salivary_glands', n: 'Salivary glands' },
  { sys: 'respiratory', re: /^trachea$/i, id: () => 'trachea', n: 'Trachea' },
  { sys: 'respiratory', re: /larynx/i, id: () => 'larynx', n: 'Larynx' },
  { sys: 'respiratory', re: /./, id: () => 'lungs', n: 'Lungs (bronchial tree)' },
  { sys: 'lymphatic', re: /spleen/i, id: () => 'spleen', n: 'Spleen' },
  { sys: 'lymphatic', re: /thymus/i, id: () => 'thymus', n: 'Thymus' },
  { sys: 'endocrine', re: /pituitary/i, id: () => 'pituitary', n: 'Pituitary gland' },
  { sys: 'endocrine', re: /pineal/i, id: () => 'pineal', n: 'Pineal gland' },
  { sys: 'endocrine', re: /adrenal/i, id: (m, p) => 'adrenal' + sideSuffix(p), n: 'Adrenal gland' },
  { sys: 'reproductive', re: /testis/i, id: (m, p) => 'testis' + sideSuffix(p), n: 'Testis' },
  { sys: 'reproductive', re: /epididymis/i, id: (m, p) => 'epididymis' + sideSuffix(p), n: 'Epididymis' },
  { sys: 'reproductive', re: /deferent duct/i, id: (m, p) => 'vas_deferens' + sideSuffix(p), n: 'Vas deferens' },
  { sys: 'reproductive', re: /seminal vesicle/i, id: (m, p) => 'seminal_vesicle' + sideSuffix(p), n: 'Seminal vesicle' },
  { sys: 'reproductive', re: /prostate/i, id: () => 'prostate', n: 'Prostate' },
  { sys: 'reproductive', re: /cavernosum|spongiosum|glans|penis/i, id: () => 'penis', n: 'Penis' },
  { sys: 'cardiac', re: /./, id: () => 'heart', n: 'Heart' },
  { sys: 'muscular', re: /papillary muscle/i, id: () => 'heart', n: 'Heart (papillary muscle)' },
  { sys: 'sensory', re: /eyeball|choroid|cornea|iris|ciliary|vitreous|retina|sclera|lens|conjunctiva|lacrimal|tendinous ring/i, id: (m, p) => 'eye' + sideSuffix(p), n: 'Eyeball' },
];

const NERVOUS_BRAIN = /brain|forebrain|midbrain|hindbrain|cerebell|cerebr|medulla|pons|thalamus|hypothalam|caudate|putamen|pallidus|amygdala|hippocamp|fornix|ventricle|tectum|tegmentum|peduncle|olfactory|optic|corpus callosum|septum pellucidum|claustrum|gyrus|limbic|mammillary/i;
const VESSEL_MAJOR = /aorta|vena cava|pulmonary (artery|trunk|vein)/i;

// ---------- geometry decoding ----------
// Decode one manifest part into glTF-ready buffers. Positions/normals are
// already meters/Y-up; indices are Uint32. min/max come from the manifest
// bounds, so accessor bounds never require re-scanning vertices.
function mapPart(p, chunkBuf) {
  const positions = new Float32Array(chunkBuf.buffer, chunkBuf.byteOffset + p.positions, p.vertexCount * 3);
  const normals = new Int16Array(chunkBuf.buffer, chunkBuf.byteOffset + p.normals, p.vertexCount * 3);
  const indices = new Uint32Array(chunkBuf.buffer, chunkBuf.byteOffset + p.indices, p.indexCount);
  // Almost every anatomical part has well under 65k vertices — Uint16 indices
  // halve the index payload versus Uint32 with zero quality loss.
  let idx = Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength);
  let idxComponentType = 5125; // UNSIGNED_INT
  if (p.vertexCount <= 65535) {
    const u16 = new Uint16Array(indices.length);
    for (let i = 0; i < indices.length; i++) u16[i] = indices[i];
    idx = Buffer.from(u16.buffer);
    idxComponentType = 5123; // UNSIGNED_SHORT
  }
  return {
    pos: Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength),
    norm: Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength),
    idx, idxComponentType,
    min: p.bounds[0], max: p.bounds[1],
  };
}

// ---------- GLB assembly ----------
// One node + mesh + primitive per part. Two materials: index 0 = system color,
// index 1 = skin. Parts are grouped into one mesh per structure id.
function buildGLB(structures) {
  const binChunks = [];
  let binLen = 0;
  const pad4 = () => { const p = (4 - (binLen % 4)) % 4; if (p) { binChunks.push(Buffer.alloc(p)); binLen += p; } };
  const push = (buf) => { pad4(); const off = binLen; binChunks.push(buf); binLen += buf.length; return off; };

  const accessors = [];
  const acc = (componentType, count, type, minMax, normalized) => {
    accessors.push({ bufferView: acc.bv, componentType, count, type, ...(minMax ? { min: minMax[0], max: minMax[1] } : {}), ...(normalized ? { normalized: true } : {}) });
    return accessors.length - 1;
  };
  const bufferViews = [];
  const view = (buf, target) => {
    const off = push(buf);
    bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
    return bufferViews.length - 1;
  };

  const nodes = [];
  const meshes = [];
  const materials = [];
  const usedMaterials = new Map();
  const materialIndex = (mat) => {
    const key = JSON.stringify(mat);
    if (!usedMaterials.has(key)) { usedMaterials.set(key, materials.length); materials.push(mat); }
    return usedMaterials.get(key);
  };

  for (const st of structures) {
    const pris = [];
    for (const part of st.parts) {
      const g = mapPart(part, chunks[part.chunk]);
      const pv = view(g.pos, 34962); acc.bv = pv;
      const posAcc = acc(5126, part.vertexCount, 'VEC3', [g.min, g.max]);
      const nv = view(g.norm, 34962); acc.bv = nv;
      const normAcc = acc(5122, part.vertexCount, 'VEC3', null, true);
      const iv = view(g.idx, 34963); acc.bv = iv;
      const idxAcc = acc(g.idxComponentType || 5125, part.indexCount, 'SCALAR');
      pris.push({ attributes: { POSITION: posAcc, NORMAL: normAcc }, indices: idxAcc, material: st.layer === 'skin' ? materialIndex(SKIN_MAT) : materialIndex(st.mat) });
    }
    meshes.push({ primitives: pris, name: st.id, extras: { structureId: st.id, sourceId: 'bodyparts3d-4', sourceMeshIds: st.parts.map(p => p.id) } });
    nodes.push({ mesh: meshes.length - 1, name: st.id, extras: { structureId: st.id, sourceId: 'bodyparts3d-4', sourceMeshIds: st.parts.map(p => p.id) } });
  }

  if (!materials.length) materials.push(SKIN_MAT);
  const json = {
    asset: { version: '2.0', generator: 'MedPobeda anatomy builder (BodyParts3D 4.0, CC BY 4.0)' },
    buffers: [{ byteLength: binLen + (4 - binLen % 4) % 4 }],
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes, meshes, materials, accessors,
    bufferViews: bufferViews.map((bv) => ({ buffer: bv.buffer, byteOffset: bv.byteOffset, byteLength: bv.byteLength })),
  };
  const binPadding = (4 - (binLen % 4)) % 4;
  if (binPadding) { binChunks.push(Buffer.alloc(binPadding)); binLen += binPadding; }
  const bin = Buffer.concat(binChunks);
  let jsonStr = JSON.stringify(json);
  let jsonPad = (4 - (Buffer.byteLength(jsonStr) % 4)) % 4;
  if (jsonPad) jsonStr += ' '.repeat(jsonPad);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const glb = Buffer.alloc(total);
  glb.writeUInt32LE(0x46546C67, 0);           // magic 'glTF'
  glb.writeUInt32LE(2, 4);                    // version
  glb.writeUInt32LE(total, 8);                // length
  glb.writeUInt32LE(jsonBuf.length, 12);      // chunk 0 length
  glb.writeUInt32LE(0x4E4F534A, 16);          // chunk 0 type 'JSON'
  jsonBuf.copy(glb, 20);
  const binHead = 20 + jsonBuf.length;
  glb.writeUInt32LE(bin.length, binHead);     // chunk 1 length
  glb.writeUInt32LE(0x004E4942, binHead + 4); // chunk 1 type 'BIN'
  bin.copy(glb, binHead + 8);
  return glb;
}

const SKIN_MAT = {
  name: 'skin', doubleSided: true,
  pbrMetallicRoughness: { baseColorFactor: [0.937, 0.796, 0.694, 1], metallicFactor: 0, roughnessFactor: 0.85 },
};

// ---------- classification ----------
const SYS_COLORS = {
  skeletal: [0.929, 0.898, 0.831], muscular: [0.784, 0.286, 0.259], nervous: [0.980, 0.749, 0.345],
  cardiac: [0.859, 0.208, 0.208], arterial: [0.796, 0.196, 0.216], venous: [0.290, 0.365, 0.816],
  respiratory: [0.529, 0.741, 0.902], digestive: [0.612, 0.553, 0.443], urinary: [0.565, 0.776, 0.502],
  reproductive: [0.804, 0.522, 0.655], endocrine: [0.557, 0.427, 0.722], lymphatic: [0.478, 0.729, 0.624],
  sensory: [0.918, 0.678, 0.396],
};
const mat = (sys) => ({
  name: sys, doubleSided: true,
  pbrMetallicRoughness: { baseColorFactor: [...(SYS_COLORS[sys] || [0.72, 0.72, 0.72]), 1], metallicFactor: 0.05, roughnessFactor: 0.72 },
});

function classify(p) {
  const name = p.name;
  if (/^mandible$/i.test(name)) return { system: 'skeletal', layer: 'bones', id: 'mandible', label: 'Mandible' };
  if (p.system === 'skeletal' && /vertebra|^atlas$|^axis$|^sacrum$|^coccyx$/i.test(name) && !/disk/.test(name)) return { system: 'skeletal', layer: 'bones', id: 'spine', label: 'Vertebral column' };
  if (p.system === 'skeletal' && /^(left|right) .* rib$/i.test(name)) return { system: 'skeletal', layer: 'bones', id: 'ribs', label: 'Ribs' };
  if (p.system === 'skeletal') {
    // Source data quirks: a few leg "muscles" are tagged skeletal.
    if (/fibularis|iliotibial|tibialis/i.test(name)) return { system: 'muscular', layer: 'muscles', id: 'bp3d_' + p.id, label: name };
    // Skeletal-tagged connective tissue: gums, spinal discs, cartilage.
    if (/gingiva/i.test(name)) return { system: 'digestive', layer: 'organs', id: 'gingiva', label: 'Gingiva (gums)' };
    if (/intervertebral disk/i.test(name)) return { system: 'skeletal', layer: 'bones', id: 'spine_discs', label: 'Intervertebral discs' };
    if (/cartilage/i.test(name)) return { system: 'skeletal', layer: 'bones', id: 'costal_cartilage', label: 'Cartilage (costal & laryngeal)' };
    for (const r of BONE_RULES) {
      const m = name.match(r.re);
      if (m) return { system: 'skeletal', layer: 'bones', id: r.id(m, p), label: r.n };
    }
    return { system: 'skeletal', layer: 'bones', id: 'bones_other', label: 'Other bones' };
  }
  if (p.system === 'connective') {
    return { system: 'skeletal', layer: 'bones', id: 'ligaments', label: 'Ligaments & tendons' };
  }
  if (p.system === 'integumentary') return { system: 'skin', layer: 'skin', id: 'skin', label: 'Skin' };
  if (BRAIN_OVERRIDES.has(name)) return { system: 'nervous', layer: 'nerves', id: 'brain', label: 'Brain (ventricles)' };
  if (p.system === 'nervous') {
    if (NERVOUS_BRAIN.test(name)) return { system: 'nervous', layer: 'nerves', id: 'brain', label: 'Brain' };
    if (/spinal cord/i.test(name)) return { system: 'nervous', layer: 'nerves', id: 'central_canal', label: 'Central canal of spinal cord' };
    if (/optic nerve/i.test(name)) return { system: 'nervous', layer: 'nerves', id: 'optic_nerve' + sideSuffix(p), label: 'Optic nerve' };
    return { system: 'nervous', layer: 'nerves', id: 'bp3d_' + p.id, label: name };
  }
  if (p.system === 'arterial' || p.system === 'venous') {
    if (/^(ascending aorta|descending aorta|arch of aorta|descending thoracic aorta|abdominal aorta)$/i.test(name)) return { system: p.system, layer: 'vessels', id: 'aorta', label: 'Aorta' };
    if (/vena cava/i.test(name)) return { system: p.system, layer: 'vessels', id: 'vena_cava', label: 'Venae cavae' };
    return { system: p.system, layer: 'vessels', id: 'bp3d_' + p.id, label: name };
  }
  if (p.system === 'cardiac' || p.system === 'lymphatic') {
    for (const r of ORGAN_RULES) if (r.sys === p.system && r.re.test(name)) return { system: p.system, layer: 'organs', id: r.id(null, p), label: r.n };
    if (p.system === 'cardiac') return { system: 'cardiac', layer: 'organs', id: 'heart', label: 'Heart' };
  }
  if (p.system === 'muscular') {
    if (/diaphragm/i.test(name)) return { system: 'muscular', layer: 'muscles', id: 'diaphragm', label: 'Diaphragm' };
    return { system: 'muscular', layer: 'muscles', id: 'bp3d_' + p.id, label: name };
  }
  if (p.system === 'respiratory' || p.system === 'digestive' || p.system === 'urinary' || p.system === 'endocrine' || p.system === 'reproductive' || p.system === 'sensory') {
    for (const r of ORGAN_RULES) if (r.sys === p.system && r.re.test(name)) return { system: p.system, layer: 'organs', id: r.id(null, p), label: r.n };
    return { system: p.system, layer: 'organs', id: 'organs_other_' + p.system, label: 'Other ' + p.system + ' structures' };
  }
  return { system: 'skin', layer: 'skin', id: 'skin', label: 'Skin' };
}

// ---------- build files ----------
const byId = new Map();
for (const p of manifest.parts) {
  const c = classify(p);
  let st = byId.get(c.id);
  if (!st) { st = { id: c.id, label: c.label, system: c.system, layer: c.layer, mat: mat(c.system), parts: [], center: [0, 0, 0], tris: 0 }; byId.set(c.id, st); }
  st.parts.push(p);
  st.tris += p.indexCount / 3;
  const w = p.vertexCount;
  for (let a = 0; a < 3; a++) st.center[a] += ((p.bounds[0][a] + p.bounds[1][a]) / 2) * w;
}
const structures = [...byId.values()].map((st) => {
  const w = st.parts.reduce((n, p) => n + p.vertexCount, 0);
  st.center = st.center.map((v) => +(v / Math.max(1, w)).toFixed(4));
  return st;
});
const get = (id) => structures.find((s) => s.id === id);

const base = structures
  .filter((s) => s.layer === 'bones' || s.layer === 'organs' || s.id === 'skin' || s.id === 'aorta' || s.id === 'vena_cava')
  .sort((a, b) => a.layer.localeCompare(b.layer));
const sysFile = (filter) => structures.filter(filter).sort((a, b) => a.layer.localeCompare(b.layer));

fs.mkdirSync(OUT, { recursive: true });
const files = [
  ['human-body.glb', base],
  ['muscular.glb', sysFile((s) => s.system === 'muscular' && s.layer === 'muscles')],
  ['cardiovascular.glb', sysFile((s) => s.system === 'arterial' || s.system === 'venous')],
  ['nervous.glb', sysFile((s) => s.system === 'nervous')],
];
let totalBytes = 0;
for (const [file, list] of files) {
  if (!list.length) { console.warn('skip (empty): ' + file); continue; }
  const glb = buildGLB(list);
  fs.writeFileSync(path.join(OUT, file), glb);
  fs.writeFileSync(path.join(OUT, file + '.gz'), zlib.gzipSync(glb, { level: 9 }));
  totalBytes += glb.length;
  console.log(file.padEnd(20) + (glb.length / 1048576).toFixed(1) + ' MB  ' + list.length + ' structures  ' + list.reduce((n, s) => n + s.tris, 0).toFixed(0) + ' tris');
}
const fileOf = (id) => (files.find(([, list]) => list.some((s) => s.id === id)) || [null])[0];
const index = {};
for (const st of structures) index[st.id] = { name: st.label, system: st.system, layer: st.layer, center: st.center, file: fileOf(st.id), sourceId: 'bodyparts3d-4', sourceParts: st.parts.map(p => ({ id: p.id, conceptId: p.conceptId, name: p.name })) };
fs.writeFileSync(path.join(OUT, 'structure-index.json'), JSON.stringify({ format: 'BodyParts3D 4.0 (CC BY 4.0)', sourceRevision: SOURCE_REVISION, structures: index }, null, 1));
console.log('structure-index.json: ' + Object.keys(index).length + ' ids; total ' + (totalBytes / 1048576).toFixed(1) + ' MB');
console.log('bones_other parts: ' + (byId.get('bones_other') ? byId.get('bones_other').parts.map((p) => p.name).join(' | ') : 'none'));





