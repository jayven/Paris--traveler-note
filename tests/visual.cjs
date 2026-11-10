/* Phase 2 UI/privacy regression and reproducible review screenshots. Isolated profiles only. */
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const origin=new URL('legacy.html',(process.env.TEST_URL||'http://localhost:4173')+'/').href;
const key='paris-pocket-personal-v1';
const seed={schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-07':'测试每日笔记'},bookingNotes:{louvre:'测试预约备注'},hotelNote:'测试酒店记录',flightNote:'测试航班记录',miscNote:'测试随手记',activityOverrides:{'d1-2':{time:'12:15',end:'14:15',detail:'测试描述'}},customActivities:{},deletedActivityIds:[],activityOrder:{},futureField:{preserve:true}};
const output=path.join(__dirname,'../test-results/phase-2-regression');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 try{
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(({key,seed})=>{
   if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(seed));
   window.__storageWrites=0;window.__idbOpens=0;
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(...args){window.__storageWrites++;return original.apply(this,args);};
   const open=indexedDB.open.bind(indexedDB);
   indexedDB.open=function(...args){window.__idbOpens++;return open(...args);};
  },{key,seed});
  const page=await context.newPage(),errors=[],layouts=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('[data-action=view-activity]').first().waitFor();
  assert.deepEqual(await page.locator('.bottom-nav [data-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tab)),['days','map','bookings','more'],'detail is not an independent app nav tab');
  assert.doesNotMatch(await page.locator('#app').innerText(),/PHASE\s*2/i,'phase/debug banners stay out of the integrated app');
  assert.equal(await page.locator('.hero-title').evaluate(el=>el.firstChild.textContent),'Paris, at our pace');
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  await fs.mkdir(output,{recursive:true});
  await page.screenshot({path:path.join(output,'existing-itinerary-390.png')});
  await page.locator('[data-action=view-activity]').first().click();
  assert.equal(await page.locator('#activity-detail-dialog [data-detail-action=edit]').isVisible(),true);
  await page.locator('#activity-detail-close').click();
  await page.locator('#design-preview-btn').click();
  assert.equal(await page.locator('.preview-topbar').evaluate(el=>Boolean(el.closest('#design-preview-dialog'))),true,'preview banner is contained in the isolated preview');
  assert.equal(await page.locator('.preview-nav [data-preview-screen=detail]').textContent(),'详情预览');
  assert.match(await page.locator('#design-preview-dialog .preview-notice').first().textContent(),/不保存或同步/);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   for(const view of ['days','detail','map','todo']){
    await page.locator(`.preview-nav [data-preview-screen=${view}]`).click();
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.preview-header h1')),true,'view changes announce the new heading');
    if(view==='map'){
     await page.waitForFunction(()=>document.querySelector('#preview-leaflet .leaflet-container')||document.querySelector('#preview-leaflet')?.classList.contains('leaflet-container')||document.querySelector('#preview-leaflet .map-fallback')?.textContent.includes('需要联网'));
     if(width===390){
      await page.locator('.leaflet-tile-loaded').first().waitFor({timeout:20000});
      await page.waitForTimeout(600);
      assert.equal(await page.locator('#preview-leaflet path.leaflet-interactive').count(),0,'no fabricated route lines');
     }
    }
    if(view==='days'){
     assert.equal(await page.locator('.preview-row').count(),9);
     const borders=await page.locator('.preview-time').evaluateAll(nodes=>nodes.map(el=>[getComputedStyle(el).borderLeftWidth,getComputedStyle(el).borderRightWidth]));
     assert.ok(borders.every(pair=>pair.every(n=>n==='0px')),'no vertical time divider');
     assert.equal(await page.locator('.preview-row .detail-copy,.preview-row .preview-priority').count(),0);
    }
    if(view==='detail'){
     assert.equal(await page.locator('#preview-note').getAttribute('readonly'),'');
     assert.match(await page.locator('#preview-note-hint').textContent(),/未接入保存/);
    }
    if(view==='todo'){
     assert.equal(await page.locator('.preview-check:not(:disabled)').count(),0);
     assert.match(await page.locator('.preview-disabled').textContent(),/尚未接入/);
    }
    const layout=await page.evaluate(()=>{
     const d=document.getElementById('design-preview-dialog'),content=d.querySelector('.preview-content');
     const nav=d.querySelector('.preview-nav').getBoundingClientRect();
     return {width:innerWidth,dialogWidth:d.getBoundingClientRect().width,overflow:content.scrollWidth-content.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,navBottom:nav.bottom,view:d.querySelector('.preview-nav .active').dataset.previewScreen};
    });
    assert.ok(layout.dialogWidth<=width+.5&&layout.overflow<=1&&layout.pageOverflow<=1,JSON.stringify(layout));
    assert.ok(layout.navBottom<=844.5,'review navigation remains in viewport');
    const targets=await page.locator('.preview-nav button,.preview-control,.preview-date').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&!n.disabled).map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height})));
    assert.ok(targets.every(t=>t.height>=44),JSON.stringify(targets.filter(t=>t.height<44)));
    layouts.push(layout);
    if(width===390)await page.screenshot({path:path.join(output,`${view==='days'?'daily-itinerary':view==='detail'?'activity-detail':view==='map'?'daily-map':'todo'}-390.png`)});
    if(width!==390){
     await fs.mkdir(path.join(__dirname,'../test-results/phase-2'),{recursive:true});
     await page.screenshot({path:path.join(__dirname,`../test-results/phase-2/${view}-${width}.png`)});
    }
   }
  }
  await page.locator('[data-preview-filter=done]').click();assert.equal(await page.locator('.preview-check:checked').count(),1);
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.previewFilter),'done','task filter retains focus');
  await page.locator('[data-preview-filter=archived]').click();assert.match(await page.locator('.preview-task-meta').textContent(),/归档不等于完成/);
  await page.locator('.preview-nav [data-preview-screen=days]').click();
  await page.locator('[data-preview-day="4"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.previewDay),'4','date selection retains focus');
  await page.locator('[data-preview-item="3"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.preview-header h1')),true,'activity selection announces detail');
  assert.match(await page.locator('.preview-screen .detail-copy').first().textContent(),/13:30–16:30.*16:30–20:00/);
  assert.match(await page.locator('.preview-screen .detail-status').textContent(),/非预约确认/);
  await page.locator('[data-preview-close]').click();
  await page.locator('[data-tab=bookings]').click();assert.equal(await page.locator('#book-louvre').isChecked(),true);
  await page.locator('[data-tab=more]').click();assert.equal(await page.locator('#hotel-note').inputValue(),seed.hotelNote);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before,'all preview browsing preserves raw legacy storage');
  assert.equal(await page.evaluate(()=>window.__storageWrites),0,'no preview or navigation storage writes');
  assert.equal(await page.evaluate(()=>window.__idbOpens),0,'no Phase 3 database opens');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'layout-checks.json'),JSON.stringify({viewportHeight:844,layouts,noStorageWrites:true,noIndexedDBOpens:true,pageErrors:errors},null,2)+'\n');
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await fallbackContext.route('**/visual-preview.js',route=>route.fulfill({status:503,body:'Unavailable'}));
  const fallback=await fallbackContext.newPage(),fallbackErrors=[];
  fallback.on('pageerror',error=>fallbackErrors.push(error.message));
  await fallback.goto(origin);await fallback.locator('[data-action=view-activity]').first().waitFor();
  assert.equal(await fallback.locator('#design-preview-btn').isVisible(),false);
  await fallback.locator('[data-action=view-activity]').first().click();
  await fallback.locator('[data-detail-action=edit]').click();
  assert.equal(await fallback.locator('#activity-dialog').evaluate(el=>el.open),true);
  assert.deepEqual(fallbackErrors,[]);
  await fallbackContext.close();
  console.log('PASS four visual views at 320/375/390/430, time/title rows without dividers, persistent data unchanged, no database opens, tentative facts, four 390px screenshots');
  console.log('PASS optional preview file failure preserves the working itinerary and editor');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
