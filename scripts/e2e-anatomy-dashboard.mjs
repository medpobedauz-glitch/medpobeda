import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/auth/me',r=>r.fulfill({status:401,json:{}}));
 await p.goto('http://127.0.0.1:3000/en/anatomy');await p.waitForURL('**/login?next=**');assert.equal(await p.locator('.anat-card').count(),0);
 await p.unroute('**/api/auth/me');await p.route('**/api/auth/me',r=>r.fulfill({json:{student:{id:1,name:'Test student'}}}));
 await p.route('**/api/auth/login',r=>r.fulfill({json:{ok:true}}));
 await p.locator('#lg-contact').fill('test@example.com');await p.locator('#lg-password').fill('test-password');await p.locator('#login-submit').click();await p.waitForURL('**/en/anatomy');await p.locator('.anat-card').first().waitFor();assert.equal(await p.locator('.anat-section').count(),13);assert.equal(await p.locator('[data-section-id="digestive"] .anat-card').count(),15);
 await p.waitForFunction(()=>[...document.querySelectorAll('[data-section-id="bones"] canvas')].every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>200);}));
 await p.screenshot({path:'/tmp/anatomy-dashboard-desktop.png'});
 for(const [topic,expect] of [['bones-cranium',null],['bones-trunk',['spine','spine_discs','sternum','ribs','costal_cartilage']],['heart',['heart']]]){
  await p.goto('http://127.0.0.1:3000/en/anatomy-3d?topic='+topic+'&debug=1');
  await p.waitForFunction(()=>{const v=document.querySelector('#anatomy-atlas')?.__viewer;return v?.topicIds?.size&&!v.camAnim&&!v.pendingFiles.size;},null,{timeout:60000});
  const ids=await p.evaluate(()=>[...new Set(document.querySelector('#anatomy-atlas').__viewer.allMeshes.filter(m=>m.visible).map(m=>m.userData.structure))]);
  assert(ids.length>0);if(expect)assert.deepEqual(ids.sort(),expect.sort());else assert.equal(ids.length,46);
  await p.locator('[data-action="reset"]').click();assert.equal(await p.evaluate(()=>document.querySelector('#anatomy-atlas').__viewer.allMeshes.filter(m=>m.visible).some(m=>!document.querySelector('#anatomy-atlas').__viewer.topicIds.has(m.userData.structure))),false);
 }
 await p.setViewportSize({width:390,height:844});await p.goto('http://127.0.0.1:3000/en/anatomy');await p.locator('.anat-card').first().waitFor();await p.screenshot({path:'/tmp/anatomy-dashboard-mobile.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,8).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right]))));await p.screenshot({path:'/tmp/anatomy-dashboard-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS auth gate, 13 sections/15 digestive topics, rendered bone previews, exact cranium/trunk/heart scopes, scoped reset, responsive layout, no page errors');
}finally{await browser.close();}
