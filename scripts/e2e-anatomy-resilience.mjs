import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000/en/anatomy-3d?debug=1');await page.waitForFunction(()=>!document.querySelector('#anat3d-search').disabled);
 await page.locator('#anat3d-search').fill('Femur');await page.locator('#anat3d-search-results [data-locate]').first().click();await page.waitForFunction(()=>document.querySelector('#anatomy-atlas').__viewer.selectedId==='femur_left');
 await page.evaluate(()=>{window.testCanvas=document.querySelector('canvas');});
 await page.evaluate(async()=>{const{setLang}=await import('/src/i18n/index.js');setLang('uz');});
 assert.match(await page.locator('#anat3d-info-content').innerText(),/Son suyagi/);assert(await page.evaluate(()=>window.testCanvas===document.querySelector('canvas')));
 await page.locator('[data-action="help"]').click();await page.keyboard.press('Escape');assert(!await page.locator('dialog').isVisible());
 await page.route('**/models/muscular.glb*',r=>r.fulfill({status:503,body:'Temporarily unavailable'}));await page.locator('[data-system="muscular"]').check();await page.waitForFunction(()=>document.querySelector('#atlas-status').textContent.includes('yuklab'));
 assert(await page.locator('canvas').isVisible());await page.unroute('**/models/muscular.glb*');await page.locator('[data-system="muscular"]').uncheck();await page.locator('[data-system="muscular"]').check();await page.waitForFunction(()=>document.querySelector('#anatomy-atlas').__viewer.loadedFiles.has('muscular.glb'),null,{timeout:60000});
 await page.locator('#site-header a[href="/en/"]').first().click();await page.waitForURL('**/en/');assert.equal(await page.locator('#anat3d-viewer canvas').count(),0);
 await page.goto('http://127.0.0.1:3000/en/anatomy-3d?debug=1');await page.waitForFunction(()=>!document.querySelector('#anat3d-search').disabled);assert.equal(await page.locator('#anat3d-viewer canvas').count(),1);
 console.log('PASS immediate localization without canvas replacement, help keyboard close, failed model retry, navigation cleanup',errors);assert.equal(errors.length,0);
 const failed=await browser.newPage();await failed.route('**/models/human-body.glb*',r=>r.fulfill({status:404,body:'missing'}));await failed.goto('http://127.0.0.1:3000/ru/anatomy-3d');await failed.locator('#anat3d-error').waitFor({state:'visible'});assert.match(await failed.locator('#anat3d-error h3').innerText(),/загрузить/);console.log('PASS missing base model localized error');
 const noGL=await browser.newPage();await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});await noGL.goto('http://127.0.0.1:3000/uz/anatomy-3d');await noGL.locator('#anat3d-error').waitFor({state:'visible'});assert.match(await noGL.locator('#anat3d-error').innerText(),/WebGL/);console.log('PASS unsupported WebGL localized error');
}finally{await browser.close();}
