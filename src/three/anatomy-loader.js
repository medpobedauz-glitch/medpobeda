// Fetch and validate actual GLB bytes before giving them to GLTFLoader.
// Hosts may serve raw gzip, automatically decompressed data, or an HTML fallback.
export async function fetchAnatomyGLB(file, {signal,onProgress=()=>{},fetcher=fetch}={}) {
 const base='/models/'+file;
 const urls=typeof DecompressionStream==='function'?[base+'.gz',base]:[base];
 const failures=[];
 for(const url of urls){
  try{
   const res=await fetcher(url,{signal});
   if(!res.ok)throw new Error('HTTP '+res.status);
   const total=Number(res.headers.get('content-length'));
   let blob;
   if(res.body?.getReader){
    const reader=res.body.getReader(),parts=[];let received=0;
    try{
     while(true){const {done,value}=await reader.read();if(done)break;parts.push(value);received+=value.length;onProgress(total?Math.min(99,Math.round(received/total*100)):null);}
    }finally{reader.releaseLock();}
    blob=new Blob(parts);
   }else blob=await res.blob();
   const header=new Uint8Array(await blob.slice(0,2).arrayBuffer());
   if(header[0]===31&&header[1]===139){
    if(typeof DecompressionStream!=='function')throw new Error('Gzip decompression unavailable');
    blob=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).blob();
   }
   const buffer=await blob.arrayBuffer();
   if(buffer.byteLength<12)throw new Error('Incomplete GLB response');
   const view=new DataView(buffer);
   if(view.getUint32(0,true)!==0x46546c67)throw new Error('Expected a GLB model; received '+(res.headers.get('content-type')||'non-GLB data'));
   if(view.getUint32(4,true)!==2)throw new Error('Unsupported GLB version');
   if(view.getUint32(8,true)!==buffer.byteLength)throw new Error('Truncated GLB download');
   return buffer;
  }catch(error){
   if(signal?.aborted||error.name==='AbortError')throw error;
   failures.push(url+': '+error.message);
   onProgress(0);
  }
 }
 throw new Error(failures.join('\n'));
}
