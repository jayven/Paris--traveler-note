const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
let release='legacy';
const server=http.createServer(async(req,res)=>{
 const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
 try {
  let content=await fs.readFile(path.join(root,file));
  if(file==='sw.js'){
   content=release==='legacy'?await fs.readFile(path.join(__dirname,'fixtures/legacy-sw.js')):Buffer.from(content.toString().replace(/const CACHE_VERSION='[^']+';/,`const CACHE_VERSION='paris-pocket-test-${release}';`));
  }
  if(release==='incomplete' && file==='personal-data.js'){res.writeHead(503).end();return;}
  const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(content);
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:4174');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await page.locator('[data-action=edit-activity][data-id=d1-2]').click();
 await page.locator('#activity-time').fill('12:35');
 await page.locator('#activity-detail').fill('正在编辑的描述');
 await page.evaluate(()=>localStorage.setItem('update-test-marker','before-update'));
 release='current';
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 await page.waitForFunction(()=>!document.getElementById('app-update').hidden);
 assert.equal(await page.locator('#app-update').isVisible(),true);
 assert.equal(await page.locator('#activity-time').inputValue(),'12:35');
 await page.evaluate(()=>document.getElementById('app-update').click());
 assert.equal(await page.locator('#activity-dialog').evaluate(el=>el.open),true);
 await page.locator('#activity-form button[type=submit]').click();
 await page.evaluate(()=>caches.open('unrelated-cache'));
 await Promise.all([page.waitForEvent('load'),page.locator('#app-update').click()]);
 await page.waitForFunction(()=>document.querySelector('[data-activity-id="d1-2"] .time-col')?.textContent.includes('12:35'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('update-test-marker')),'before-update');
 const keys=await page.evaluate(()=>caches.keys());
 assert.ok(keys.includes('unrelated-cache'));assert.ok(keys.includes('paris-pocket-test-current'));
 assert.ok(!keys.includes('paris-pocket-v1-20261012'));
 console.log('PASS legacy worker upgrade waits for user, keeps editor drafts/storage and only removes owned caches');
 await context.setOffline(true);await page.reload();
 assert.match(await page.locator('[data-activity-id=d1-2] .time-col').textContent(),/12:35/);
 assert.equal(await page.locator('[data-activity-id=d1-2] .activity-description').textContent(),'正在编辑的描述');
 console.log('PASS full offline shell after update including personal-data.js');
 await context.setOffline(false);release='incomplete';
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();await new Promise(resolve=>{const worker=r.installing;if(!worker)return resolve();worker.addEventListener('statechange',()=>{if(['redundant','installed'].includes(worker.state))resolve()})})});
 assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),false);
 assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).active.scriptURL),'http://localhost:4174/sw.js');
 await context.setOffline(true);await page.reload();
 assert.match(await page.locator('[data-activity-id=d1-2] .time-col').textContent(),/12:35/);
 console.log('PASS incomplete update leaves working shell available offline');
 assert.deepEqual(errors,[]);
 await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
