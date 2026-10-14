import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{student:{id:1,name:'Dissection test'}}}));
 await page.goto('http://127.0.0.1:3000/en/anatomy-3d?topic=muscles-all&debug=1');
 await page.waitForFunction(()=>{const v=document.querySelector('#anatomy-atlas')?.__viewer;return v?.loadedFiles.has('abdominal.glb')&&!v.camAnim;},null,{timeout:60000});
 const read=fn=>page.evaluate(fn);
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.snapshot().visibleCount),417);
 // Source normals encode smooth tissue shading across this triangulated topology.
 // Recomputing them introduced black facets; compare the live normals to the asset.
 assert(await read(async()=>{
   const v=document.querySelector('#anatomy-atlas').__viewer;
   for(const file of ['muscular.glb','abdominal.glb']){
     const buffer=await (await fetch('/models/'+file)).arrayBuffer(),view=new DataView(buffer),length=view.getUint32(12,true);
     const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length))),bin=28+length;
     for(const node of gltf.nodes){
       const id=node.extras?.structureId||node.name,entry=v.structureIndex[id];
       if(!entry||(!/external oblique/i.test(entry.name)&&entry.sourceId!=='z-anatomy'))continue;
       const a=gltf.accessors[gltf.meshes[node.mesh].primitives[0].attributes.NORMAL],bv=gltf.bufferViews[a.bufferView];
       const normals=v.structureMeshes.get(id)[0].geometry.attributes.normal;
       for(let i=0;i<a.count;i++){
         const bytes=a.componentType===5122?2:4,off=bin+(bv.byteOffset||0)+(a.byteOffset||0)+i*(bv.byteStride||3*bytes);
         const read=k=>bytes===2?Math.max(-1,view.getInt16(off+k*bytes,true)/32767):view.getFloat32(off+k*bytes,true);
         const x=read(0),y=read(1),z=read(2),l=Math.hypot(x,y,z)||1;
         if(Math.hypot(normals.getX(i)-x/l,normals.getY(i)-y/l,normals.getZ(i)-z/l)>1e-4)return false;
       }
     }
   }
   return true;
 }),'Preserve authored shading normals: no regenerated oblique facets');
 await read(()=>document.querySelector('#anatomy-atlas').__viewer.debugEl.hidden=true);
 await page.screenshot({path:'/tmp/muscles-default-fixed.png'});

 await page.locator('[data-action="revealAbs"]').click();
 await page.waitForFunction(()=>!document.querySelector('#anatomy-atlas').__viewer.camAnim);
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size),4);
 assert(await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return [...v.hiddenStructures].every(id=>/oblique/.test(v.muscles[id].name))&&v.structureMeshes.get('za_left_rectus_abdominis')[0].visible;}));
 await read(()=>document.querySelector('#anatomy-atlas').__viewer.debugEl.hidden=true);
 await page.screenshot({path:'/tmp/abs-dissection-desktop.png'});
 // A real pointer hit on projected rectus surface must resolve to an anatomical mesh.
 const point=await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer,m=v.structureMeshes.get('za_left_rectus_abdominis')[0],p=m.userData.center.clone().project(v.camera),r=v.renderer.domElement.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
 await page.mouse.click(point.x,point.y);
 await page.waitForFunction(()=>document.querySelector('#anatomy-atlas').__viewer.selectedId?.includes('rectus_abdominis'));
 assert(await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return v.highlighted.length>0&&v.highlighted.every(m=>m.material.color.getHex()===0x24bce0&&m.userData.origMat.color.getHex()!==0x24bce0);}),'Selected muscles must have a distinct cyan highlight');
 await page.mouse.move(20,200);
 await page.waitForFunction(()=>!document.querySelector('#anatomy-atlas').__viewer.camAnim);
 await page.screenshot({path:'/tmp/muscle-selection-highlight.png'});
 await page.locator('[data-action="info"]').click();
 await page.locator('#anat3d-info-content').getByText('Pubis: crest and symphysis.',{exact:true}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('#anatomy-atlas').__viewer.camAnim);
 const before=await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return {position:v.camera.position.toArray(),target:v.controls.target.toArray(),id:v.selectedId,originalColour:v.highlighted[0].userData.origMat.color.getHex()};});
 await page.locator('#anat3d-info [data-action="hide"]').click();
 await page.waitForTimeout(400);
 assert(await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return !v.muscleFilters.context&&v.hiddenStructures.size===5&&v.selectedId===null;}));
 const after=await read(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return {position:v.camera.position.toArray(),target:v.controls.target.toArray()};});
 assert.equal(await page.evaluate(id=>document.querySelector('#anatomy-atlas').__viewer.structureMeshes.get(id)[0].material.color.getHex(),before.id),before.originalColour,'Deselection restores the original tissue colour');
 assert.deepEqual(after.position,before.position,'Hide must preserve camera');assert.deepEqual(after.target,before.target);
 await page.locator('[data-action="undo"]').click();
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size),4);
 await page.locator('.atlas-dissection details summary').click();
 await page.locator('[data-restore-structure]').first().click();
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size),3);
 await page.locator('[data-action="undo"]').click();
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size),4);
 await page.locator('.atlas-dissection details summary').click();
 await page.locator('.anat3d-controls [data-action="restore"]').click();
 assert.equal(await read(()=>document.querySelector('#anatomy-atlas').__viewer.snapshot().visibleCount),417);
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-action="revealAbs"]').click();await page.waitForFunction(()=>!document.querySelector('#anatomy-atlas').__viewer.camAnim);
 await page.screenshot({path:'/tmp/abs-dissection-mobile.png'});
 assert(await read(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#anat3d-search').fill('rectus abdominis');await page.locator('#anat3d-search-results [data-locate]').first().click();
 await page.locator('[data-action="hideMuscle"]').click();
 assert(await read(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size===5));
 assert.deepEqual(errors,[]);console.log('PASS real abs, pointer selection, abdominal facts, hide with stable camera, undo, individual restore, restore all and mobile controls.');
}finally{await browser.close();}
