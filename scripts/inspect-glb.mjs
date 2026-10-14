// Inspect GLB files: extension usage, mesh-node names, scene bounds.
// Usage: node scripts/inspect-glb.mjs file1.glb [file2.glb ...] [--all]
import fs from 'fs';

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not GLB (magic mismatch)');
  let off = 12;
  let json = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
    off += 8 + len;
  }
  return json;
}

function posBounds(json, meshIdx) {
  const mesh = json.meshes && json.meshes[meshIdx];
  if (!mesh || !mesh.primitives) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.primitives) {
    const ai = p.attributes && p.attributes.POSITION;
    if (ai === undefined) continue;
    const acc = json.accessors[ai];
    if (acc.min && acc.max) for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], acc.min[i]);
      max[i] = Math.max(max[i], acc.max[i]);
    }
  }
  return min[0] === Infinity ? null : { min, max };
}

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const files = args.filter((a) => !a.startsWith('--'));
for (const file of files) {
  const json = parseGLB(file);
  const exts = json.extensionsUsed || [];
  const draco = exts.includes('KHR_draco_mesh_compression');
  const nodes = (json.nodes || []).filter((n) => n.mesh !== undefined);
  console.log('\n=== ' + file + ' ===');
  console.log('extensionsUsed: ' + (exts.join(', ') || 'none') + (draco ? ' [DRACO]' : ' [no draco]'));
  console.log('mesh nodes: ' + nodes.length + ' | meshes: ' + (json.meshes || []).length);
  const gmin = [Infinity, Infinity, Infinity];
  const gmax = [-Infinity, -Infinity, -Infinity];
  nodes.forEach((n) => {
    const b = posBounds(json, n.mesh);
    if (!b) return;
    for (let i = 0; i < 3; i++) {
      gmin[i] = Math.min(gmin[i], b.min[i]);
      gmax[i] = Math.max(gmax[i], b.max[i]);
    }
  });
  if (gmin[0] !== Infinity) {
    console.log('bounds min [' + gmin.map((v) => v.toFixed(2)).join(',') + '] max [' + gmax.map((v) => v.toFixed(2)).join(',') + ']');
  }
  const names = nodes.map((n) => n.name || (json.meshes[n.mesh] && json.meshes[n.mesh].name) || '(unnamed)');
  console.log('names (' + names.length + '):');
  console.log(showAll ? names.join('\n') : names.slice(0, 60).join(' | ') + (names.length > 60 ? ' ... +' + (names.length - 60) + ' more' : ''));
}
