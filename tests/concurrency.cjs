/* Real integrated UI, two fresh tabs sharing an isolated browser profile. No traveller data. */
'use strict';
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const origin=process.env.TEST_URL||'http://localhost:4178/';
const activityId='act-orangerie-visit';
const nav=(page,tab)=>page.locator(`.bottom-nav [data-tab="${tab}"]`).click();
async function state(page){return page.evaluate(async()=>{const s=await ParisStore.open();try{return await s.read();}finally{s.close();}});}
async function ready(page){
 await page.goto(origin);await page.locator('.time-row').first().waitFor();
 await nav(page,'more');await page.waitForFunction(()=>/已检查|同步未完成/.test(document.getElementById('sync-status')?.textContent||''));
 await nav(page,'days');
}
async function openNote(page){await nav(page,'days');await page.locator(`[data-action="detail"][data-id="${activityId}"]`).click();}
async function visibleRead(page){
 // Deterministically exercise the visibility-return path without relying on headless window focus.
 await page.evaluate(async()=>{
  const probe=await ParisStore.open(),proto=Object.getPrototypeOf(probe),capture=proto.captureLegacy;
  window.__captureCompleted=0;
  proto.captureLegacy=async function(...args){const result=await capture.apply(this,args);window.__captureCompleted++;return result;};
  probe.close();Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await page.waitForFunction(()=>window.__captureCompleted>0);
}
async function saveTask(page,title){
 await page.locator('#task-name').fill(title);await page.locator('#task-form [type="submit"]').click();
 await page.waitForFunction(()=>!document.getElementById('task-dialog').open);
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 const errors=[];
 try{
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  const first=await context.newPage(),second=await context.newPage();
  for(const page of [first,second]){page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.dismiss());}
  await ready(first);await ready(second);
  await openNote(first);assert.equal(await first.locator('#activity-note').inputValue(),'');
  await openNote(second);await second.locator('#activity-note').fill('合成：另一窗口的最新备注');
  await second.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('已保存到此设备'));
  await visibleRead(first); // Updates global state/revision while the original note DOM stays open.
  const draft='合成：旧窗口尚未保存的草稿';await first.locator('#activity-note').fill(draft);
  await first.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('未保存'));
  assert.equal((await state(second)).personal.notesByActivityId[activityId],'合成：另一窗口的最新备注');
  assert.equal(await first.locator('#activity-note').inputValue(),draft,'failed CAS retains exact draft');
  await first.locator('#activity-detail-close').click();await nav(first,'more');
  assert.match(await first.locator('#main-content').innerText(),/1 项草稿尚未保存/);
  let downloads=0,choosers=0;first.on('download',()=>downloads++);first.on('filechooser',()=>choosers++);
  await first.locator('[data-action="backup"]').click();
  await first.waitForFunction(()=>document.getElementById('toast').textContent.includes('完整备份未导出'));
  assert.equal(downloads,0,'complete backup must not silently exclude unsaved drafts');
  await first.locator('[data-action="import"]').click();
  await first.waitForFunction(()=>document.getElementById('toast').textContent.includes('再导入备份'));
  assert.equal(choosers,0,'import entry stays blocked while a failed draft exists');
  const backup=await second.evaluate(async()=>{const s=await ParisStore.open();try{return await s.backup();}finally{s.close();}});
  backup.personal.notesByActivityId[activityId]='合成：不应被导入的备注';
  await first.locator('#backup-file').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await first.waitForFunction(()=>document.getElementById('toast').textContent.includes('备份未导入'));
  assert.equal(await first.locator('#backup-dialog').evaluate(el=>el.open),false,'direct file selection cannot bypass draft guard');
  assert.equal((await state(second)).personal.notesByActivityId[activityId],'合成：另一窗口的最新备注');
  const draftDownload=first.waitForEvent('download');await first.locator('[data-action="draft-export"]').click();
  const exported=JSON.parse(await fs.readFile(await (await draftDownload).path(),'utf8'));
  assert.equal(exported.activityNotes[activityId],draft,'separate draft export contains failed input');
  // A manual same-release sync can refresh global state, but must not advance the edit session's CAS.
  await first.locator('[data-action="sync"]').click();
  await first.waitForFunction(()=>/已检查|同步未完成/.test(document.getElementById('sync-status')?.textContent||''));
  await openNote(first);assert.equal(await first.locator('#activity-note').inputValue(),draft);
  await first.locator('#activity-note').fill(draft+'（同步后）');
  await first.waitForFunction(()=>document.getElementById('note-status')?.textContent.includes('未保存'));
  assert.equal((await state(second)).personal.notesByActivityId[activityId],'合成：另一窗口的最新备注');
  assert.equal(await first.locator('#activity-note').inputValue(),draft+'（同步后）');
  console.log('PASS two-tab note conflict after visibility/manual sync, exact draft retention, blocked complete backup/import and separate draft export');
  await context.close();

  const tasks=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1});
  const a=await tasks.newPage(),b=await tasks.newPage();
  for(const page of [a,b]){page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.dismiss());}
  await ready(a);await nav(a,'todo');await a.locator('#main-content [data-action="task-add"]').click();await saveTask(a,'合成：任务初始内容');
  const row=a.locator('.task-row').filter({has:a.locator('h3',{hasText:'合成：任务初始内容'})});
  const taskId=await row.getAttribute('data-task-id');assert.ok(taskId.startsWith('local-'));
  await ready(b);await nav(b,'todo');
  await row.locator('[data-action="task-edit"]').click();await a.locator('#task-name').fill('合成：旧窗口的任务修改');
  await b.locator(`[data-task-id="${taskId}"] [data-action="task-edit"]`).click();await saveTask(b,'合成：另一窗口的新任务内容');
  await visibleRead(a);await a.locator('#task-form [type="submit"]').click();
  await a.waitForFunction(()=>document.getElementById('task-error').textContent.includes('另一窗口'));
  assert.equal(await a.locator('#task-dialog').evaluate(el=>el.open),true);
  assert.equal(await a.locator('#task-name').inputValue(),'合成：旧窗口的任务修改');
  assert.equal((await state(b)).personal.localTasks[taskId].title,'合成：另一窗口的新任务内容');
  console.log('PASS stale task edit stays open with input preserved and cannot overwrite another tab after visibility refresh');
  await tasks.close();assert.deepEqual(errors,[]);console.log('PASS zero uncaught page errors; isolated profiles only');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
