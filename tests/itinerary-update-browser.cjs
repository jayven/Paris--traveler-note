/* One genuine immutable content update, in an isolated localhost profile with synthetic data. */
'use strict';
const {chromium,devices}=require('playwright');
const http=require('node:http'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),Official=require('../official-data.js');
const output=path.join(root,'test-results/itinerary-4.12.2');
const legacyKey='paris-pocket-personal-v1';
const legacyRaw=JSON.stringify({schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-09':'Synthetic retained legacy note'},unknownNested:{retain:true}});
const oldHash='af2dbb626d063926bf126dad2ae376d51738df7e34546b60b2748a2a7ef63708';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const report={syntheticIsolatedProfile:true,physicalIPhone:false,checks:{},layouts:[],pageErrors:[]};
let browser,activeManifest,oldEnvelope,newEnvelope;
const server=http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/trip/manifest.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(activeManifest));return;}
 // Simulate an already installed shell with its old bundled fallback. Only the cloud manifest changes.
 if(name==='/trip/bootstrap.js'){res.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'}).end('window.PARIS_BOOTSTRAP='+JSON.stringify(oldEnvelope)+';');return;}
 const relative=name==='/'?'index.html':name.slice(1),file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||relative.split('/').some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}
 try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}
});
const nav=(p,tab)=>p.locator(`.bottom-nav [data-tab="${tab}"]`).click();
const state=p=>p.evaluate(async()=>{const s=await ParisStore.open();try{return await s.read();}finally{s.close();}});
async function version(p,expected){await p.waitForFunction(v=>document.getElementById('main-content')?.textContent.includes('行程 v'+v),expected);assert.equal((await state(p)).official.manifest.tripDataVersion,expected);}
async function mapReady(p){await p.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');await p.waitForFunction(()=>window.__updateMaps?.some(m=>m.getContainer().isConnected&&m.isStyleLoaded()&&m.areTilesLoaded()),{},{timeout:45000});}
async function note(p,id,text){await p.locator(`[data-action=detail][data-id="${id}"]`).click();await p.locator('#activity-note').fill(text);await p.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('已保存到此设备'));await p.locator('#activity-detail-close').click();}
(async()=>{
 const oldBytes=await fs.readFile(path.join(root,'trip/releases',oldHash+'.json'));
 oldEnvelope={data:JSON.parse(oldBytes),manifest:Official.manifest({schemaVersion:1,tripId:'paris-2026',tripDataVersion:'4.12.1',releaseSequence:1,snapshotUrl:'./trip/releases/'+oldHash+'.json',sha256:oldHash,byteLength:oldBytes.length})};
 const manifest=JSON.parse(await fs.readFile(path.join(root,'trip/manifest.json'),'utf8'));
 assert.equal(manifest.tripDataVersion,'4.12.2');assert.equal(manifest.releaseSequence,2);
 newEnvelope={manifest,data:JSON.parse(await fs.readFile(path.join(root,manifest.snapshotUrl),'utf8'))};activeManifest=oldEnvelope.manifest;
 await fs.mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;report.origin=origin;report.oldHash=oldHash;report.newHash=manifest.sha256;
 browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
 await context.addInitScript(({legacyKey,legacyRaw})=>{if(localStorage.getItem(legacyKey)===null)localStorage.setItem(legacyKey,legacyRaw);window.__updateLegacyWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,...args){if(key===legacyKey)window.__updateLegacyWrites++;return set.call(this,key,...args);};},{legacyKey,legacyRaw});
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin);await page.locator('.time-row').first().waitFor();await version(page,'4.12.1');
 await page.locator('[data-day="2"]').click();await note(page,'act-sainte-visit','Synthetic moved Sainte note retained across December8 update');
 await page.evaluate(async()=>{const s=await ParisStore.open();try{const v=await s.read();await s.changePersonal(v.personal.revision,p=>{p.notesByActivityId['act-orsay-transfer']='Synthetic retired transfer note remains recoverable';});}finally{s.close();}});
 await page.reload();await page.locator('.time-row').first().waitFor();await version(page,'4.12.1');
 await nav(page,'todo');await page.locator('[data-task-filter=all]').click();await page.locator('[data-complete=task-sainte]').check();await page.waitForFunction(()=>{const checkbox=document.querySelector('[data-complete=task-sainte]');return checkbox?.checked&&!checkbox.disabled;});
 await page.locator('#main-content [data-action=task-add]').click();await page.locator('#task-name').fill('Synthetic update preservation local To-do');await page.locator('#task-note').fill('Private synthetic task remains on this device');await page.locator('#task-form [type=submit]').click();await page.waitForFunction(()=>!document.getElementById('task-dialog').open);
 const before=await state(page);assert.equal(before.personal.completionByTaskId['task-sainte'],true);assert.equal(Object.keys(before.personal.localTasks).length,1);
 activeManifest=manifest;await nav(page,'more');await page.locator('[data-action=sync]').click();await version(page,'4.12.2');
 const after=await state(page);report.syncDiagnostic={beforeVersion:before.official.manifest.tripDataVersion,beforeRetiredActivityPresent:before.official.data.activities.some(a=>a.id==='act-orsay-transfer'),afterVersion:after.official.manifest.tripDataVersion,afterRetiredIds:after.official.data.retiredActivityIds,archivedKeys:Object.keys(after.personal.archivedSnapshots),previousAvailable:after.previousAvailable};
 for(const key of ['notesByActivityId','completionByTaskId','localTasks','legacyArchive','legacySourceHashes'])assert.deepEqual(after.personal[key],before.personal[key],key+' changed during official sync');
 assert.equal(after.personal.archivedSnapshots['act-orsay-transfer'].activity.id,'act-orsay-transfer');assert.equal(after.previousAvailable,true);
 report.checks.oneTapOldToNewSync=true;report.checks.movedAndRetiredNotesRetained=true;report.checks.completionsLocalTasksAndLegacyPreserved=true;
 await page.reload();await page.locator('.time-row').first().waitFor();await version(page,'4.12.2');
 const current=await state(page);for(const key of ['notesByActivityId','completionByTaskId','localTasks','legacyArchive'])assert.deepEqual(current.personal[key],after.personal[key]);
 await page.locator('[data-day="1"]').click();await page.locator('[data-action=detail][data-id=act-sainte-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),before.personal.notesByActivityId['act-sainte-visit']);await page.locator('#activity-detail-close').click();
 report.checks.reloadKeepsUpdatedScheduleAndPersonalData=true;
 await page.evaluate(async()=>{const sdk=await ParisMapRenderer.loadLibrary();window.__updateMaps=[];const original=sdk.Map.prototype.addSource;sdk.Map.prototype.addSource=function(...args){if(!window.__updateMaps.includes(this))window.__updateMaps.push(this);return original.apply(this,args);};});
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  for(const dayIndex of [1,2]){
   const day=newEnvelope.data.days[dayIndex],activities=newEnvelope.data.activities.filter(a=>a.dayId===day.id).sort((a,b)=>a.order-b.order),stops=newEnvelope.data.stops.filter(s=>s.dayId===day.id).sort((a,b)=>a.order-b.order);
   await nav(page,'days');await page.locator(`[data-day="${dayIndex}"]`).click();assert.deepEqual(await page.locator('.time-row [data-action=detail]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),activities.map(a=>a.id));const itineraryOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(itineraryOverflow<=1,day.date+' itinerary overflow at '+width+'px: '+itineraryOverflow);
   if(width===390)await page.screenshot({path:path.join(output,day.date+'-itinerary-390.png')});
   await nav(page,'map');await mapReady(page);
   assert.deepEqual(await page.locator('.map-stop-list .location-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),stops.map(s=>s.id));
   const features=await page.evaluate(()=>window.__updateMaps.find(m=>m.getContainer().isConnected).getStyle().sources['paris-itinerary-routes'].data.features);
   const expected=newEnvelope.data.segments.filter(s=>s.dayId===day.id&&s.geometry&&s.verifiedStatus==='verified');assert.deepEqual(features.map(f=>f.id).sort(),expected.map(s=>s.id).sort());for(const f of features)assert.deepEqual(f.geometry,expected.find(s=>s.id===f.id).geometry);
   await page.locator('#routes-visible').uncheck();await mapReady(page);assert.equal(await page.evaluate(()=>['paris-route-walking','paris-route-driving'].every(id=>window.__updateMaps.find(m=>m.getContainer().isConnected).getLayoutProperty(id,'visibility')==='none')),true);await page.locator('#routes-visible').check();await mapReady(page);
   assert.equal(await page.locator('a[href*="maps.apple.com"]').count(),0);assert.ok(await page.locator('.map-stop-list a[href^="https://www.google.com/maps/"]').count()>0);
   const layout=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,mapOverflow:document.getElementById('daily-map').scrollWidth-document.getElementById('daily-map').clientWidth}));assert.ok(layout.overflow<=1&&layout.mapOverflow<=1,JSON.stringify(layout));report.layouts.push({date:day.date,...layout});
   if(width===390)await page.screenshot({path:path.join(output,day.date+'-map-390.png')});
  }
 }
 await page.locator('[data-map-filter=hotel]').click();await mapReady(page);await page.locator('.paris-stop-marker[data-place-id=place-ghpr]').click();assert.deepEqual(await page.locator('.paris-map-popup [data-stop-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),['stop-ghpr-checkout','stop-ghpr-luggage']);await page.locator('.paris-map-popup [data-stop-id=stop-ghpr-luggage]').click();assert.match(await page.locator('#detail-title').textContent(),/返回 GHPR/);await page.locator('#activity-detail-close').click();
 report.checks.twoDayMapsExactRoutesTogglesMarkersAndGoogleLinks=true;report.checks.fourWidthsWithoutOverflow=true;
 await nav(page,'more');await page.locator('[data-action=rollback]').click();await version(page,'4.12.1');const rolled=await state(page);assert.deepEqual(rolled.personal,after.personal);assert.equal(rolled.official.manifest.sha256,oldHash);
 await page.locator('[data-action=sync-force]').click();await version(page,'4.12.2');const restored=await state(page);assert.deepEqual(restored.personal,after.personal);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),legacyKey),legacyRaw);assert.equal(await page.evaluate(()=>window.__updateLegacyWrites),0);assert.deepEqual(report.pageErrors,[]);
 report.checks.previousSnapshotRollbackAndExplicitRetry=true;report.checks.noLegacyWrites=true;report.passed=true;
 await fs.writeFile(path.join(output,'update-browser-results.json'),JSON.stringify(report,null,2)+'\n');await context.close();
 console.log('PASS real4.12.1→4.12.2 one-tap sync, stable moved/retired notes, completions/local To-do/legacy, reload, exact two-day map data/controls/Google links, four widths and previous-snapshot rollback');
})().catch(async error=>{report.passed=false;report.failure=error.stack||String(error);await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'update-browser-results.json'),JSON.stringify(report,null,2)+'\n');console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
