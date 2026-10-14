// Shared atlas finish. Authored textures remain authoritative; this palette
// colors real source structures without inventing fibers or tendon boundaries.
const MUSCLE_TONES=[0xb96366,0xbc6b6c,0xb66266,0xbf6f6c,0xb96969];
export function finishAnatomyMaterial(material, entry, id='') {
 if(material.map)return material;
 if(entry.system==='muscular'){
  const connective=/iliotibial tract|\btendon\b|aponeurosis|\bfascia\b/i.test(entry.name||'');
  // Counterparts on the left/right receive the same tissue finish.
  const identity=(entry.name||id).toLowerCase().replace(/\b(left|right)\b/g,'').replace(/\s+/g,' ').trim();
  const seed=[...identity].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
  material.color.set(connective?0xe3d8c3:MUSCLE_TONES[seed%MUSCLE_TONES.length]);
  material.roughness=connective?.68:/external oblique/i.test(entry.name||'')?.66:.52;
  material.metalness=0;
  // Default dielectric reflectance; no plastic clearcoat or artificial emission.
  material.emissive?.set(0x000000);
  return material;
 }
 const palettes={arterial:[0xcb2034,.3],venous:[0x3574ce,.32],nervous:[0xe9d69a,.65],skeletal:[entry.sourceParent==='teeth'||id==='teeth'?0xf4ebd8:0xe4cfa5,.38]};
 const finish=palettes[entry.system];if(!finish)return material;
 material.color.set(finish[0]);material.roughness=finish[1];material.metalness=0;
 return material;
}
