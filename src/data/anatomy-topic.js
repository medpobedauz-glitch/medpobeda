import { muscleRecord, muscleTopicRegions } from './muscular-atlas.js';
import { inRegion } from './anatomy-provider.js';
// One source of truth for previews and topic-only viewer visibility.
const boneGroups = {
 'bones-trunk': /^(spine|spine_discs|sternum|ribs|costal_cartilage)$/,
 'bones-upper-limb': /^(clavicle|scapula|humerus|radius|ulna|carpals|metacarpals|hand_phalanges)_/,
 'bones-lower-limb': /^(pelvis$|(femur|patella|tibia|fibula|tarsals|metatarsals|foot_phalanges)_)/,
};
export function topicIds(card, index) {
 if (!card || card.status !== 'available' || card.proxy) return new Set();
 return new Set(Object.entries(index).filter(([id,e])=>{
  if (!e.file) return false;
  if(card.system==='muscular'){const r=muscleRecord(id,e);return !!r && muscleTopicRegions(card).includes(r.region);}
  if(card.preset==='skull') return ['skull','mandible','teeth'].includes(id)||e.skull;
  if(card.modelId==='teeth') return id==='teeth'||e.sourceParent==='teeth';
  if(boneGroups[card.id]) return boneGroups[card.id].test(id);
  if(card.modelId){const base=card.modelId.replace(/_(left|right)$/,'');return id===base||id===base+'_left'||id===base+'_right';}
  if(e.system!==card.system)return false;
  if(card.id.startsWith('nervous-pns')&&!/nerve|ganglion/i.test(e.name))return false;
  if(card.id.includes('trunk'))return Math.abs(e.center[0])<.22 && e.center[1]>.68 && e.center[1]<1.43;
  if(card.region==='head')return e.center[1]>1.36&&Math.abs(e.center[0])<.2;
  return !card.region||inRegion(card.region,e.center);
 }).map(([id])=>id));
}
export function sourceStructure(mesh){let node=mesh;while(node&&!node.userData?.structureId)node=node.parent;return node?.userData.structureId||mesh.name;}
