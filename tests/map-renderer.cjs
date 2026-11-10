/* MapLibre acceptance in isolated browser profiles. Never reads production personal data. */
'use strict';
const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const syncFs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const origin=process.env.TEST_URL||'http://localhost:4178';
const output=path.join(root,'docs/phase-3/map-renderer/screenshots');
const key='paris-pocket-personal-v1';
const raw=JSON.stringify({schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-09':'Map renderer synthetic legacy note'},bookingNotes:{louvre:'Synthetic legacy booking note'},hotelNote:'Synthetic hotel note',unknownNested:{retain:true}});
const manifest=JSON.parse(syncFs.readFileSync(path.join(root,'trip/manifest.json')));
const releasedBytes=syncFs.readFileSync(path.join(root,manifest.snapshotUrl.slice(2)));
const snapshot=JSON.parse(releasedBytes);
const sourceId='paris-itinerary-routes';
const layerIds=['paris-route-walking','paris-route-driving'];
const errors=[];
const report={viewports:[],engines:{},nodeVersion:process.version,snapshotSha256:manifest.sha256,realDeviceTested:false};
const nav=(page,tab)=>page.locator(`.bottom-nav [data-tab="${tab}"]`).click();
async function makeContext(browser,{failure=null,sw='block',viewport=390}={}){
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:viewport,height:844},deviceScaleFactor:1,serviceWorkers:sw,acceptDownloads:true});
 await context.addInitScript(({key,raw,failure})=>{
  if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);
  window.__legacyMapWrites=0;const set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(name,...rest){if(name===key)window.__legacyMapWrites++;return set.call(this,name,...rest);};
  if(failure==='webgl'){
   const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){return /^(webgl2?|experimental-webgl)$/.test(type)?null:get.call(this,type,...args);};
  }
 },{key,raw,failure});
 const page=await context.newPage();page.setDefaultTimeout(25000);
 page.on('pageerror',e=>errors.push(e.message));
 const requests=[];page.on('request',req=>requests.push(req.url()));
 await page.goto(origin);await page.locator('.time-row').first().waitFor();
 return {context,page,requests};
}
async function installProbe(page,style){
 await page.evaluate(async style=>{
  const renderer=ParisMapRenderer,api=await renderer.loadLibrary(),Map=(api.Map||api.default?.Map);
  if(!Map)throw new Error('MapLibre Map export is missing');
  window.__mapTestInstances=[];
  for(const method of ['addControl','addSource','fitBounds']){
   const original=Map.prototype[method];
   Map.prototype[method]=function(...args){if(!window.__mapTestInstances.includes(this))window.__mapTestInstances.push(this);return original.apply(this,args);};
  }
  if(style){const mount=renderer.mount;renderer.mount=options=>mount({...options,style});}
 },style||null);
}
async function mapReady(page){
 await page.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');
 await page.waitForFunction(()=>window.__mapTestInstances?.some(m=>m.getContainer().isConnected&&m.isStyleLoaded()));
 await page.waitForFunction(()=>{const m=window.__mapTestInstances.find(m=>m.getContainer().isConnected);return m&&m.areTilesLoaded();},{},{timeout:30000});
 await page.waitForFunction(()=>{const m=window.__mapTestInstances.find(m=>m.getContainer().isConnected);return m&&m.getCanvas().clientWidth===m.getContainer().clientWidth&&m.getCanvas().clientHeight===m.getContainer().clientHeight;});
}
async function model(page){return page.evaluate(({sourceId,layerIds})=>{
 const map=window.__mapTestInstances.find(m=>m.getContainer().isConnected);if(!map)throw new Error('No active MapLibre instance');
 const style=map.getStyle();
 return {style,source:style.sources[sourceId]||null,layers:style.layers.filter(l=>layerIds.includes(l.id)),bounds:map.getBounds().toArray(),pitch:map.getPitch(),terrain:map.getTerrain(),canvas:!!map.getCanvas().getContext('webgl2'),markerCount:map.getContainer().querySelectorAll('.paris-stop-marker').length,activeMaps:window.__mapTestInstances.filter(m=>m.getContainer().isConnected).length};
 },{sourceId,layerIds});}
function expected(dayIndex,filter='all'){
 const day=snapshot.days[dayIndex],stops=snapshot.stops.filter(s=>s.dayId===day.id).sort((a,b)=>a.order-b.order);
 const place=id=>snapshot.places.find(p=>p.id===id);
 const type=s=>{const t=place(s.placeId).locationType;return t==='hotel'?'hotel':['transport','airport','station','pier'].includes(t)?'transport':'visit';};
 const shown=stops.filter(s=>filter==='all'||type(s)===filter);
 const ids=new Set(shown.map(s=>s.id));
 return {stops:shown,segments:snapshot.segments.filter(s=>s.dayId===day.id&&s.geometry&&s.verifiedStatus==='verified'&&['walking','driving'].includes(s.mode)&&ids.has(s.fromStopId)&&ids.has(s.toStopId)),place};
}
async function assertRoutes(page,dayIndex,filter='all'){
 const actual=await model(page),want=expected(dayIndex,filter);
 assert.equal(actual.activeMaps,1,'only the current selected day owns a live map');
 assert.equal(actual.pitch,0,'the itinerary map remains flat');assert.ok(actual.terrain==null,'no terrain effect');
 const features=actual.source?.data?.features||[];
 assert.deepEqual(features.map(f=>f.properties.id).sort(),want.segments.map(s=>s.id).sort());
 for(const feature of features){const original=want.segments.find(s=>s.id===feature.properties.id);assert.deepEqual(feature.geometry,original.geometry,'published [lng,lat] coordinates are unchanged');assert.equal(feature.properties.mode,original.mode);}
 const present=actual.layers.map(l=>l.id);
 if(want.segments.some(s=>s.mode==='walking'))assert.ok(present.includes(layerIds[0]));
 if(want.segments.some(s=>s.mode==='driving'))assert.ok(present.includes(layerIds[1]));
 for(const layer of actual.layers){assert.equal(layer.type,'line');assert.ok(layer.paint['line-width']>0);assert.ok(layer.paint['line-opacity']>0&&layer.paint['line-opacity']<=1);}
 if(actual.layers.length===2)assert.notEqual(actual.layers[0].paint['line-color'],actual.layers[1].paint['line-color'],'walking and driving remain visually distinct');
 const validPlaces=new Set(want.stops.map(s=>want.place(s.placeId)).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).map(p=>p.id));
 assert.equal(actual.markerCount,validPlaces.size);
 for(const id of validPlaces){const p=want.place(id),[[west,south],[east,north]]=actual.bounds;assert.ok(p.lng>=west-1e-6&&p.lng<=east+1e-6&&p.lat>=south-1e-6&&p.lat<=north+1e-6,'fitBounds contains every visible location');}
 return actual;
}
async function privateState(page){return page.evaluate(async()=>{const store=await ParisStore.open();try{return (await store.read()).personal;}finally{store.close();}});}
async function screenshot(page,name){
 await page.waitForFunction(()=>!document.getElementById('toast')?.classList.contains('visible'));
 await page.locator('#daily-map').evaluate(el=>{const strip=document.querySelector('.page-body .date-strip'),header=document.querySelector('.site-header').getBoundingClientRect().bottom;window.scrollTo({top:Math.max(0,scrollY+strip.getBoundingClientRect().top-header-8),behavior:'instant'});const bottom=el.getBoundingClientRect().bottom,navTop=document.querySelector('.bottom-nav').getBoundingClientRect().top;if(bottom>navTop-12)window.scrollBy({top:bottom-navTop+12,behavior:'instant'});});
 await page.screenshot({path:path.join(output,name)});
}
async function fallbackChecks(page,allowDegraded=false){
 await page.waitForFunction(allow=>{const state=document.getElementById('daily-map')?.dataset.mapState;return state==='fallback'||(allow&&state==='degraded');},allowDegraded);
 const state=await page.locator('#daily-map').getAttribute('data-map-state');
 const explanation=state==='fallback'?await page.locator('#daily-map').innerText():await page.locator('#map-status').innerText();
 assert.ok(explanation.trim().length>15,'map failure is explained instead of blank');
 assert.ok(await page.locator('.map-stop-list .location-row').count()>0);
 assert.ok(await page.locator('.map-stop-list a[href^="https://www.google.com/maps/"]').count()>0);
 await page.locator('.map-stop-list [data-action=detail]').first().click();
 assert.equal(await page.locator('#activity-detail-dialog').evaluate(el=>el.open),true);
 assert.ok(await page.locator('#activity-note').count());
 await page.locator('#activity-detail-close').click();
 assert.equal(await page.locator('a[href*="maps.apple.com"]').count(),0);
}
async function runChromium(){
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  await fs.mkdir(output,{recursive:true});
  const {context,page,requests}=await makeContext(browser,{sw:'allow'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await nav(page,'more');await page.waitForFunction(()=>/已检查|同步未完成/.test(document.getElementById('sync-status')?.textContent||''));
  await nav(page,'todo');await nav(page,'days');
  assert.ok(!requests.some(u=>/maplibre|tiles\.openfreemap\.org|leaflet/.test(u)),'non-map pages do not load any mapping SDK or map resources');
  const before=await privateState(page),beforeTrip=await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP));
  report.sdk=await page.evaluate(()=>({version:ParisMapRenderer.VERSION,module:ParisMapRenderer.SDK.module,defaultStyle:ParisMapRenderer.STYLES.positron}));
  await installProbe(page);await nav(page,'map');await mapReady(page);
  assert.ok(requests.includes('https://tiles.openfreemap.org/styles/positron'),'Positron is the actual default vector style');
  await assertRoutes(page,0);
  const attribution=await page.locator('#daily-map .maplibregl-ctrl-attrib').innerText();
  assert.match(attribution,/OpenFreeMap/);assert.match(attribution,/OpenMapTiles/);assert.match(attribution,/OpenStreetMap/);
  assert.match(await page.locator('.route-attribution').innerText(),/OSRM|FOSSGIS/,'route provider credit is distinct from basemap credit');
  await screenshot(page,'positron-routes-390.png');
  await page.locator('[data-map-filter=visit]').click();await mapReady(page);await assertRoutes(page,0,'visit');
  await page.locator('[data-map-filter=transport]').click();await page.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='fallback');assert.match(await page.locator('#daily-map').innerText(),/位置|待核/);assert.equal(await page.locator('.paris-stop-marker').count(),0,'unknown terminal has no fabricated pin');assert.equal(await page.locator('.map-stop-list .location-row').count(),1);
  await page.locator('[data-map-filter=all]').click();await mapReady(page);
  await page.locator('#routes-visible').uncheck();await mapReady(page);let current=await model(page);
  assert.equal(current.layers.length,2);assert.ok(current.layers.every(layer=>layer.layout.visibility==='none'),'hide routes makes both itinerary line layers invisible');assert.equal(current.source.data.features.length,expected(0).segments.length,'toggle does not modify route data');
  await screenshot(page,'positron-hidden-routes-390.png');
  await page.locator('#routes-visible').check();await mapReady(page);await assertRoutes(page,0);
  await page.locator('[data-day="2"]').click();await mapReady(page);current=await assertRoutes(page,2);
  assert.equal(current.layers.length,2,'a day with both modes renders both styles');
  await page.locator('[data-map-filter=hotel]').click();await mapReady(page);await assertRoutes(page,2,'hotel');
  assert.equal(await page.locator('.map-stop-list .location-row').count(),3);
  const marker=page.locator('.paris-stop-marker[data-place-id="place-ghpr"]');await marker.click();
  const visits=page.locator('.paris-map-popup [data-map-activity-id]');assert.equal(await visits.count(),2,'one hotel marker exposes both distinct visits');
  const stopIds=await visits.evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId));assert.equal(new Set(stopIds).size,2);assert.ok(stopIds.includes('stop-ghpr-luggage'));
  await page.waitForFunction(()=>{const map=document.getElementById('daily-map'),popup=map.querySelector('.maplibregl-popup'),credit=map.querySelector('.maplibregl-ctrl-attrib');if(!popup||!credit)return false;const box=popup.getBoundingClientRect(),area=map.getBoundingClientRect(),bottom=credit.getBoundingClientRect().top;return box.left>=area.left&&box.right<=area.right&&box.top>=area.top&&box.bottom<=bottom&&[...popup.querySelectorAll('[data-map-activity-id]')].every(el=>el.getBoundingClientRect().bottom<=bottom);});
  assert.match(await visits.first().textContent(),/GHPR 退房/);assert.match(await visits.last().textContent(),/返回 GHPR/);
  await screenshot(page,'positron-ghpr-revisit-390.png');
  await page.locator('.paris-map-popup [data-stop-id="stop-ghpr-luggage"]').click();assert.match(await page.locator('#detail-title').textContent(),/返回 GHPR/);
  await page.locator('#activity-detail-close').click();if(!await page.locator('.paris-map-popup').isVisible())await marker.click();await page.locator('.paris-map-popup [data-map-activity-id]').first().click();assert.match(await page.locator('#detail-title').textContent(),/GHPR 退房/);await page.locator('#activity-detail-close').click();
  await page.locator('[data-map-filter=all]').click();await mapReady(page);
  for(let i=0;i<8;i++){await page.locator(`[data-day="${i}"]`).click();}
  await mapReady(page);await assertRoutes(page,7);assert.equal(await page.locator('.maplibregl-canvas').count(),1);
  await page.locator('[data-day="0"]').click();await mapReady(page);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});await mapReady(page);
   const layout=await page.evaluate(()=>{const m=document.getElementById('daily-map');return {width:innerWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,mapWidth:m.getBoundingClientRect().width,mapOverflow:m.scrollWidth-m.clientWidth,navBottom:document.querySelector('.bottom-nav').getBoundingClientRect().bottom};});
   assert.ok(layout.pageOverflow<=1&&layout.mapOverflow<=1&&layout.mapWidth<=width,JSON.stringify(layout));assert.ok(layout.navBottom<=844.5);report.viewports.push(layout);
   const targets=await page.locator('#daily-map button,[data-map-filter],#routes-visible').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({label:n.getAttribute('aria-label')||n.textContent,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
   assert.ok(targets.filter(t=>t.label).every(t=>t.height>=44&&t.width>=44),JSON.stringify(targets.filter(t=>t.label&&(t.height<44||t.width<44))));
  }
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);assert.equal(await page.evaluate(()=>window.__legacyMapWrites),0);assert.deepEqual(await privateState(page),before);assert.equal(await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP)),beforeTrip);
  assert.ok(!requests.some(u=>/nominatim|\/route\/v1\/|maps\.googleapis|api\.mapbox/.test(u)),'no runtime geocoding, routing or paid map APIs');
  report.engines.chromium={passed:true,version:await browser.version(),webgl:'SwiftShader WebGL2 in isolated headless tests',realIPhone:false};
  await page.evaluate(()=>document.querySelector('#daily-map canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await fallbackChecks(page);
  await context.close();
  console.log('PASS actual Positron WebGL2 map, unchanged GeoJSON, mode styles, route toggle/filter, repeated visits/details, rapid eight-day switching, four widths, attribution and data preservation');
  const liberty=await makeContext(browser,{sw:'allow'});await liberty.page.evaluate(()=>navigator.serviceWorker.ready);await installProbe(liberty.page,'https://tiles.openfreemap.org/styles/liberty');await nav(liberty.page,'map');await mapReady(liberty.page);await assertRoutes(liberty.page,0);await liberty.page.locator('.basemap-attribution').evaluate(el=>{el.firstChild.textContent='视觉比较：OpenFreeMap Liberty（仅测试） · ';el.querySelector('a').href='https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md#styles';});await screenshot(liberty.page,'liberty-comparison-390.png');await liberty.context.close();
  console.log('PASS Liberty comparison is isolated to a test mount override; product default stays Positron');
  for(const failure of ['webgl','style','sdk','css','worker','tiles']){
   const item=await makeContext(browser,{failure});
   if(failure==='style')await item.page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
   if(failure==='sdk')await item.page.route(/maplibre-gl@/,r=>r.abort());
   if(failure==='css')await item.context.route('**/maplibre-gl.css*',r=>r.abort());
   if(failure==='worker')await item.context.route('**/maplibre-gl-worker.mjs*',r=>r.abort());
   if(failure==='tiles')await item.context.route('https://tiles.openfreemap.org/planet/**',r=>r.abort());
   await nav(item.page,'map');await fallbackChecks(item.page,failure==='tiles');assert.equal(await item.page.evaluate(key=>localStorage.getItem(key),key),raw);await item.context.close();
  }
  console.log('PASS WebGL unavailable and style/SDK/CSS/worker/tile failures preserve explanations, stop lists, details and Google navigation');
  const offline=await makeContext(browser,{sw:'allow'});await offline.page.evaluate(()=>navigator.serviceWorker.ready);await offline.page.reload();await offline.page.waitForFunction(()=>navigator.serviceWorker.controller);assert.ok(!offline.requests.some(u=>/maplibre-gl@|tiles\.openfreemap\.org/.test(u)),'installing the offline shell does not pre-cache public map dependencies or tiles');await offline.context.setOffline(true);await offline.page.reload();await offline.page.locator('.time-row').first().waitFor();await nav(offline.page,'map');await fallbackChecks(offline.page);await screenshot(offline.page,'offline-fallback-390.png');
  await nav(offline.page,'days');await offline.page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();await offline.page.locator('#activity-note').fill('Synthetic offline map-upgrade note');await offline.page.waitForFunction(()=>document.getElementById('note-status')?.textContent==='已保存到此设备');await offline.page.locator('#activity-detail-close').click();await offline.page.reload();await offline.page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await offline.page.locator('#activity-note').inputValue(),'Synthetic offline map-upgrade note');await offline.page.locator('#activity-detail-close').click();await nav(offline.page,'todo');assert.ok(await offline.page.locator('.task-row').count()>0);await offline.context.close();
  console.log('PASS complete cached shell cold-starts offline without map resources; fallback, notes and To-do remain usable');
 }finally{await browser.close();}
}
async function runWebKit(){
 const executable=process.env.PW_WEBKIT_EXECUTABLE_PATH||webkit.executablePath();
 if(!syncFs.existsSync(executable)){report.engines.webkit={tested:false,reason:'Official Playwright WebKit browser not installed'};return;}
 const browser=await webkit.launch({headless:true,...(process.env.PW_WEBKIT_EXECUTABLE_PATH?{executablePath:executable}: {})});
 try{
  const item=await makeContext(browser);await installProbe(item.page);await nav(item.page,'map');await mapReady(item.page);await assertRoutes(item.page,0);
  await item.page.locator('[data-day="2"]').click();await mapReady(item.page);await assertRoutes(item.page,2);await item.context.close();
  const result={rendererPassed:true,version:browser.version(),realIPhone:false,notes:'Playwright WebKit is an engine check, not iPhone Safari or installed PWA hardware acceptance'};
  console.log('PASS WebKit engine renders actual Positron and stored GeoJSON on two days');
  const offline=await makeContext(browser,{sw:'allow'});await offline.page.evaluate(()=>navigator.serviceWorker.ready);await offline.page.waitForFunction(()=>navigator.serviceWorker.controller);
  result.cachedShell=await offline.page.evaluate(async()=>({index:!!await caches.match('./index.html'),renderer:!!await caches.match('./map-renderer.js'),bootstrap:!!await caches.match('./trip/bootstrap.js')}));
  assert.ok(Object.values(result.cachedShell).every(Boolean),'WebKit cached shell must be complete before offline testing');
  await offline.context.setOffline(true);
  try{
   await offline.page.reload();await offline.page.locator('.time-row').first().waitFor();await nav(offline.page,'map');await fallbackChecks(offline.page);
   await nav(offline.page,'todo');assert.ok(await offline.page.locator('.task-row').count()>0);
   result.offlineColdStart={status:'passed'};
  }catch(error){
   // This driver-level error also reproduces on the unchanged a4abd91 Leaflet baseline.
   // Record a blocked check; never represent it as Safari/iPhone offline acceptance.
   if(!String(error.message).includes('WebKit encountered an internal error'))throw error;
   result.offlineColdStart={status:'not-verified',error:'WebKit encountered an internal error during simulated offline navigation',baselineCommit:'a4abd91',baselineObservation:'Separately reproduced with WebKit 26.5 on a4abd91 during 2026-11-09 review; this command does not rerun the old baseline'};
   console.log('LIMITATION WebKit simulated offline navigation fails before app load, also on a4abd91; real iPhone offline acceptance remains required');
  }
  await offline.context.close();report.engines.webkit=result;
 }finally{await browser.close();}
}
(async()=>{
 await runChromium();await runWebKit();assert.deepEqual(errors,[],'zero uncaught application errors');
 assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,manifest.snapshotUrl.slice(2)))).digest('hex'),manifest.sha256);
 await fs.writeFile(path.join(output,'acceptance-results.json'),JSON.stringify({...report,completedAt:new Date().toISOString(),requiredRendererChecksPassed:true,physicalIPhoneAcceptanceComplete:false,uncaughtPageErrors:errors},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
