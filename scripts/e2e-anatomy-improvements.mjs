import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000/en/anatomy-3d?debug=1');
 const settle=()=>page.waitForFunction(()=>{const v=document.querySelector('#anatomy-atlas')?.__viewer;return v?.allMeshes.length && !v.camAnim && !v.pendingFiles.size && Math.abs(v.explodeCurrent-v.explodeTarget)<.001;},null,{timeout:60000});await settle();
 await page.locator('[data-preset="skeletal"]').click();await settle();await page.locator('[data-action="explode"]').click();await settle();
 console.log('packed',await page.evaluate(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return {slots:v.explodeOffsets.size,camera:v.camera.position.toArray(),visible:v.snapshot().visibleCount};}));
 await page.locator('#anat3d-viewer').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/anatomy-improved-exploded.png'});
 await page.locator('#anat3d-search').fill('Femur');await page.locator('#anat3d-search-results [data-locate]').first().click();await settle();
 await page.locator('[data-action="isolate"]').click();await settle();
 assert.equal(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.snapshot().visibleCount),1);
 await page.locator('[data-action="restore"]').click();await settle();assert(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.snapshot().visibleCount>1));
 await page.locator('[data-action="hide"]').click();assert(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.has('femur_left')));
 await page.locator('[data-action="restore"]').click();await settle();assert(await page.evaluate(()=>!document.querySelector('#anatomy-atlas').__viewer.hiddenStructures.size));
 await page.locator('[data-action="explode"]').click();await settle();assert(await page.evaluate(()=>[...document.querySelector('#anatomy-atlas').__viewer.model.structureGroups.values()].every(g=>g.position.length()<.0001)));
 await page.locator('[data-action="viewBack"]').click();await settle();assert(await page.evaluate(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;return v.camera.position.z<v.controls.target.z;}));
 await page.locator('[data-action="viewFront"]').click();await settle();
 console.log('PASS explode/assemble, hide/restore, isolation context, front/back',errors);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto('http://127.0.0.1:3000/uz/anatomy-3d?debug=1');await mobile.waitForFunction(()=>!document.querySelector('#anat3d-search')?.disabled);
 await mobile.locator('#anat3d-search').fill('Femur');await mobile.locator('#anat3d-search-results [data-locate]').first().tap();await mobile.waitForTimeout(1500);
 const layout=await mobile.evaluate(()=>{const v=document.querySelector('#anatomy-atlas').__viewer,r=v.container.getBoundingClientRect(),sheet=document.querySelector('#anat3d-info').getBoundingClientRect();const p=v.anchorFor('femur_left').project(v.camera);return {centerY:r.y+(1-p.y)*r.height/2,sheetTop:sheet.top,viewerTop:r.top,viewerBottom:r.bottom};});
 console.log('mobile framing',layout);assert(layout.viewerBottom<=layout.sheetTop);assert(layout.centerY<layout.sheetTop);assert(layout.centerY>72);await mobile.screenshot({path:'/tmp/anatomy-improved-mobile.png'});console.log('PASS mobile selection remains above sheet',layout);assert.equal(errors.length,0);
}finally{await browser.close();}
