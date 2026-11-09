/* Actual app failure states, using fresh browser contexts and synthetic private records only. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const url=process.env.TEST_URL||'http://localhost:4178/';
const KEY='paris-pocket-personal-v1';
const raw=JSON.stringify({schemaVersion:3,booked:['louvre'],dayNotes:{'2026-12-09':'模拟每日笔记'},bookingNotes:{louvre:'模拟预约备注'},hotelNote:'模拟酒店备注',flightNote:'模拟航班备注',miscNote:'模拟通用备注',unknownNested:{preserved:['exact raw',false] }},null,2);
async function newPage(browser,kind,sourceRaw=raw){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true,serviceWorkers:'block'});
 await context.addInitScript(({kind,sourceRaw,key})=>{
  localStorage.setItem(key,sourceRaw);
  window.__originalGetItem=Storage.prototype.getItem;
  window.__openCalls=0;window.__putCalls=0;
  const open=IDBFactory.prototype.open,put=IDBObjectStore.prototype.put;
  IDBFactory.prototype.open=function(){window.__openCalls++;if(kind==='open-denied')throw new DOMException('Synthetic IndexedDB access denied','SecurityError');return open.apply(this,arguments);};
  IDBObjectStore.prototype.put=function(){window.__putCalls++;if(kind==='initial-quota')throw new DOMException('Synthetic initial quota','QuotaExceededError');return put.apply(this,arguments);};
  if(kind==='legacy-read-denied')Storage.prototype.getItem=function(keyName){if(keyName===key)throw new DOMException('Synthetic localStorage access denied','SecurityError');return window.__originalGetItem.apply(this,arguments);};
 },{kind,sourceRaw,key:KEY});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',failure=>errors.push(failure.message));
 await page.goto(url);
 await page.locator('.time-row').first().waitFor();
 return {context,page,errors};
}
async function actualRaw(page){return page.evaluate(key=>window.__originalGetItem.call(localStorage,key),KEY);}
async function readState(page){return page.evaluate(async()=>{const store=await ParisStore.open();try{return await store.read();}finally{store.close();}});}
async function verifyReadonly(page){
 await page.locator('.activity-open').first().click();
 assert.equal(await page.locator('#activity-note').isDisabled(),true);
 await page.locator('#activity-detail-close').click();
 await page.locator('.nav-item[data-tab="todo"]').click();
 assert.equal(await page.locator('#main-content [data-action="task-add"]').isDisabled(),true);
 const checkboxes=page.locator('#main-content [data-complete]');
 assert.ok(await checkboxes.count()>0);
 for(let i=0;i<await checkboxes.count();i++)assert.equal(await checkboxes.nth(i).isDisabled(),true);
}
async function exportedRaw(page){
 await page.locator('.nav-item[data-tab="more"]').click();
 const pending=page.waitForEvent('download');
 await page.locator('[data-action="legacy-live-export"]').click();
 const download=await pending;
 assert.equal(download.suggestedFilename(),'paris-pocket-legacy-original.json');
 return fs.readFile(await download.path(),'utf8');
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 try{
  {
   const {context,page,errors}=await newPage(browser,'legacy-read-denied');
   await page.locator('#storage-warning').waitFor({state:'visible'});
   assert.match(await page.locator('#storage-warning').textContent(),/读取失败|读取失败当作空资料/);
   assert.equal(await page.evaluate(()=>window.__openCalls),0);assert.equal(await page.evaluate(()=>window.__putCalls),0);
   assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);
   assert.equal(await actualRaw(page),raw);await verifyReadonly(page);
   assert.deepEqual(errors,[]);await context.close();
   console.log('PASS localStorage read failure never initializes an empty IDB record; official itinerary is read-only and original raw remains untouched');
  }
  for(const kind of ['open-denied','initial-quota']){
   const {context,page,errors}=await newPage(browser,kind);
   await page.locator('#storage-warning').waitFor({state:'visible'});
   assert.match(await page.locator('#storage-warning').textContent(),/个人存储暂不可用|暂停保存/);
   await verifyReadonly(page);
   assert.equal(await actualRaw(page),raw);assert.equal(await exportedRaw(page),raw);
   if(kind==='initial-quota'){
    assert.ok(await page.evaluate(()=>window.__putCalls)>0);
    const records=await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(ParisStore.DB_NAME);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});try{return await new Promise((resolve,reject)=>{const request=db.transaction('records','readonly').objectStore('records').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}});
    assert.deepEqual(records,[]);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS IDB access and initial quota failure leave a read-only official app; exact legacy raw download works without a usable personal database');
  {
   const badRaw='{broken synthetic legacy JSON\n保留损坏原文';
   const {context,page,errors}=await newPage(browser,'normal',badRaw);
   await page.locator('#storage-warning').waitFor({state:'visible'});
   assert.match(await page.locator('#storage-warning').textContent(),/旧资料无法完整验证|个人写入暂时暂停/);
   const before=await readState(page);assert.equal(before.migrationBlocked,true);assert.equal(before.personal.legacyArchive[0].sourceRaw,badRaw);
   await verifyReadonly(page);assert.equal(await exportedRaw(page),badRaw);
   assert.equal(await actualRaw(page),badRaw);
   await page.locator('.nav-item[data-tab="days"]').click();await page.locator('.activity-open').first().click();
   // A future detail action must also fail safely even if the dialog offers a disabled-state shortcut.
   const detailAdd=page.locator('#activity-detail-dialog [data-action="task-add"]');
   if(!await detailAdd.isDisabled()){
    await detailAdd.click();await page.locator('#task-name').fill('不应保存的模拟任务');
    await page.locator('#task-form [type="submit"]').click();
    await page.locator('#task-error').filter({hasText:/暂不能保存|暂时暂停|需要恢复/}).waitFor();
    assert.equal(await page.locator('#task-dialog').evaluate(el=>el.open),true);
    assert.equal(await page.locator('#task-name').inputValue(),'不应保存的模拟任务');
   }
   const after=await readState(page);assert.deepEqual(after.personal,before.personal);
   assert.ok(!/任务已保存|已保存到此设备/.test(await page.locator('#toast').textContent()));
   assert.deepEqual(errors,[]);await context.close();
   console.log('PASS invalid legacy raw stays exportable; notes, completion and local task writes are blocked without claiming success');
  }
  {
   const {context,page,errors}=await newPage(browser,'normal');
   await page.locator('.activity-open').first().click();
   const id=await page.locator('#activity-note').getAttribute('data-note-id');
   const before=await readState(page);assert.equal(before.migrationBlocked,false);
   await page.evaluate(()=>{
    window.__putBeforeQuota=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value,key){if(this.name==='records'&&key==='personal')throw new DOMException('Synthetic note quota','QuotaExceededError');return window.__putBeforeQuota.apply(this,arguments);};
   });
   const draft='写入失败仍需保留的模拟草稿\n<script>只作为文本</script>';
   await page.locator('#activity-note').fill(draft);
   await page.locator('#note-status').filter({hasText:/未保存，草稿仍保留/}).waitFor();
   assert.equal(await page.locator('#activity-note').inputValue(),draft);
   assert.equal(await page.locator('#note-retry').isVisible(),true);
   assert.ok(!/已保存到此设备/.test(await page.locator('#note-status').textContent()));
   assert.deepEqual((await readState(page)).personal,before.personal);assert.equal(await actualRaw(page),raw);
   await page.locator('#activity-detail-close').click();await page.locator('.nav-item[data-tab="more"]').click();
   await page.locator('[data-action="draft-export"]').waitFor();
   const downloadPending=page.waitForEvent('download');await page.locator('[data-action="draft-export"]').click();
   const download=await downloadPending,payload=JSON.parse(await fs.readFile(await download.path(),'utf8'));
   assert.deepEqual(payload,{kind:'unsaved-drafts',activityNotes:{[id]:draft}});
   await page.locator('.nav-item[data-tab="days"]').click();await page.locator(`.activity-open[data-id="${id}"]`).click();
   assert.equal(await page.locator('#activity-note').inputValue(),draft);assert.match(await page.locator('#note-status').textContent(),/未保存草稿/);
   await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__putBeforeQuota;});
   await page.locator('#note-retry').click();
   await page.locator('#note-status').filter({hasText:'已保存到此设备'}).waitFor();
   assert.equal((await readState(page)).personal.notesByActivityId[id],draft);assert.equal(await actualRaw(page),raw);
   assert.deepEqual(errors,[]);await context.close();
   console.log('PASS note quota failure retains textarea and exportable draft across views; no saved message appears until an actual successful retry');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
