/* Genuine main bundle -> Phase 3 -> main rollback -> Phase 3. Synthetic private data only. */
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='http://localhost:4174',legacyKey='paris-pocket-personal-v1';
const OLD='05790404b87b616db7b1a786770232dc55fbfe7b';
let release='old';const oldFiles=new Map();
function historical(file){if(!oldFiles.has(file))oldFiles.set(file,execFileSync('git',['show',`${OLD}:${file}`],{cwd:root,stdio:['ignore','pipe','ignore']}));return oldFiles.get(file);}
const server=http.createServer(async(req,res)=>{
 const file=new URL(req.url,base).pathname.slice(1)||'index.html';
 if(file==='install-only'){res.writeHead(200,{'Content-Type':'text/html'}).end('<title>Install test</title>');return;}
 try{
  let bytes=release==='old'?historical(file):await fs.readFile(path.join(root,file));
  if(file==='sw.js'&&release!=='old')bytes=Buffer.from(bytes.toString().replace(/const CACHE_VERSION='[^']+';/,`const CACHE_VERSION='paris-pocket-test-${release}';`));
  if(release==='incomplete'&&file==='local-store.js'){res.writeHead(503).end();return;}
  const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/html';
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end();}
});
async function update(page){await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker.getRegistration();return Boolean(registration.waiting&&!registration.installing);});}
async function storeState(page){return page.evaluate(async()=>{const s=await ParisStore.open();try{return await s.read();}finally{s.close();}});}
(async()=>{
 await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-07':'旧版测试每日笔记'},bookingNotes:{louvre:'旧版预约测试'},activityOverrides:{},customActivities:{},deletedActivityIds:[],activityOrder:{},futureField:{keep:true}})),legacyKey);await page.reload();
 const oldTab=await context.newPage();await oldTab.goto(base);await oldTab.locator('#day-note').waitFor();
 await page.locator('[data-action=edit-activity][data-id=d1-2]').click();await page.locator('#activity-time').fill('12:35');await page.locator('#activity-detail').fill('真实旧安装升级测试描述');
 release='current';await update(page);await page.waitForFunction(()=>!document.getElementById('app-update').hidden);
 await page.locator('#app-update').evaluate(el=>el.click());assert.equal(await page.locator('#activity-dialog').evaluate(el=>el.open),true,'old shell protects open draft before activation');
 await page.locator('#activity-form button[type=submit]').click();const raw=await page.evaluate(key=>localStorage.getItem(key),legacyKey);await oldTab.reload();await oldTab.locator('#day-note').waitFor();
 await page.evaluate(()=>caches.open('unrelated-cache'));
 await Promise.all([page.waitForEvent('load'),page.locator('#app-update').click()]);await page.locator('[data-activity-id=act-arrival-hotel]').waitFor();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),raw);
 let state=await storeState(page);assert.equal(state.personal.legacyArchive[0].sourceRaw,raw);assert.equal(state.personal.notesByActivityId['act-orangerie-visit'],undefined);
 assert.ok(!await page.locator('[data-activity-id]').filter({hasText:'12:35'}).count(),'old positional activity override is not applied to official itinerary');
 const keys=await page.evaluate(()=>caches.keys());assert.ok(keys.includes('unrelated-cache'));assert.ok(!keys.includes('paris-pocket-v4-google-maps'));
 console.log('PASS genuine main HTML/JS/data/SW -> new shell: waiting update, draft guard, exact legacy archive, unrelated cache preserved');
 await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();await page.locator('#activity-note').fill('新版备注：仅此设备');await page.waitForFunction(()=>document.getElementById('note-status')?.textContent==='已保存到此设备');await page.locator('#activity-detail-close').click();
 await oldTab.locator('#day-note').fill('旧窗口继续编辑后的测试笔记');await page.waitForTimeout(500);state=await storeState(page);assert.equal(state.personal.notesByActivityId['act-orangerie-visit'],'新版备注：仅此设备');assert.equal(state.personal.legacyArchive.length,2);
 const latestRaw=await page.evaluate(key=>localStorage.getItem(key),legacyKey);await oldTab.close();
 await context.setOffline(true);await page.reload();await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),'新版备注：仅此设备');await page.locator('#activity-detail-close').click();
 await page.goto(base+'/legacy.html');await page.locator('#day-note').waitFor();assert.equal(await page.locator('#day-note').inputValue(),'旧窗口继续编辑后的测试笔记');assert.match(await page.locator('[data-activity-id=d1-2] .time-col').textContent(),/12:35/);
 console.log('PASS new/old tabs coexist; legacy changes captured independently; offline main notes and retained legacy editor both work');
 await context.setOffline(false);await page.goto(base);await page.locator('[data-activity-id=act-arrival-hotel]').waitFor();release='incomplete';
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();await new Promise(resolve=>{const w=r.installing;if(!w)return resolve();w.addEventListener('statechange',()=>{if(['redundant','installed'].includes(w.state))resolve();});});});
 assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),false);await context.setOffline(true);await page.reload();await page.locator('[data-activity-id=act-arrival-hotel]').waitFor();assert.equal((await storeState(page)).personal.notesByActivityId['act-orangerie-visit'],'新版备注：仅此设备');
 console.log('PASS incomplete new shell install keeps previous complete shell and personal data usable offline');
 await context.setOffline(false);release='old';await update(page);await page.evaluate(async()=>{(await navigator.serviceWorker.getRegistration()).waiting.postMessage({type:'SKIP_WAITING'});});await page.waitForTimeout(600);await page.reload();await page.locator('[data-activity-id=d1-2]').waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),latestRaw);
 await page.locator('#day-note').fill('代码回退后仍可保存旧资料');const rollbackRaw=await page.evaluate(key=>localStorage.getItem(key),legacyKey);
 release='restored';await update(page);await Promise.all([page.waitForEvent('load'),page.locator('#app-update').click()]);await page.locator('[data-activity-id=act-arrival-hotel]').waitFor();state=await storeState(page);assert.equal(state.personal.notesByActivityId['act-orangerie-visit'],'新版备注：仅此设备');assert.ok(state.personal.legacyArchive.some(x=>x.sourceRaw===rollbackRaw));assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),rollbackRaw);
 console.log('PASS old -> new -> old -> new: code rollback does not erase new personal data or later legacy changes');
 assert.deepEqual(errors,[]);await context.close();
 const fresh=await browser.newContext(),cold=await fresh.newPage();await cold.goto(base+'/install-only');await cold.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await cold.reload();await fresh.setOffline(true);await cold.goto(base);await cold.locator('[data-activity-id=act-arrival-hotel]').waitFor();const initialized=await storeState(cold);assert.equal(initialized.migrationBlocked,false);assert.equal(initialized.personal.legacyArchive.length,0);await fresh.close();
 console.log('PASS complete cached shell + empty IndexedDB cold-starts offline from hash-validated bootstrap');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
