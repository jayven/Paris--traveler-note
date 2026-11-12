/* Selected-state color regression and repeatable comparisons. Synthetic isolated profiles only. */
'use strict';
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const origin=process.env.TEST_URL||'http://localhost:4178';
const output=path.resolve(__dirname,'../docs/phase-3/selected-state/screenshots');
const key='paris-pocket-personal-v1';
const raw=JSON.stringify({schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-09':'Synthetic selected-color regression note'},unknownField:{retain:true}});
const brown='rgb(88, 68, 62)',ink='rgb(13, 13, 13)',white='rgb(255, 255, 255)',green='rgb(87, 184, 134)';
const report={viewports:[320,375,390,430],height:844,selectedBackground:'#58443E',selectedText:'#FFFFFF',comparisons:{before:'Test-only --selected-bg override to prior #0d0d0d; no application code or data changes',after:'Production stylesheet; no override'},layouts:[],isolatedPreviews:[],pageErrors:[],realIPhoneTested:false};
const nav=(p,tab)=>p.locator(`.bottom-nav [data-tab="${tab}"]`).click();
async function color(p,selector,background=brown){
 const colors=await p.locator(selector).evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>{const s=getComputedStyle(e);return {label:e.textContent.trim(),background:s.backgroundColor,text:s.color,svg:[...e.querySelectorAll('svg')].map(icon=>getComputedStyle(icon).stroke),children:[...e.querySelectorAll('small,strong')].map(c=>getComputedStyle(c).color)};}));
 assert.ok(colors.length,`Missing selected control ${selector}`);
 for(const c of colors){assert.equal(c.background,background,`${selector} background (${c.label})`);assert.equal(c.text,white,`${selector} label`);assert.ok(c.svg.every(s=>s===white),`${selector} icon uses white currentColor`);assert.ok(c.children.every(s=>s===white),`${selector} date labels remain white`);}
}
async function layout(p,screen,preview=false){
 const data=await p.evaluate(({screen,preview})=>{const root=preview?document.querySelector('.preview-content'):document.querySelector('#main-content'),nav=document.querySelector(preview?'.preview-nav':'.bottom-nav').getBoundingClientRect();return {screen,width:innerWidth,preview,pageOverflow:document.documentElement.scrollWidth-innerWidth,contentOverflow:root.scrollWidth-root.clientWidth,navBottom:nav.bottom};},{screen,preview});
 assert.ok(data.pageOverflow<=1&&data.contentOverflow<=1,JSON.stringify(data));assert.ok(data.navBottom<=844.5,JSON.stringify(data));
 const targets=await p.locator(preview?'.preview-nav button,.preview-date,.preview-tabs button':'.bottom-nav button,.date-chip,[data-task-filter],[data-map-filter]').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length&&!e.disabled).map(e=>({label:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})));
 assert.ok(targets.every(t=>t.height>=44),JSON.stringify(targets.filter(t=>t.height<44)));
 (preview?report.isolatedPreviews:report.layouts).push(data);
}
async function personal(p){return p.evaluate(async()=>{const store=await ParisStore.open();try{return (await store.read()).personal;}finally{store.close();}});}
async function mapReady(p){
 await p.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');
 await p.waitForFunction(()=>window.__selectedMaps?.some(m=>m.getContainer().isConnected&&m.isStyleLoaded()&&m.areTilesLoaded()&&m.getCanvas().clientWidth===m.getContainer().clientWidth&&m.getCanvas().clientHeight===m.getContainer().clientHeight),{},{timeout:45000});
}
async function mapModel(p){return p.evaluate(()=>{const m=window.__selectedMaps.find(m=>m.getContainer().isConnected),s=m.getStyle();return {source:s.sources['paris-itinerary-routes'].data,colors:s.layers.filter(l=>/^paris-route-/.test(l.id)).map(l=>({id:l.id,color:l.paint['line-color']}))};});}
async function capture(p,name,variant){
 await p.waitForFunction(()=>!document.getElementById('toast')?.classList.contains('visible'));
 await p.screenshot({path:path.join(output,`${name}-${variant}-390.png`)});
}
async function scrollMap(p){await p.locator('#daily-map').evaluate(el=>{const strip=document.querySelector('.page-body .date-strip'),header=document.querySelector('.site-header').getBoundingClientRect().bottom;window.scrollTo({top:Math.max(0,scrollY+strip.getBoundingClientRect().top-header-8),behavior:'instant'});const bottom=el.getBoundingClientRect().bottom,navTop=document.querySelector('.bottom-nav').getBoundingClientRect().top;if(bottom>navTop-12)window.scrollBy({top:bottom-navTop+12,behavior:'instant'});});}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  await fs.mkdir(output,{recursive:true});
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);window.__selectedLegacyWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,...rest){if(name===key)window.__selectedLegacyWrites++;return set.call(this,name,...rest);};},{key,raw});
  const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(origin);await page.locator('.time-row').first().waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--selected-bg').trim().toLowerCase()),'#58443e');
  const beforePersonal=await personal(page),beforeTrip=await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP));
  await page.evaluate(async()=>{const sdk=await ParisMapRenderer.loadLibrary();window.__selectedMaps=[];const original=sdk.Map.prototype.addSource;sdk.Map.prototype.addSource=function(...args){if(!window.__selectedMaps.includes(this))window.__selectedMaps.push(this);return original.apply(this,args);};});
  await nav(page,'map');await page.locator('[data-day="2"]').click();await mapReady(page);
  const unchangedMap=await mapModel(page);
  assert.deepEqual(unchangedMap.colors,[{id:'paris-route-walking',color:'#39795d'},{id:'paris-route-driving',color:'#55769d'}],'transportation colors retain their meaning');
  for(const width of report.viewports){
   await page.setViewportSize({width,height:844});
   await nav(page,'days');await page.locator('[data-day="1"]').click();await color(page,'.date-chip.active');await page.locator('[data-day="2"]').click();await color(page,'.date-chip.active');await color(page,'.bottom-nav .active');
   assert.equal(await page.locator('.time-row').count(),9,'current official Wednesday activity count');
   const design=await page.evaluate(()=>{const date=getComputedStyle(document.querySelector('.date-chip.active')),time=getComputedStyle(document.querySelector('.time-col')),row=getComputedStyle(document.querySelector('.time-row')),root=getComputedStyle(document.documentElement);return {ink:root.getPropertyValue('--ink').trim(),outline:date.borderTopColor,borderWidth:date.borderTopWidth,shadow:date.boxShadow,bodyText:time.color,timeBorderLeft:time.borderLeftWidth,timeBorderRight:time.borderRightWidth,rowBorder:row.borderBottomColor,peach:root.getPropertyValue('--peach').trim(),pink:root.getPropertyValue('--pink').trim(),mint:root.getPropertyValue('--mint').trim()};});
   assert.equal(design.ink,'#0d0d0d');assert.equal(design.outline,ink);assert.equal(design.borderWidth,'1px');assert.match(design.shadow,/rgb\(13, 13, 13\) 2px 2px 0px 0px/);assert.equal(design.bodyText,ink);assert.equal(design.timeBorderLeft,'0px');assert.equal(design.timeBorderRight,'0px');assert.equal(design.rowBorder,ink);
   assert.equal(design.peach,'rgba(255,214,158,.4)');assert.equal(design.pink,'rgba(251,207,224,.4)');assert.equal(design.mint,'rgba(232,245,233,.4)');
   await layout(page,'daily-itinerary');
   await page.locator('[data-action=detail][data-id=act-opera-visit]').click();assert.equal(await page.locator('#activity-detail-dialog').evaluate(e=>e.open),true);await page.locator('#activity-detail-close').click();
   await nav(page,'todo');await color(page,'.bottom-nav .active');
   for(const filter of ['completed','all','archived','pending']){await page.locator(`[data-task-filter="${filter}"]`).click();await color(page,'.preview-tabs .active');assert.equal(await page.locator(`[data-task-filter="${filter}"]`).getAttribute('aria-selected'),'true');}
   assert.equal(await page.locator('#main-content [data-action=task-add]').evaluate(e=>getComputedStyle(e).backgroundColor),green,'green action remains green');await layout(page,'todo');
   await nav(page,'map');await mapReady(page);await color(page,'.bottom-nav .active');await color(page,'.preview-filter .active');
   await page.locator('[data-map-filter=hotel]').click();await mapReady(page);await color(page,'.preview-filter .active');assert.equal(await page.locator('.map-stop-list .location-row').count(),4,'filter includes distinct luggage visits and departure/arrival phases');
   await page.locator('[data-map-filter=all]').click();await mapReady(page);assert.deepEqual(await mapModel(page),unchangedMap,'CSS refinement cannot change route features or mode colors');await layout(page,'daily-map');
   if(width===390){
    for(const variant of ['before','after']){
     const override=variant==='before'?await page.addStyleTag({content:':root{--selected-bg:#0d0d0d}'}):null;
     const selected=variant==='before'?ink:brown;
     await nav(page,'days');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await color(page,'.date-chip.active',selected);await color(page,'.bottom-nav .active',selected);await capture(page,'daily-itinerary',variant);
     await page.locator('.bottom-nav').screenshot({path:path.join(output,`bottom-navigation-${variant}-390.png`)});
     await page.locator('.date-strip').screenshot({path:path.join(output,`selected-date-${variant}-390.png`)});
     await nav(page,'todo');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await color(page,'.preview-tabs .active',selected);await capture(page,'todo',variant);
     await nav(page,'map');await mapReady(page);await color(page,'.preview-filter .active',selected);await scrollMap(page);await capture(page,'daily-map',variant);
     if(override)await override.evaluate(e=>e.remove());
    }
   }
  }
  assert.deepEqual(await personal(page),beforePersonal,'browsing and visual comparisons do not modify personal records');assert.equal(await page.evaluate(()=>JSON.stringify(PARIS_BOOTSTRAP)),beforeTrip,'official itinerary unchanged');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);assert.equal(await page.evaluate(()=>window.__selectedLegacyWrites),0);
  await context.close();
  const previews=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  await previews.addInitScript(({key,raw})=>{localStorage.setItem(key,raw);window.__previewWrites=0;window.__previewIDB=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...a){window.__previewWrites++;return set.apply(this,a);};const open=indexedDB.open.bind(indexedDB);indexedDB.open=function(...a){window.__previewIDB++;return open(...a);};},{key,raw});
  const preview=await previews.newPage();preview.on('pageerror',e=>report.pageErrors.push(e.message));await preview.goto(new URL('/legacy.html',origin).href);await preview.locator('[data-action=view-activity]').first().waitFor();
  await color(preview,'.bottom-nav .active');await color(preview,'.date-chip.active');await preview.locator('.bottom-nav [data-tab=map]').click();await color(preview,'.filter-btn.selected');
  await preview.locator('#design-preview-btn').click();
  assert.match(await preview.locator('.preview-topbar').innerText(),/PHASE 2/,'isolated preview stays explicitly labeled');
  for(const width of report.viewports){
   await preview.setViewportSize({width,height:844});
   await preview.locator('.preview-nav [data-preview-screen=days]').click();await preview.locator('[data-preview-day="2"]').click();await color(preview,'.preview-date.active');await color(preview,'.preview-nav .active');await layout(preview,'days',true);
   assert.equal(await preview.locator('.preview-topbar').evaluate(e=>getComputedStyle(e).backgroundColor),ink,'preview/debug banner is not a selected control');
   if(width===390)await capture(preview,'isolated-itinerary','after');
   await preview.locator('.preview-nav [data-preview-screen=todo]').click();await color(preview,'.preview-tabs .active');await color(preview,'.preview-nav .active');await layout(preview,'todo',true);
   await preview.locator('[data-preview-filter=done]').click();await color(preview,'.preview-tabs .active');assert.equal(await preview.locator('.preview-check:checked').evaluate(e=>getComputedStyle(e).backgroundColor),green,'completion remains green');
   if(width===390)await capture(preview,'isolated-todo','after');
  }
  assert.equal(await preview.evaluate(()=>window.__previewWrites),0);assert.equal(await preview.evaluate(()=>window.__previewIDB),0);assert.equal(await preview.evaluate(key=>localStorage.getItem(key),key),raw);await previews.close();
  assert.deepEqual(report.pageErrors,[]);
  report.chromium=await browser.version();report.syntheticProfiles=true;report.legacyRawUnchanged=true;report.personalDataUnchanged=true;report.officialSnapshotUnchanged=true;report.mapGeoJSONAndModeColorsUnchanged=true;report.greenCompletionAndActionsUnchanged=true;report.previewNoWritesOrIDB=true;
  await fs.writeFile(path.join(output,'regression-results.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS selected-state tokens/white labels and icons, four widths, nav/date/To-do/map filters, shared detail, unchanged outlines/shadows/pastels/green actions/route colors/data and isolated preview controls');
  console.log('PASS 390px repeatable before/after full-screen and control comparisons; real iPhone acceptance remains separate');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
