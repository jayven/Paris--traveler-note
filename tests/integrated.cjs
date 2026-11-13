/* Phase 3 acceptance: isolated browser profile and synthetic personal records only. */
'use strict';
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const origin=process.env.TEST_URL||'http://localhost:4178';
const key='paris-pocket-personal-v1';
const legacy={schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-07':'合成旧日记'},bookingNotes:{louvre:'合成旧预约备注'},hotelNote:'合成酒店笔记',flightNote:'合成航班笔记',miscNote:'合成随手记',activityOverrides:{'d1-2':{time:'00:01',end:'00:02',detail:'合成旧描述不覆盖官方'}},customActivities:{'user-synthetic':{id:'user-synthetic',date:'2026-12-07',time:'23:00',end:'',title:'合成旧自建活动',detail:'保留恢复用途',type:'生活'}},deletedActivityIds:['d1-3'],activityOrder:{'2026-12-07':['user-synthetic','d1-2']},futureField:{preserve:true}};
const raw=JSON.stringify(legacy),output=path.join(__dirname,'../test-results/phase-3-regression');
async function nav(page,tab){await page.locator(`.bottom-nav [data-tab=${tab}]`).click();}
async function waitClosed(page,id){await page.waitForFunction(id=>!document.getElementById(id).open,id);}
async function saveTask(page,{title,priority='medium',dueDate='',note='',url=''}){await page.locator('#task-name').fill(title);await page.locator('#task-priority').selectOption(priority);await page.locator('#task-due').fill(dueDate);await page.locator('#task-note').fill(note);await page.locator('#task-url').fill(url);await page.locator('#task-form [type=submit]').click();await waitClosed(page,'task-dialog');}
async function expectText(page,selector,pattern){assert.match(await page.locator(selector).textContent(),pattern);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 try{
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);window.__legacyWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,...rest){if(k===key)window.__legacyWrites++;return set.call(this,k,...rest);};},{key,raw});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.type==='beforeunload'?dialog.dismiss():dialog.accept());
  await page.goto(origin);await page.locator('.time-row').first().waitFor();
  assert.deepEqual(await page.locator('.bottom-nav [data-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tab)),['days','map','todo','more']);
  assert.equal(await page.locator('[data-tab=detail]').count(),0,'Activity Detail is reached from activity, never bottom nav');
  assert.doesNotMatch(await page.locator('#app').innerText(),/PHASE\s*2|视觉预览|合成旧自建活动|合成旧描述不覆盖官方/,'preview and legacy overrides never replace official view');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw,'raw legacy storage preserved after migration');
  assert.equal(await page.evaluate(()=>window.__legacyWrites),0);
  assert.ok(await page.locator('[data-activity-id^="act-"]').count()>0,'new stable official IDs');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();await page.locator('.time-row').first().waitFor();await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();
  await expectText(page,'#activity-detail-content .detail-status',/待确认.*预约尚未确认/);
  const note='合成 Phase 3 备注\n<img src=x onerror=alert(1)> 作为文字保存';
  await page.locator('#activity-note').fill(note);await page.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('已保存到此设备'));
  assert.equal(await page.locator('#activity-note').inputValue(),note);assert.equal(await page.locator('#activity-detail-content img').count(),0);
  await page.locator('#activity-detail-close').click();await page.reload();await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),note);await page.locator('#activity-detail-close').click();
  console.log('PASS migration raw key unchanged, legacy records isolated, tentative official details and note autosave/reload/escaping');
  await nav(page,'todo');
  await page.locator('#main-content [data-action=task-add]').click();await saveTask(page,{title:'合成低优先级逾期任务',priority:'low',dueDate:'2020-01-01',note:'仅测试本机任务',url:'https://example.com/'});
  const task=page.locator('.task-row').filter({has:page.locator('h3',{hasText:'合成低优先级逾期任务'})});await task.waitFor();const taskId=await task.getAttribute('data-task-id');assert.ok(taskId.startsWith('local-'));assert.equal(await page.locator('[data-task-section=local] .task-row').first().getAttribute('data-task-id'),taskId,'overdue local tasks retain their own sorting within the separate local section');
  await task.locator('[data-action=task-edit]').click();await saveTask(page,{title:'合成已编辑本地任务',priority:'low',dueDate:'2020-01-01',note:'已编辑'});
  await expectText(page,`[data-task-id="${taskId}"] h3`,/合成已编辑本地任务/);await page.reload();await nav(page,'todo');await expectText(page,`[data-task-id="${taskId}"] h3`,/合成已编辑本地任务/);
  await page.locator(`[data-complete="${taskId}"]`).check();await page.locator('[data-task-filter=completed]').click();assert.equal(await page.locator(`[data-complete="${taskId}"]`).isChecked(),true);
  await page.locator(`[data-task-id="${taskId}"] [data-action=task-edit]`).click();await page.locator('[data-action=task-delete]').click();await waitClosed(page,'task-dialog');assert.equal(await page.locator(`[data-task-id="${taskId}"]`).count(),0);
  await page.locator('[data-task-filter=pending]').click();const officialTask=await page.locator('[data-task-id^=task-]').first().getAttribute('data-task-id');assert.equal(await page.locator(`[data-task-id="${officialTask}"] [data-action=task-edit]`).count(),0,'official task text read-only');await page.locator(`[data-complete="${officialTask}"]`).check();await page.locator('[data-task-filter=completed]').click();assert.equal(await page.locator(`[data-complete="${officialTask}"]`).isChecked(),true);
  console.log('PASS local task add/edit/reload/delete and completion, PRD overdue order and official completion independence');
  await nav(page,'more');assert.equal(await page.locator('a[href="./legacy.html"]').count(),1);await page.locator('.legacy-record').first().locator('summary').click();assert.ok((await page.locator('.legacy-record pre').first().textContent()).includes('futureField'));
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=backup]').click();const download=await downloadPromise;const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.ok(JSON.stringify(backup).includes('合成 Phase 3 备注'));assert.ok(JSON.stringify(backup).includes('futureField'));
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);assert.equal(await page.evaluate(()=>window.__legacyWrites),0);
  await nav(page,'days');await context.setOffline(true);await page.reload();await page.locator('.time-row').first().waitFor();await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),note);await page.locator('#activity-note').fill('合成离线备注');await page.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('已保存到此设备'));await page.locator('#activity-detail-close').click();await page.reload();await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),'合成离线备注');await page.locator('#activity-detail-close').click();
  await nav(page,'map');await page.waitForFunction(()=>document.querySelector('#daily-map .map-fallback')?.textContent.includes('暂不可用')||document.getElementById('daily-map')?.dataset.mapState==='ready');assert.ok(await page.locator('.map-stop-list .location-row').count()>0);assert.ok(await page.locator('.map-stop-list a[href^="https://www.google.com/maps/"]').count()>0);assert.equal(await page.locator('a[href*="maps.apple.com"]').count(),0);
  await nav(page,'todo');await page.locator('[data-task-filter=completed]').click();assert.equal(await page.locator(`[data-complete="${officialTask}"]`).isChecked(),true);await context.setOffline(false);
  console.log('PASS complete backup preserves legacy/notes, offline note save/reload, task completion and map list/Google fallback');
  await nav(page,'more');
  const importedFile={name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))};
  await page.locator('#backup-file').setInputFiles(importedFile);await page.waitForFunction(()=>document.getElementById('backup-dialog').open);await page.locator('#backup-cancel').click();
  await page.locator('#backup-file').setInputFiles(importedFile);await page.waitForFunction(()=>document.getElementById('backup-dialog').open);await page.locator('#backup-confirm').click();await waitClosed(page,'backup-dialog');
  await nav(page,'days');await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),note,'confirmed import restores backed-up notes');await page.locator('#activity-detail-close').click();
  await nav(page,'more');await page.locator('[data-action=undo-import]').click();await nav(page,'days');await page.locator('[data-action=detail][data-id=act-orangerie-visit]').click();assert.equal(await page.locator('#activity-note').inputValue(),'合成离线备注','import undo restores pre-import data');await page.locator('#activity-detail-close').click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);assert.equal(await page.evaluate(()=>window.__legacyWrites),0);
  console.log('PASS backup UI preview/cancel, confirmed restore and import undo preserve legacy raw storage');
  await fs.mkdir(output,{recursive:true});
  const screenshotContext=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});const review=await screenshotContext.newPage();review.on('pageerror',error=>errors.push(error.message));await review.goto(origin);await review.locator('.time-row').first().waitFor();
  await review.evaluate(async()=>{const sdk=await ParisMapRenderer.loadLibrary();const addSource=sdk.Map.prototype.addSource;sdk.Map.prototype.addSource=function(...args){window.__mapForRegression=this;return addSource.apply(this,args);};});
  await nav(review,'map');await review.locator('[data-day="2"]').click();await review.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');
  const expectedPaths=await review.evaluate(()=>window.PARIS_BOOTSTRAP.data.segments.filter(s=>s.dayId==='day-orsay'&&s.verifiedStatus==='verified'&&s.geometry).length);assert.ok(expectedPaths>0);await review.waitForFunction(n=>window.__mapForRegression?.getStyle().sources['paris-itinerary-routes']?.data?.features.length===n,expectedPaths);
  await review.locator('#routes-visible').uncheck();await review.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');assert.equal(await review.evaluate(()=>['paris-route-walking','paris-route-driving'].every(id=>window.__mapForRegression.getLayoutProperty(id,'visibility')==='none')),true);
  await review.locator('#routes-visible').check();await review.waitForFunction(n=>window.__mapForRegression?.getStyle().sources['paris-itinerary-routes']?.data?.features.length===n,expectedPaths);
  await review.locator('[data-map-filter=hotel]').click();assert.equal(await review.locator('.map-stop-list .location-row').count(),4,'GHPR morning/evening and Waldorf transfer/arrival are separate stops');await review.locator('[data-map-filter=all]').click();
  await review.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready');await review.locator('#daily-map .paris-stop-marker[data-place-id=place-waldorf]').click();await review.locator('.paris-map-popup button').last().click();await expectText(review,'#detail-title',/Waldorf 入住/);await review.locator('#activity-detail-close').click();await review.locator('#daily-map .maplibregl-popup-close-button').click();
  await review.locator('[data-stop-id=stop-ghpr-luggage] [data-action=detail]').click();await expectText(review,'#detail-title',/返回 GHPR/);await review.locator('#activity-detail-dialog [data-action=map-location]').click();await review.waitForFunction(()=>!document.getElementById('activity-detail-dialog').open);assert.equal(await review.locator('.map-stop-list [data-stop-id=stop-ghpr-luggage]').getAttribute('aria-current'),'location');await review.waitForFunction(()=>document.querySelector('#daily-map .paris-map-popup'));await review.evaluate(()=>window.scrollTo({top:0}));await review.screenshot({path:path.join(output,'daily-map-revisit-390.png')});
  console.log('PASS verified route toggle, hotel filtering, repeated GHPR stops, map/list shared detail and detail-to-map focus');
  await review.reload();await review.locator('.time-row').first().waitFor();
  const layouts=[];
  for(const width of [320,375,390,430]){
   await review.setViewportSize({width,height:844});
   for(const screen of ['days','detail','map','todo']){
    await nav(review,screen==='detail'?'days':screen);
    if(screen!=='todo')await review.locator('[data-day="2"]').click();
    if(screen==='detail')await review.locator('[data-action=detail][data-id=act-opera-visit]').click();
    if(screen==='map')await review.waitForFunction(()=>document.getElementById('daily-map')?.dataset.mapState==='ready'||document.querySelector('#daily-map .map-fallback')?.textContent.includes('暂不可用'));
    if(screen==='days'){
     assert.equal(await review.locator('.time-row').count(),9);const borders=await review.locator('.time-col').evaluateAll(nodes=>nodes.map(n=>[getComputedStyle(n).borderLeftWidth,getComputedStyle(n).borderRightWidth]));assert.ok(borders.every(pair=>pair.every(v=>v==='0px')),'no vertical time/activity divider');
     assert.equal(await review.locator('.time-row .detail-status,.time-row .detail-copy,.time-row .preview-priority').count(),0,'daily rows show time and title only');
    }
    const layout=await review.evaluate(screen=>{const root=screen==='detail'?document.getElementById('activity-detail-dialog'):document.getElementById('main-content'),nav=document.querySelector('.bottom-nav').getBoundingClientRect();return {screen,width:innerWidth,contentWidth:root.getBoundingClientRect().width,overflow:root.scrollWidth-root.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,navBottom:nav.bottom};},screen);
    assert.ok(layout.contentWidth<=width+.5&&layout.overflow<=1&&layout.pageOverflow<=1,JSON.stringify(layout));assert.ok(layout.navBottom<=844.5,'bottom navigation fits screen');layouts.push(layout);
    if(screen==='detail')assert.equal(await review.locator('#activity-note').evaluate(el=>getComputedStyle(el).fontSize),'16px');
    const targets=await review.locator(screen==='detail'?'#activity-detail-dialog button':'.bottom-nav button,.date-chip,.activity-open,[data-map-filter],[data-task-filter],[data-action=task-add]').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&!n.disabled).map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height})));
    assert.ok(targets.every(t=>t.height>=44),JSON.stringify(targets.filter(t=>t.height<44)));
    if(width===390){if(screen==='map')await review.waitForTimeout(500);await review.screenshot({path:path.join(output,`${screen==='days'?'daily-itinerary':screen==='detail'?'activity-detail':screen==='map'?'daily-map':'todo'}-390.png`)});}
    if(screen==='detail')await review.locator('#activity-detail-close').click();
   }
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'layout-checks.json'),JSON.stringify({viewportHeight:844,layouts,pageErrors:errors,isolatedProfiles:true,legacyRawUnchanged:true},null,2)+'\n');await screenshotContext.close();await context.close();
  console.log('PASS new four screens at 320/375/390/430px, no vertical dividers/overflow/detail bottom-tab, four 390px screenshots and zero page errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
