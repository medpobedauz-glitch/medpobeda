import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {fetchAnatomyGLB} from '../src/three/anatomy-loader.js';
const data=fs.readFileSync('public/models/nervous.glb');
const body=response=>async()=>response;
for(const payload of [data,gzipSync(data)])assert.deepEqual(Buffer.from(await fetchAnatomyGLB('test.glb',{fetcher:body(new Response(payload))})),data);
for(const failure of [()=>new Response('<!DOCTYPE html>',{headers:{'content-type':'text/html'}}),()=>new Response(null,{status:404}),()=>new Response(new Uint8Array([31,139,0,0])),()=>new Response(data.subarray(0,200)),()=>{throw new TypeError('Failed to fetch')}]){
 const requests=[];
 const loaded=await fetchAnatomyGLB('test.glb',{fetcher:async url=>{requests.push(url);return requests.length===1?failure():new Response(data)}});
 assert.deepEqual(Buffer.from(loaded),data);assert.deepEqual(requests,['/models/test.glb.gz','/models/test.glb']);
}
await assert.rejects(fetchAnatomyGLB('missing.glb',{fetcher:async()=>new Response(null,{status:404})}),e=>e.message.includes('/models/missing.glb.gz: HTTP 404')&&e.message.includes('/models/missing.glb: HTTP 404'));
let calls=0;const abort=new AbortController();abort.abort();
await assert.rejects(fetchAnatomyGLB('abort.glb',{signal:abort.signal,fetcher:async()=>{calls++;throw new DOMException('Aborted','AbortError')}}),{name:'AbortError'});assert.equal(calls,1);
console.log('PASS GLB/gzip decoding, HTML/404/corruption/truncation/network fallback, actionable errors and abort handling');
