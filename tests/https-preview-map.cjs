/* Dec 9 preview acceptance in a new synthetic browser profile. Never use production. */
'use strict';
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const origin=process.env.TEST_URL||'http://localhost:4178';
const url=new URL(origin);
assert.notEqual(url.hostname,'stirring-cheesecake-37698e.netlify.app','This acceptance harness must not operate on production');
assert.ok(url.protocol==='https:'||['localhost','127.0.0.1'].includes(url.hostname),'Preview must use HTTPS except localhost');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-results/https-preview');
const manifest=require('../trip/manifest.json'),snapshot=require(path.join(root,manifest.snapshotUrl));
const day=snapshot.days.find(d=>d.date==='2026-12-09');
const stops=snapshot.stops.filter(s=>s.dayId===day.id).sort((a,b)=>a.order-b.order);
const activity=id=>snapshot.activities.find(a=>a.id===id);
const report={origin,viewport:{width:390,height:844},day:day.date,manifestSha256:manifest.sha256,physicalIPhone:false,stops:[],gestures:{},pageErrors:[]};
const nav=(page,tab)=>page.locator(`.bottom-nav [data-tab="${tab}"]`).click();
async function ready(page){
 await page.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');
 await page.waitForFunction(()=>window.__previewMaps?.some(m=>m.getContainer().isConnected&&m.isStyleLoaded()&&m.areTilesLoaded()),{},{timeout:45000});
}
async function capture(page,name){
 await page.waitForFunction(()=>!document.getElementById('toast')?.classList.contains('visible'));
 await page.locator('#daily-map').evaluate(el=>{const strip=document.querySelector('.page-body .date-strip'),header=document.querySelector('.site-header').getBoundingClientRect().bottom;window.scrollTo({top:Math.max(0,scrollY+strip.getBoundingClientRect().top-header-8),behavior:'instant'});const bottom=el.getBoundingClientRect().bottom,navTop=document.querySelector('.bottom-nav').getBoundingClientRect().top;if(bottom>navTop-12)window.scrollBy({top:bottom-navTop+12,behavior:'instant'});});
 await page.screenshot({path:path.join(output,name)});
}
async function closePopup(page){const close=page.locator('#daily-map .maplibregl-popup-close-button');if(await close.isVisible())await close.click();}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  await fs.mkdir(output,{recursive:true});
  const context=await browser.newContext({...devices['iPhone 13'],viewport:report.viewport,deviceScaleFactor:1,...(process.env.PW_PREVIEW_AUTH_FILE?{storageState:process.env.PW_PREVIEW_AUTH_FILE}:{})});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.pageErrors.push(error.message));
  const response=await page.goto(origin);assert.equal(response.status(),200,'Preview entry must be accessible (an access-protection page is not acceptance)');
  await page.locator('.time-row').first().waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);
  assert.equal(await page.evaluate(()=>PARIS_BOOTSTRAP.manifest.sha256),manifest.sha256);
  const beforeTrip=await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP));
  const beforePersonal=await page.evaluate(async()=>{const store=await ParisStore.open();try{return (await store.read()).personal;}finally{store.close();}});
  await page.evaluate(async()=>{const sdk=await ParisMapRenderer.loadLibrary();window.__previewMaps=[];const add=sdk.Map.prototype.addSource;sdk.Map.prototype.addSource=function(...args){if(!window.__previewMaps.includes(this))window.__previewMaps.push(this);return add.apply(this,args);};});
  await nav(page,'map');await page.locator('[data-day="2"]').click();await ready(page);
  assert.equal(stops.length,10);
  assert.deepEqual(await page.locator('.map-stop-list .location-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),stops.map(s=>s.id),'all ten visits remain in order below the overview');
  assert.equal(await page.locator('.paris-stop-marker').count(),8,'eight exact locations retain ten distinct visits');
  const initial=await page.evaluate(()=>{const m=window.__previewMaps.find(m=>m.getContainer().isConnected);return {zoom:m.getZoom(),center:m.getCenter().toArray(),source:m.getStyle().sources['paris-itinerary-routes'].data};});
  const geometryById=new Map(snapshot.segments.filter(s=>s.dayId===day.id&&s.geometry&&s.verifiedStatus==='verified'&&['walking','driving'].includes(s.mode)).map(s=>[s.id,s.geometry]));
  assert.equal(initial.source.features.length,geometryById.size);
  for(const feature of initial.source.features)assert.deepEqual(feature.geometry,geometryById.get(feature.id),'each road retains every stored coordinate');
  await capture(page,'dec9-overview-390.png');
  for(const stop of stops){
   const row=page.locator(`.map-stop-list [data-stop-id="${stop.id}"]`);
   await row.locator('[data-action=detail]').click();
   assert.equal(await page.locator('#detail-title').innerText(),activity(stop.activityId).title);
   const target=page.locator(`#activity-detail-dialog [data-action=map-location][data-activity="${stop.activityId}"][data-place="${stop.placeId}"]`);
   assert.equal(await target.count(),1,'each stop can be located through its existing shared detail');
   await target.click();await page.waitForFunction(()=>!document.getElementById('activity-detail-dialog').open);await ready(page);
   assert.equal(await row.getAttribute('aria-current'),'location');
   const popupStop=page.locator(`.paris-map-popup [data-stop-id="${stop.id}"]`);await popupStop.waitFor({state:'visible'});
   await popupStop.click();assert.equal(await page.locator('#detail-title').innerText(),activity(stop.activityId).title);
   await page.locator('#activity-detail-close').click();await closePopup(page);
   report.stops.push({id:stop.id,activityId:stop.activityId,listDetail:true,focusedPopupDetail:true});
  }
  // One marker represents each actual coordinate; multiple visits are never collapsed into one activity.
  await nav(page,'days');await page.locator('[data-action=day-map]').click();await ready(page);
  await page.locator('[data-map-filter=hotel]').click();await ready(page);await capture(page,'dec9-hotels-overview-390.png');
  await page.locator('.paris-stop-marker[data-place-id=place-ghpr]').click();
  assert.deepEqual(await page.locator('.paris-map-popup [data-stop-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),['stop-ghpr-checkout','stop-ghpr-luggage']);
  await capture(page,'dec9-ghpr-two-visits-390.png');await closePopup(page);
  await page.locator('[data-map-filter=all]').click();await ready(page);await closePopup(page);
  // Real touch events in emulated Chrome verify pinch/drag handlers; physical-iPhone gestures remain manual acceptance.
  await capture(page,'dec9-before-gestures-390.png');
  const canvas=page.locator('#daily-map .maplibregl-canvas'),box=await canvas.boundingBox();
  const cdp=await context.newCDPSession(page),cx=box.x+box.width*.58,cy=box.y+box.height*.5;
  const pinchStart=await page.evaluate(()=>window.__previewMaps.find(m=>m.getContainer().isConnected).getZoom());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-20,y:cy,id:1},{x:cx+20,y:cy,id:2}]});
  for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-20-n*6,y:cy,id:1},{x:cx+20+n*6,y:cy,id:2}]});await page.waitForTimeout(25);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(z=>window.__previewMaps.find(m=>m.getContainer().isConnected).getZoom()>z+.25,pinchStart);
  const dragStart=await page.evaluate(()=>window.__previewMaps.find(m=>m.getContainer().isConnected).getCenter().toArray());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:1}]});
  for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-n*7,y:cy+n*3,id:1}]});await page.waitForTimeout(25);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(start=>{const c=window.__previewMaps.find(m=>m.getContainer().isConnected).getCenter();return Math.abs(c.lng-start[0])>.00001||Math.abs(c.lat-start[1])>.00001;},dragStart);
  report.gestures={emulatedPinchZoom:true,emulatedTouchPan:true,physicalIPhone:false};
  // Zoom into the actual Paris coordinates, without moving markers, and open every location's existing popup.
  const central=snapshot.places.filter(p=>stops.some(s=>s.placeId===p.id)&&p.id!=='place-waldorf');
  await page.evaluate(places=>{const m=window.__previewMaps.find(m=>m.getContainer().isConnected),bounds=places.reduce((b,p)=>[[Math.min(b[0][0],p.lng),Math.min(b[0][1],p.lat)],[Math.max(b[1][0],p.lng),Math.max(b[1][1],p.lat)]],[[Infinity,Infinity],[-Infinity,-Infinity]]);m.fitBounds(bounds,{padding:70,duration:0});},central);
  await ready(page);await capture(page,'dec9-central-paris-zoom-390.png');
  for(const place of central){
   // Closing a tall popup leaves its camera pan in place. Recenter the camera on the next
   // original location, as a user can pan/zoom; never alter marker or route coordinates.
   await page.evaluate(place=>window.__previewMaps.find(m=>m.getContainer().isConnected).jumpTo({center:[place.lng,place.lat],zoom:15.5}),place);
   await ready(page);await capture(page,`dec9-marker-${place.id}-390.png`);
   await page.locator(`.paris-stop-marker[data-place-id="${place.id}"]`).click();
   assert.deepEqual(await page.locator('.paris-map-popup [data-stop-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),stops.filter(s=>s.placeId===place.id).map(s=>s.id));
   await closePopup(page);
  }
  await nav(page,'days');await page.locator('[data-day="3"]').click();await page.locator('[data-day="2"]').click();await nav(page,'map');await ready(page);
  assert.deepEqual(await page.locator('.map-stop-list .location-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.stopId)),stops.map(s=>s.id));
  assert.equal(await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP)),beforeTrip);
  assert.deepEqual(await page.evaluate(async()=>{const store=await ParisStore.open();try{return (await store.read()).personal;}finally{store.close();}}),beforePersonal);
  assert.deepEqual(report.pageErrors,[]);report.chromium=await browser.version();report.exactGeometryPreserved=true;report.officialAndPersonalDataUnchanged=true;report.allStopsAccessible=true;report.centralParisZoomPopups=true;
  await fs.writeFile(path.join(output,'dec9-map-results.json'),JSON.stringify(report,null,2)+'\n');
  await context.close();console.log('PASS Dec9: all10 ordered Stop list/details/focused popups, GHPR two visits, eight exact locations, real stored geometry, emulated pinch/pan, central Paris zoom popups, switching days and data preservation. Physical iPhone remains pending.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
