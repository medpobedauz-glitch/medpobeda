// Extract real licensed abdominal meshes from a pinned BodyExplorer/Z-Anatomy asset.
// Usage: node scripts/import-abdominal-models.mjs /path/to/anatomy.glb
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const input=process.argv[2];if(!input)throw new Error('Supply the pinned source anatomy.glb');
const bytes=fs.readFileSync(input),jsonSize=bytes.readUInt32LE(12);
if(createHash('sha256').update(bytes).digest('hex')!=='6e84529b60b64cc8f8d5cef665fda932e359e828b66d0c2dd44ec1bd9d0bd01f')throw new Error('Input does not match pinned source SHA-256');
const src=JSON.parse(bytes.subarray(20,20+jsonSize)),bin=bytes.subarray(28+jsonSize);
const wanted=/^(left|right) (rectus abdominis|internal oblique|transversus abdominis|quadratus lumborum)$/;
const out={asset:{version:'2.0',generator:'MedPobeda licensed abdominal extract; CC BY-SA 4.0'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],bufferViews:[],accessors:[],materials:[{name:'muscle',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.55,.15,.17,1],metallicFactor:0,roughnessFactor:.55}}],buffers:[]};
const chunks=[];let length=0;const entries={};
function append(data,accessor){const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const vi=out.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length})-1;chunks.push(data);length+=data.length;return out.accessors.push({...accessor,bufferView:vi,byteOffset:0})-1;}
function readAccessor(id){const a=src.accessors[id],v=src.bufferViews[a.bufferView];if(a.sparse)throw new Error('Unexpected source layout');const size={5126:4,5125:4,5123:2}[a.componentType],components={VEC3:3,SCALAR:1}[a.type];if(!size||!components)throw new Error('Unsupported source attribute');const width=size*components,stride=v.byteStride||width,start=(v.byteOffset||0)+(a.byteOffset||0),data=Buffer.alloc(a.count*width);for(let i=0;i<a.count;i++)bin.copy(data,i*width,start+i*stride,start+i*stride+width);return [a,data];}
for(const node of src.nodes.filter(n=>wanted.test(n.name))){
 if(node.matrix||node.rotation||node.translation||node.scale)throw new Error('Unexpected source node transform');
 const id='za_'+node.name.replaceAll(' ','_');const primitives=[];let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of src.meshes[node.mesh].primitives){
  const [pa,positions]=readAccessor(p.attributes.POSITION),[na,normals]=readAccessor(p.attributes.NORMAL),[ia,indices]=readAccessor(p.indices);
  for(let i=0;i<pa.count;i++){
   const off=i*12,x=positions.readFloatLE(off),y=positions.readFloatLE(off+4),z=positions.readFloatLE(off+8);
   // Same mm/Z-up -> m/Y-up registration as the existing provider converter.
   const v=[x*.001,z*.001+.0781112,-y*.001-.1];v.forEach((value,k)=>{positions.writeFloatLE(value,off+k*4);min[k]=Math.min(min[k],value);max[k]=Math.max(max[k],value)});
   const nx=normals.readFloatLE(off),ny=normals.readFloatLE(off+4),nz=normals.readFloatLE(off+8);[nx,nz,-ny].forEach((v,k)=>normals.writeFloatLE(v,off+k*4));
  }
  primitives.push({attributes:{POSITION:append(positions,{componentType:5126,count:pa.count,type:'VEC3',min,max}),NORMAL:append(normals,{componentType:5126,count:na.count,type:'VEC3'})},indices:append(indices,{componentType:ia.componentType,count:ia.count,type:'SCALAR'}),material:0});
 }
 const name=node.name[0].toUpperCase()+node.name.slice(1);
 const mesh=out.meshes.push({name:id,primitives})-1;out.scenes[0].nodes.push(out.nodes.length);out.nodes.push({name:id,mesh,extras:{structureId:id,sourceId:'z-anatomy'}});
 entries[id]={name,system:'muscular',layer:'muscles',center:min.map((v,k)=>(v+max[k])/2),file:'abdominal.glb',sourceId:'z-anatomy',sourceParts:[{id:node.name,conceptId:'Z-Anatomy',name}],license:'CC BY-SA 4.0',sourceUrl:'https://github.com/JohanBellander/BodyExplorer/tree/7d04bf3c4de2bd9cb234dd51d7e6857c099afafd',anatomy:{region:'abdomen',side:node.name.split(' ')[0],layer:/rectus/.test(node.name)?'superficial':/internal oblique/.test(node.name)?'intermediate':'deep',aliases:/rectus/.test(node.name)?['abs','abdominals','rectus abdominis']:[]}};
}
if(Object.keys(entries).length!==8)throw new Error('Expected eight source meshes');
const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}out.buffers=[{byteLength:length}];
let j=Buffer.from(JSON.stringify(out));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);const b=Buffer.concat(chunks),result=Buffer.alloc(28+j.length+b.length);
result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(j.length,12);result.writeUInt32LE(0x4e4f534a,16);j.copy(result,20);result.writeUInt32LE(b.length,20+j.length);result.writeUInt32LE(0x004e4942,24+j.length);b.copy(result,28+j.length);
fs.writeFileSync('public/models/abdominal.glb',result);fs.writeFileSync('public/models/abdominal.glb.gz',gzipSync(result));
const index=JSON.parse(fs.readFileSync('public/models/structure-index.json'));Object.assign(index.structures,entries);fs.writeFileSync('public/models/structure-index.json',JSON.stringify(index,null,1)+'\n');
fs.writeFileSync('public/models/abdominal-provenance.json',JSON.stringify({sourceRevision:'7d04bf3c4de2bd9cb234dd51d7e6857c099afafd',sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceUrl:entries[Object.keys(entries)[0]].sourceUrl,license:'CC BY-SA 4.0',transform:'x*0.001, z*0.001+0.0781112, -y*0.001-0.1; normal x,z,-y',changes:'Selected eight existing meshes; transformed units/axes to the atlas; retained source topology and normals; replaced display materials.',structures:entries},null,2)+'\n');
console.log('Imported 8 real Z-Anatomy abdominal structures:',result.length,'bytes');
