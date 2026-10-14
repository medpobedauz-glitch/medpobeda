// MedPobeda - Anatomy 3D: procedural placeholder human model.
// Simplified full-body figure built from Three.js primitives so every feature works
// (systems, organ selection, search, labels, explode, learn/quiz) while no licensed
// GLB is present. Drop a real medical GLB into /models/human-body.glb and the viewer
// uses it instead — no code changes required.
import * as THREE from 'three';

const SKIN = new THREE.MeshStandardMaterial({ color: 0xe7c6a4, roughness: 0.9, transparent: true, opacity: 0.95 });
const MUSCLE = new THREE.MeshStandardMaterial({ color: 0xb0554a, roughness: 0.92 });
const BONE = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.7 });
const ORGAN_BRAIN = new THREE.MeshStandardMaterial({ color: 0xe3b0b8, roughness: 0.75 });
const ORGAN_TRA = new THREE.MeshStandardMaterial({ color: 0xecc6b8, roughness: 0.8 });
const ORGAN_LUNG = new THREE.MeshStandardMaterial({ color: 0xeba6a0, roughness: 0.8 });
const ORGAN_HEART = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.55 });
const ORGAN_LIVER = new THREE.MeshStandardMaterial({ color: 0x9c4a30, roughness: 0.75 });
const ORGAN_STOMACH = new THREE.MeshStandardMaterial({ color: 0xc77b5a, roughness: 0.75 });
const ORGAN_PANCREAS = new THREE.MeshStandardMaterial({ color: 0xe0b084, roughness: 0.75 });
const ORGAN_SPLEEN = new THREE.MeshStandardMaterial({ color: 0x9b5b57, roughness: 0.75 });
const ORGAN_KIDNEY = new THREE.MeshStandardMaterial({ color: 0xb04a44, roughness: 0.75 });
const ORGAN_INT_SMALL = new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.8 });
const ORGAN_INT_LARGE = new THREE.MeshStandardMaterial({ color: 0xa97a52, roughness: 0.8 });
const ORGAN_BLADDER = new THREE.MeshStandardMaterial({ color: 0xe8c175, roughness: 0.7 });
const ORGAN_THYROID = new THREE.MeshStandardMaterial({ color: 0xc96a62, roughness: 0.7 });
const VESSEL_RED = new THREE.MeshStandardMaterial({ color: 0xb03a3a, roughness: 0.5 });
const VESSEL_BLUE = new THREE.MeshStandardMaterial({ color: 0x3a6fb0, roughness: 0.5 });
const NERVE = new THREE.MeshStandardMaterial({ color: 0xe0b84a, roughness: 0.6 });

function standard(geo, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rotation) m.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
  if (opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  return m;
}

export function buildPlaceholderModel() {
  const root = new THREE.Group();
  root.name = 'placeholder-human';
  root.userData.placeholder = true;

  const layers = new Map();          // layerName -> THREE.Group
  const structureMeshes = new Map(); // structureId -> mesh[]
  const structureGroups = new Map(); // structureId -> THREE.Group (explode)

  const ensureLayer = (name) => {
    if (!layers.has(name)) {
      const g = new THREE.Group();
      g.name = 'layer:' + name;
      root.add(g);
      layers.set(name, g);
    }
    return layers.get(name);
  };

  const sg = (sid, geo, mat, x, y, z, opts = {}) => {
    const layerName = opts.layer || 'organs';
    if (!structureGroups.has(sid)) {
      const g = new THREE.Group();
      g.name = 'struct:' + sid;
      g.userData.structure = sid;
      g.userData.layer = layerName;
      ensureLayer(layerName).add(g);
      structureGroups.set(sid, g);
    }
    const m = standard(geo, mat, x, y, z, opts);
    structureGroups.get(sid).add(m);
    m.userData.layer = layerName;
    m.userData.structure = sid;
    if (!structureMeshes.has(sid)) structureMeshes.set(sid, []);
    structureMeshes.get(sid).push(m);
    return m;
  };

  const add = (geo, mat, x, y, z, opts = {}) => {
    const layerName = opts.layer || 'skin';
    const m = standard(geo, mat, x, y, z, opts);
    ensureLayer(layerName).add(m);
    m.userData.layer = layerName;
    if (opts.structure) {
      m.userData.structure = opts.structure;
      if (!structureMeshes.has(opts.structure)) structureMeshes.set(opts.structure, []);
      structureMeshes.get(opts.structure).push(m);
    }
    return m;
  };

  /* ===================== SKIN ===================== */
  add(new THREE.SphereGeometry(0.115, 28, 22), SKIN, 0, 1.56, 0, { scale: [1, 1.15, 1] });
  add(new THREE.SphereGeometry(0.024, 12, 10), SKIN, 0.108, 1.56, 0, { scale: [0.5, 1, 0.7] });
  add(new THREE.SphereGeometry(0.024, 12, 10), SKIN, -0.108, 1.56, 0, { scale: [0.5, 1, 0.7] });
  add(new THREE.CylinderGeometry(0.055, 0.06, 0.13, 16), SKIN, 0, 1.475, 0);
  add(new THREE.CapsuleGeometry(0.2, 0.4, 6, 20), SKIN, 0, 1.05, 0, { scale: [1.12, 1, 0.82] });
  add(new THREE.SphereGeometry(0.155, 20, 16), SKIN, 0, 0.87, 0, { scale: [1.25, 0.78, 1.05] });
  [1, -1].forEach((s) => {
    const arm = new THREE.Group();
    arm.position.set(0.27 * s, 1.36, 0);
    arm.rotation.z = 0.28 * s;
    arm.add(standard(new THREE.SphereGeometry(0.085, 16, 14), SKIN, 0, 0, 0));
    arm.add(standard(new THREE.CapsuleGeometry(0.055, 0.3, 4, 14), SKIN, 0, -0.19, 0));
    arm.add(standard(new THREE.SphereGeometry(0.05, 14, 12), SKIN, 0, -0.36, 0));
    arm.add(standard(new THREE.CapsuleGeometry(0.042, 0.26, 4, 14), SKIN, 0, -0.52, 0));
    arm.add(standard(new THREE.SphereGeometry(0.055, 14, 12), SKIN, 0, -0.68, 0));
    arm.traverse((c) => { if (c.isMesh) c.userData.layer = 'skin'; });
    ensureLayer('skin').add(arm);
  });
  add(new THREE.CapsuleGeometry(0.1, 0.36, 4, 16), SKIN, 0.13, 0.62, 0);
  add(new THREE.CapsuleGeometry(0.1, 0.36, 4, 16), SKIN, -0.13, 0.62, 0);
  add(new THREE.SphereGeometry(0.088, 14, 12), SKIN, 0.13, 0.41, 0);
  add(new THREE.SphereGeometry(0.088, 14, 12), SKIN, -0.13, 0.41, 0);
  add(new THREE.CapsuleGeometry(0.068, 0.32, 4, 14), SKIN, 0.14, 0.28, 0);
  add(new THREE.CapsuleGeometry(0.068, 0.32, 4, 14), SKIN, -0.14, 0.28, 0);
  add(new THREE.BoxGeometry(0.09, 0.06, 0.24), SKIN, 0.14, 0.05, 0.07);
  add(new THREE.BoxGeometry(0.09, 0.06, 0.24), SKIN, -0.14, 0.05, 0.07);
/* ===================== MUSCLES ===================== */
  add(new THREE.BoxGeometry(0.17, 0.12, 0.06), MUSCLE, 0.14, 1.28, 0.13, { layer: 'muscles' });
  add(new THREE.BoxGeometry(0.17, 0.12, 0.06), MUSCLE, -0.14, 1.28, 0.13, { layer: 'muscles' });
  add(new THREE.SphereGeometry(0.075, 14, 12), MUSCLE, 0.28, 1.36, 0, { layer: 'muscles' });
  add(new THREE.SphereGeometry(0.075, 14, 12), MUSCLE, -0.28, 1.36, 0, { layer: 'muscles' });
  add(new THREE.CapsuleGeometry(0.05, 0.3, 4, 12), MUSCLE, 0.30, 1.16, 0.05, { layer: 'muscles', rotation: [0, 0, -0.35] });
  add(new THREE.CapsuleGeometry(0.05, 0.3, 4, 12), MUSCLE, -0.30, 1.16, 0.05, { layer: 'muscles', rotation: [0, 0, 0.35] });
  add(new THREE.CapsuleGeometry(0.035, 0.24, 4, 12), MUSCLE, 0.33, 0.95, 0.05, { layer: 'muscles', rotation: [0, 0, -0.35] });
  add(new THREE.CapsuleGeometry(0.035, 0.24, 4, 12), MUSCLE, -0.33, 0.95, 0.05, { layer: 'muscles', rotation: [0, 0, 0.35] });
  add(new THREE.BoxGeometry(0.2, 0.16, 0.05), MUSCLE, 0, 1.05, 0.12, { layer: 'muscles' });
  [[0.06, 1.13], [-0.06, 1.13], [0.06, 1.04], [-0.06, 1.04], [0.06, 0.95], [-0.06, 0.95]].forEach(([x, y]) => {
    add(new THREE.BoxGeometry(0.055, 0.055, 0.03), MUSCLE, x, y, 0.14, { layer: 'muscles' });
  });
  add(new THREE.CapsuleGeometry(0.075, 0.36, 4, 14), MUSCLE, 0.13, 0.61, 0.02, { layer: 'muscles', rotation: [0.05, 0, 0] });
  add(new THREE.CapsuleGeometry(0.075, 0.36, 4, 14), MUSCLE, -0.13, 0.61, 0.02, { layer: 'muscles', rotation: [0.05, 0, 0] });
  add(new THREE.CapsuleGeometry(0.05, 0.3, 4, 12), MUSCLE, 0.14, 0.29, 0.02, { layer: 'muscles' });
  add(new THREE.CapsuleGeometry(0.05, 0.3, 4, 12), MUSCLE, -0.14, 0.29, 0.02, { layer: 'muscles' });

  /* ===================== BONES ===================== */
  sg('skull', new THREE.SphereGeometry(0.103, 20, 18), BONE, 0, 1.56, 0.01, { layer: 'bones', scale: [1, 1.12, 1] });
  for (let i = 0; i < 9; i++) {
    sg('spine', new THREE.SphereGeometry(0.028, 10, 8), BONE, 0, 1.02 + i * 0.052, -0.02, { layer: 'bones' });
  }
  for (let i = 0; i < 7; i++) {
    sg('ribs', new THREE.TorusGeometry(0.26 - i * 0.009, 0.016, 8, 20), BONE, 0, 1.36 - i * 0.045, -0.01, {
      layer: 'bones', rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.42],
    });
  }
  add(new THREE.CapsuleGeometry(0.018, 0.2, 4, 10), BONE, 0.14, 1.41, 0.05, { layer: 'bones', rotation: [0, 0, -0.12] });
  add(new THREE.CapsuleGeometry(0.018, 0.2, 4, 10), BONE, -0.14, 1.41, 0.05, { layer: 'bones', rotation: [0, 0, 0.12] });
  add(new THREE.SphereGeometry(0.05, 12, 10), BONE, 0.2, 1.26, -0.12, { layer: 'bones', scale: [0.9, 1.2, 0.4] });
  add(new THREE.SphereGeometry(0.05, 12, 10), BONE, -0.2, 1.26, -0.12, { layer: 'bones', scale: [0.9, 1.2, 0.4] });
  // Upper limb bones have structure ids so the skeletal system is fully clickable.
  sg('humerus_left', new THREE.CapsuleGeometry(0.03, 0.3, 4, 10), BONE, -0.285, 1.19, 0.02, { layer: 'bones', rotation: [0, 0, 0.35] });
  sg('humerus_right', new THREE.CapsuleGeometry(0.03, 0.3, 4, 10), BONE, 0.285, 1.19, 0.02, { layer: 'bones', rotation: [0, 0, -0.35] });
  sg('radius_left', new THREE.CapsuleGeometry(0.018, 0.24, 4, 10), BONE, -0.305, 0.98, 0, { layer: 'bones', rotation: [0, 0, 0.35] });
  sg('radius_right', new THREE.CapsuleGeometry(0.018, 0.24, 4, 10), BONE, 0.305, 0.98, 0, { layer: 'bones', rotation: [0, 0, -0.35] });
  sg('ulna_left', new THREE.CapsuleGeometry(0.018, 0.24, 4, 10), BONE, -0.31, 0.97, 0.035, { layer: 'bones', rotation: [0, 0, 0.35] });
  sg('ulna_right', new THREE.CapsuleGeometry(0.018, 0.24, 4, 10), BONE, 0.31, 0.97, 0.035, { layer: 'bones', rotation: [0, 0, -0.35] });
  sg('femur_left', new THREE.CapsuleGeometry(0.04, 0.42, 4, 12), BONE, -0.13, 0.62, 0.01, { layer: 'bones' });
  sg('femur_right', new THREE.CapsuleGeometry(0.04, 0.42, 4, 12), BONE, 0.13, 0.62, 0.01, { layer: 'bones' });
  sg('tibia_left', new THREE.CapsuleGeometry(0.028, 0.38, 4, 12), BONE, -0.13, 0.31, 0.01, { layer: 'bones' });
  sg('tibia_right', new THREE.CapsuleGeometry(0.028, 0.38, 4, 12), BONE, 0.13, 0.31, 0.01, { layer: 'bones' });
  // Pelvis completes the clickable skeletal set.
  sg('pelvis', new THREE.BoxGeometry(0.24, 0.15, 0.18), BONE, 0, 0.86, -0.02, { layer: 'bones' });
/* ===================== ORGANS ===================== */
  // Brain (inside the skull) + brain stem
  sg('brain', new THREE.SphereGeometry(0.062, 16, 14), ORGAN_BRAIN, 0.028, 1.575, 0.05, { scale: [1, 0.88, 1.1] });
  sg('brain', new THREE.SphereGeometry(0.062, 16, 14), ORGAN_BRAIN, -0.028, 1.575, 0.05, { scale: [1, 0.88, 1.1] });
  sg('brain', new THREE.CylinderGeometry(0.02, 0.022, 0.05, 10), ORGAN_BRAIN, 0, 1.5, 0.03);
  // Thyroid + trachea
  sg('thyroid', new THREE.SphereGeometry(0.02, 10, 8), ORGAN_THYROID, 0, 1.44, 0.075, { scale: [1.6, 0.7, 0.8] });
  sg('trachea', new THREE.CylinderGeometry(0.022, 0.022, 0.12, 12), ORGAN_TRA, 0, 1.38, 0.03);
  // Lungs
  sg('lungs', new THREE.SphereGeometry(0.11, 18, 16), ORGAN_LUNG, 0.12, 1.16, 0.07, { scale: [0.8, 1.15, 0.85] });
  sg('lungs', new THREE.SphereGeometry(0.11, 18, 16), ORGAN_LUNG, -0.12, 1.16, 0.07, { scale: [0.8, 1.15, 0.85] });
  // Heart (slightly left, apex down-left per real anatomy)
  sg('heart', new THREE.SphereGeometry(0.09, 18, 16), ORGAN_HEART, -0.07, 1.22, 0.1, { scale: [0.9, 1.05, 0.8] });
  sg('heart', new THREE.SphereGeometry(0.035, 12, 10), ORGAN_HEART, -0.05, 1.29, 0.14);
  sg('heart', new THREE.SphereGeometry(0.032, 12, 10), ORGAN_HEART, -0.09, 1.29, 0.12);
  // Liver (right upper quadrant)
  sg('liver', new THREE.SphereGeometry(0.095, 18, 14), ORGAN_LIVER, 0.14, 1.06, 0.1, { scale: [1.05, 0.72, 0.8] });
  // Stomach (left upper quadrant)
  sg('stomach', new THREE.SphereGeometry(0.085, 16, 14), ORGAN_STOMACH, -0.13, 1.02, 0.09, { scale: [0.8, 1.05, 0.8] });
  // Pancreas (retroperitoneal)
  sg('pancreas', new THREE.BoxGeometry(0.2, 0.045, 0.06), ORGAN_PANCREAS, -0.03, 1.06, 0.05, { rotation: [0, 0.1, 0] });
  // Spleen following the stomach
  sg('spleen', new THREE.SphereGeometry(0.055, 14, 12), ORGAN_SPLEEN, -0.23, 1.1, 0.05, { scale: [0.7, 1, 0.8] });
  // Kidneys
  sg('kidney_left', new THREE.SphereGeometry(0.045, 14, 12), ORGAN_KIDNEY, -0.13, 0.98, 0.16, { scale: [0.75, 1.2, 0.8] });
  sg('kidney_right', new THREE.SphereGeometry(0.045, 14, 12), ORGAN_KIDNEY, 0.13, 0.98, 0.16, { scale: [0.75, 1.2, 0.8] });
  // Small intestine coil
  sg('small_intestine', new THREE.TorusGeometry(0.11, 0.045, 8, 16), ORGAN_INT_SMALL, 0, 0.92, 0.1, { rotation: [Math.PI / 2, 0, 0] });
  // Large intestine frame around the coil
  sg('large_intestine', new THREE.BoxGeometry(0.28, 0.06, 0.05), ORGAN_INT_LARGE, 0, 0.98, 0.12);
  sg('large_intestine', new THREE.BoxGeometry(0.28, 0.06, 0.05), ORGAN_INT_LARGE, 0, 0.84, 0.12);
  sg('large_intestine', new THREE.BoxGeometry(0.06, 0.14, 0.05), ORGAN_INT_LARGE, -0.18, 0.91, 0.12);
  sg('large_intestine', new THREE.BoxGeometry(0.06, 0.14, 0.05), ORGAN_INT_LARGE, 0.18, 0.91, 0.12);
  // Urinary bladder
  sg('urinary_bladder', new THREE.SphereGeometry(0.06, 14, 12), ORGAN_BLADDER, 0, 0.72, 0.1, { scale: [1, 1.1, 0.9] });
/* ===================== VESSELS ===================== */
  const aortaPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 1.3, 0.1),
    new THREE.Vector3(0, 1.34, 0.02),
    new THREE.Vector3(0, 1.3, -0.04),
    new THREE.Vector3(0, 1.2, -0.06),
    new THREE.Vector3(0, 1.02, -0.08),
    new THREE.Vector3(0, 0.8, -0.1),
    new THREE.Vector3(0, 0.5, -0.04),
  ]);
  sg('aorta', new THREE.TubeGeometry(aortaPath, 16, 0.028, 8, false), VESSEL_RED, 0, 0, 0, { layer: 'vessels' });
  const cavaPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.09, 0.55, 0.02),
    new THREE.Vector3(0.07, 0.9, -0.06),
    new THREE.Vector3(0.05, 1.15, 0.02),
    new THREE.Vector3(0.08, 1.26, 0.1),
  ]);
  add(new THREE.TubeGeometry(cavaPath, 12, 0.024, 8, false), VESSEL_BLUE, 0, 0, 0, { layer: 'vessels' });
  add(new THREE.CapsuleGeometry(0.015, 0.1, 4, 10), VESSEL_RED, 0.05, 1.46, 0.04, { layer: 'vessels' });
  add(new THREE.CapsuleGeometry(0.015, 0.1, 4, 10), VESSEL_RED, -0.05, 1.46, 0.04, { layer: 'vessels' });
  add(new THREE.CapsuleGeometry(0.014, 0.07, 4, 10), VESSEL_RED, 0.07, 1.0, 0.14, { layer: 'vessels', rotation: [0, 0.3, 0.3] });
  add(new THREE.CapsuleGeometry(0.014, 0.07, 4, 10), VESSEL_RED, -0.07, 1.0, 0.14, { layer: 'vessels', rotation: [0, -0.3, -0.3] });
  // Coronary arc hugging the heart
  add(new THREE.TorusGeometry(0.09, 0.012, 8, 16), VESSEL_RED, -0.07, 1.22, 0.1, { layer: 'vessels', rotation: [Math.PI / 2, 0, 0], scale: [0.8, 1, 0.5] });

  /* ===================== NERVES ===================== */
  sg('spinal_cord', new THREE.CapsuleGeometry(0.02, 0.5, 4, 10), NERVE, 0, 1.2, -0.05, { layer: 'nerves' });
  for (let i = 0; i < 8; i++) {
    const y = 1.26 - i * 0.06;
    add(new THREE.CapsuleGeometry(0.008, 0.09, 4, 8), NERVE, 0.05, y, -0.03, { layer: 'nerves', rotation: [0, 0, 0.5] });
    add(new THREE.CapsuleGeometry(0.008, 0.09, 4, 8), NERVE, -0.05, y, -0.03, { layer: 'nerves', rotation: [0, 0, -0.5] });
  }

  /* ===================== FINALISE ===================== */
  layers.forEach((g) => { g.userData.layer = g.name.replace('layer:', ''); });
  return {
    group: root,
    layers,
    structureMeshes,
    structureGroups,
    isPlaceholder: true,
  };
}