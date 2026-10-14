import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.ATLAS_ORIGIN||'http://localhost:4000';
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{student:{id:1,name:'Loading regression'}}}));
 const url=origin+'/uz/anatomy-3d?topic=muscles-all&system=muscular&layer=muscles&file=muscular.glb';
 const loaded=async()=>{
  await page.waitForFunction(()=>document.querySelector('#anat3d-loading')?.hidden && !document.querySelector('#anat3d-search')?.disabled && document.querySelector('#atlas-count')?.textContent.includes('417'),null,{timeout:60000});
  assert.equal(await page.locator('#anat3d-error').isVisible(),false);
 };
 const missing=await page.request.get(origin+'/models/absent-regression-model.glb');
 assert.equal(missing.status(),404);assert.match(missing.headers()['content-type'],/json/);
 await page.goto(url);await loaded();
 // Reproduce a host answering a missing compressed asset with SPA HTML and 200.
 const rawRequests=[];
 page.on('request',r=>{if(r.url().endsWith('.glb'))rawRequests.push(r.url())});
 await page.route('**/models/*.glb.gz',r=>r.fulfill({status:200,contentType:'text/html',body:'<!DOCTYPE html><html>SPA fallback</html>'}));
 await page.reload();await loaded();
 assert(rawRequests.some(u=>u.endsWith('/human-body.glb')));assert(rawRequests.some(u=>u.endsWith('/muscular.glb')));
 await page.unroute('**/models/*.glb.gz');
 // Fail both representations; show the actual cause and recover through Retry.
 await page.route('**/models/human-body.glb*',r=>r.fulfill({status:404,body:'Missing test asset'}));
 await page.reload();await page.locator('#anat3d-error').waitFor({state:'visible'});
 const details=await page.locator('.anat3d-error__diag pre').textContent();
 assert.match(details,/GLB: failed/);assert.match(details,/human-body\.glb.gz: HTTP 404/);assert.match(details,/human-body\.glb: HTTP 404/);
 await page.unroute('**/models/human-body.glb*');
 await page.locator('.anat3d-error__retry').click();await loaded();
 await page.screenshot({path:'/tmp/anatomy-loading-recovered.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS production port 4000: normal load, real model 404, HTML gzip fallback to raw GLBs, precise failure diagnostics, Retry recovery to 417 structures');
}finally{await browser.close();}
