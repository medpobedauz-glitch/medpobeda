// Run against the existing Vite server. Playwright remains an optional test dependency.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const snap=()=>page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.snapshot());
const wait=()=>page.waitForFunction(()=>{const v=document.querySelector('#anatomy-atlas')?.__viewer;return v?.allMeshes.length>0 && v.pendingFiles.size===0 && !v.camAnim;},null,{timeout:60000});
const select=async q=>{await page.locator('#anat3d-search').fill(q);await page.locator('#anat3d-search-results [data-locate]').first().click();await wait();};
console.log('start');await page.goto('http://127.0.0.1:3000/en/anatomy-3d?debug=1');await wait();
await page.locator('[data-preset="skeletal"]').click();await wait();assert.deepEqual((await snap()).systems,['skeletal']);
await select('Son suyagi');assert.equal((await snap()).selectedId,'femur_left');assert.match(await page.locator('#anat3d-info-content').innerText(),/Femur/);
await page.locator('[data-action="save"]').click();assert(await page.locator('[data-action="saved"]').isVisible());
await page.locator('[data-action="isolate"]').click();await wait();assert.equal((await snap()).isolatedId,'femur_left');
assert.deepEqual(await page.evaluate(()=>[...new Set(document.querySelector('#anatomy-atlas').__viewer.allMeshes.filter(m=>m.visible).map(m=>m.userData.structure))]),['femur_left']);
await page.locator('[data-action="lesson"]').click();assert(await page.locator('dialog').isVisible());await page.locator('dialog [data-action="mcq"]').click();await page.locator('[data-answer="femur"]').click();assert.match(await page.locator('dialog').innerText(),/Correct/);await page.locator('[data-action="closeDialog"]').click();
await page.locator('[data-action="reset"]').click();await wait();
await page.locator('[data-system="muscular"]').check();await wait();assert((await snap()).systems.includes('muscular'));
await page.locator('[data-opacity="muscular"]').evaluate(el=>{el.value=35;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await snap()).opacities.muscular,.35);
await page.locator('[data-preset="nervous"]').click();await wait();assert.deepEqual((await snap()).systems,['nervous']);assert(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.structureMeshes.has('brain')));
console.log('basic flows passed');await page.locator('[data-preset="vessels"]').click();await wait();assert.deepEqual((await snap()).systems,['arterial','venous']);
await page.locator('[data-system="arterial"]').uncheck();assert(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.allMeshes.filter(m=>m.visible).every(m=>m.userData.system==='venous')));
await page.locator('[data-action="explode"]').click();await page.waitForFunction(()=>[...document.querySelector('#anatomy-atlas').__viewer.model.structureGroups.values()].some(g=>g.position.length()>.1),null,{timeout:20000});
await page.locator('[data-action="reset"]').click();await wait();
await select('Mandibula');assert.equal((await snap()).selectedId,'mandible');
await page.locator('[data-action="reset"]').click();await wait();await page.locator('[data-preset="skeletal"]').click();await wait();
console.log('systems passed');
// Actual canvas click at a projected bone centre exercises pointer handling and raycasting.
await page.locator('#anat3d-viewer').scrollIntoViewIfNeeded();
const point=await page.evaluate(()=>{const v=document.querySelector('#anatomy-atlas').__viewer;const p=v.anchorFor('femur_left').project(v.camera);const r=v.renderer.domElement.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
await page.mouse.click(point.x,point.y);assert.equal((await snap()).selectedId,'femur_left');
// Dragging must change orbit without selecting a different structure.
const before=await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.camera.position.toArray());
await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+85,point.y+10,{steps:10});await page.mouse.up();await page.waitForTimeout(400);
assert.notDeepEqual(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.camera.position.toArray()),before);assert.equal((await snap()).selectedId,'femur_left');
await page.locator('[data-action="zoomIn"]').click();
await page.locator('[data-action="pan"]').click();
await page.locator('#anat3d-viewer').scrollIntoViewIfNeeded();const panBox=await page.locator('#anat3d-viewer').boundingBox();const panPoint={x:panBox.x+panBox.width/2,y:panBox.y+panBox.height/2};
const target=await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.controls.target.toArray());await page.mouse.move(panPoint.x,panPoint.y);await page.mouse.down();await page.mouse.move(panPoint.x+40,panPoint.y,{steps:8});await page.mouse.up();await page.waitForTimeout(250);assert.notDeepEqual(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.controls.target.toArray()),target);
await page.locator('[data-action="fullscreen"]').click();assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('[data-action="fullscreen"]').click();
// Existing header switcher reloads the same localized route; selection is restored.
await page.locator('#site-header .lang-selector__btn').click();await page.locator('#site-header [data-lang="uz"]').click();await page.waitForURL('**/uz/anatomy-3d?debug=1');await wait();
await page.waitForFunction(()=>document.querySelector('#anat3d-info-content').textContent.includes('Son suyagi'));
assert.match(await page.locator('#anat3d-info-content').innerText(),/bo‘g‘im/);
await select('Бедренная');assert.equal((await snap()).selectedId,'femur_left');
await page.locator('#site-header .lang-selector__btn').click();await page.locator('#site-header [data-lang="ru"]').click();await page.waitForURL('**/ru/anatomy-3d?debug=1');await wait();await page.waitForFunction(()=>document.querySelector('#anat3d-info-content').textContent.includes('Бедренная'));
await page.screenshot({path:'/tmp/medpobeda-desktop-selected.png',fullPage:true});
await page.locator('[data-action="showAll"]').click();await wait();assert((await snap()).systems.includes('skin'));
for(const region of ['head','upper','lower','thorax','abdomen','pelvis']){await page.locator('[data-preset="'+region+'"]').click();await wait();assert.equal((await snap()).region,region);assert(await page.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.allMeshes.some(m=>m.visible)));}
await select('Medulla spinalis');assert.match(await page.locator('#anat3d-info-content').innerText(),/недоступна/);assert(await page.locator('[data-action="isolate"]').isDisabled());
console.log('DESKTOP PASSED',await snap(),'pageErrors',errors);assert.equal(errors.length,0);
await context.close();
const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.goto('http://127.0.0.1:3000/uz/anatomy-3d?debug=1');await mp.waitForFunction(()=>document.querySelector('#anatomy-atlas')?.__viewer?.allMeshes.length>0,null,{timeout:60000});
assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
await mp.locator('.atlas-sidebar > summary').tap();await mp.locator('[data-preset="skeletal"]').tap();
await mp.locator('#anat3d-search').fill('Femur');await mp.locator('#anat3d-search-results [data-locate]').first().tap();await mp.waitForFunction(()=>document.querySelector('#anat3d-info').classList.contains('is-open'));await mp.screenshot({path:'/tmp/medpobeda-mobile.png'});
assert(await mp.locator('[data-action="isolate"]').isVisible());await mp.locator('[data-action="close"]').tap();assert(!await mp.locator('#anat3d-info').evaluate(el=>el.classList.contains('is-open')));
console.log('MOBILE PASSED',errors);assert.equal(errors.length,0);} finally { await browser.close(); }
