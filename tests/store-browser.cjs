/* Isolated origin and fresh browser context: never reads a traveller's production records. */
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const Official=require('../official-data.js');
const project=path.resolve(__dirname,'..');
const clone=value=>JSON.parse(JSON.stringify(value));
let activeManifest,releases=new Map(),breakSnapshot=false,manifestOffline=false,heldSnapshot=null;
const harness='<!doctype html><meta charset="utf-8"><title>Isolated store tests</title>'+['personal-data.js','itinerary-data.js','trip-data.js','official-data.js','local-store.js'].map(file=>`<script src="/${file}"></script>`).join('');
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end(harness);return;}
 if(pathname==='/trip/manifest.json'){res.writeHead(manifestOffline?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(activeManifest));return;}
 if(releases.has(pathname)){if(heldSnapshot){const hold=heldSnapshot;heldSnapshot=null;hold.enter();await hold.wait;}res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(releases.get(pathname)+(breakSnapshot?' ':''));return;}
 if(/^\/(personal-data|itinerary-data|trip-data|official-data|local-store)\.js$/.test(pathname)){
  try{res.writeHead(200,{'Content-Type':'application/javascript'}).end(await fs.readFile(path.join(project,pathname.slice(1))));}catch{res.writeHead(404).end();}return;
 }
 res.writeHead(404).end();
});
async function release(source,sequence){
 const data=clone(source);data.releaseSequence=sequence;data.tripDataVersion=`4.12.${sequence}`;
 data.segments.forEach(segment=>segment.routeDataVersion=data.tripDataVersion);
 const text=JSON.stringify(data),sha256=await Official.digest(text);
 const manifest={schemaVersion:1,tripId:'paris-2026',tripDataVersion:data.tripDataVersion,releaseSequence:sequence,snapshotUrl:`./trip/releases/${sha256}.json`,sha256,byteLength:Buffer.byteLength(text)};
 releases.set('/trip/releases/'+sha256+'.json',text);return {data,manifest};
}
async function reset(page,bootstrap,raw){
 return page.evaluate(async({bootstrap,raw})=>{
  window.store?.close();window.otherStore?.close();
  await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(ParisStore.DB_NAME);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('test reset blocked'));});
  if(raw===null)localStorage.removeItem(ParisPersonal.KEY);else localStorage.setItem(ParisPersonal.KEY,raw);
  window.store=await ParisStore.open();return store.initialize(bootstrap,raw);
 },{bootstrap,raw});
}
(async()=>{
 const source=JSON.parse(await fs.readFile(path.join(project,'trip/source-v4.12.json'),'utf8'));
 const v1=await release(source,1);activeManifest=v1.manifest;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',failure=>errors.push(failure.message));
  const url=`http://localhost:${server.address().port}/`;
  await page.goto(url);
  const legacy={schemaVersion:3,booked:['louvre','unknown'],dayNotes:{'2026-12-09':'旧每日备注'},bookingNotes:{louvre:'旧预约备注'},hotelNote:'旧酒店备注',flightNote:'旧航班备注',miscNote:'旧通用备注',activityOverrides:{'d3-1':{time:'09:45',end:'',detail:'旧编辑描述',unknownNested:{retain:true}}},customActivities:{'user-test':{id:'user-test',title:'旧自建活动',time:'晚上',end:'',date:'2026-12-10',detail:'自建描述',type:'生活'}},activityOrder:{'2026-12-10':['user-test']},deletedActivityIds:['d1-1'],unknownNested:{list:[1,false,{keep:'完整原文'}]}};
  const raw=JSON.stringify(legacy,null,2);
  let state=await reset(page,v1,raw);
  assert.equal(state.migrationBlocked,false);assert.equal(state.personal.legacyArchive.length,1);
  assert.equal(state.personal.legacyArchive[0].sourceRaw,raw);assert.deepEqual(state.personal.legacyArchive[0].data,legacy);
  assert.deepEqual(state.personal.notesByActivityId,{});assert.deepEqual(state.personal.completionByTaskId,{});
  assert.equal(await page.evaluate(()=>localStorage.getItem(ParisPersonal.KEY)),raw);
  assert.ok(state.personal.legacyCanonicalContext.days.length===8);
  state=await page.evaluate(async bootstrap=>store.initialize(bootstrap,localStorage.getItem(ParisPersonal.KEY)),v1);
  assert.equal(state.personal.legacyArchive.length,1);assert.equal(state.personal.revision,0);
  await page.reload();
  state=await page.evaluate(async bootstrap=>{window.store=await ParisStore.open();return store.initialize(bootstrap,localStorage.getItem(ParisPersonal.KEY));},v1);
  assert.equal(state.personal.legacyArchive.length,1);
  console.log('PASS exact legacy raw/context/unknown fields survive IDB reload and idempotent initialization; old key unchanged');

  const activityId=v1.data.activities[0].id,taskId=v1.data.tasks[0].id;
  state=await page.evaluate(async({activityId,taskId})=>{const s=await store.read();return store.changePersonal(s.personal.revision,p=>{p.notesByActivityId[activityId]='新版备注 <script>纯文字</script>';p.completionByTaskId[taskId]=true;p.unknownPrivate={keep:['保留']};p.localTasks['local-example']={id:'local-example',title:'本机任务',priority:'high',dueDate:'2026-12-01',url:'https://example.com/',note:'本地备注',activityId:null,dayId:null,createdAt:'2026-11-09T10:00:00Z',updatedAt:'2026-11-09T10:00:00Z'};});},{activityId,taskId});
  const revision=state.personal.revision;
  const race=await page.evaluate(async revision=>{window.otherStore=await ParisStore.open();return Promise.all([store.changePersonal(revision,p=>{p.notesByActivityId['activity-orphan']='保留孤立备注';}).then(()=>({ok:true})).catch(e=>({code:e.code})),otherStore.changePersonal(revision,p=>{p.notesByActivityId['activity-racer']='第二个窗口';}).then(()=>({ok:true})).catch(e=>({code:e.code}))]);},revision);
  assert.equal(race.filter(result=>result.ok).length,1);assert.equal(race.filter(result=>result.code==='STORAGE_CONFLICT').length,1);
  const beforeFailure=await page.evaluate(()=>store.read());
  const failed=await page.evaluate(async()=>{const before=await store.read();try{await store.changePersonal(before.personal.revision,p=>{p.notesByActivityId={oops:'未提交'};throw new Error('intentional transaction interruption');});return false;}catch{return JSON.stringify((await store.read()).personal)===JSON.stringify(before.personal);}});
  assert.equal(failed,true);
  const quota=await page.evaluate(async()=>{const before=await store.read(),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic quota','QuotaExceededError');};try{await store.changePersonal(before.personal.revision,p=>{p.notesByActivityId['activity-quota']='不能假装保存';});return {saved:true};}catch(e){return {saved:false,name:e.name};}finally{IDBObjectStore.prototype.put=put;}});
  assert.deepEqual(quota,{saved:false,name:'QuotaExceededError'});
  assert.deepEqual((await page.evaluate(()=>store.read())).personal,beforeFailure.personal);
  console.log('PASS same-transaction revision conflict, interruption and quota failures preserve all personal records');

  const laterRaw=JSON.stringify({...legacy,miscNote:'旧版窗口后来保存',unknownLate:{preserve:true}});
  const oldTab=await context.newPage();await oldTab.goto(url);
  await oldTab.evaluate(raw=>localStorage.setItem(ParisPersonal.KEY,raw),laterRaw);
  state=await page.evaluate(()=>store.captureLegacy(localStorage.getItem(ParisPersonal.KEY)));
  assert.equal(state.personal.legacyArchive.length,2);assert.equal(state.personal.legacyArchive[1].sourceRaw,laterRaw);
  assert.equal(state.personal.notesByActivityId[activityId],beforeFailure.personal.notesByActivityId[activityId]);
  assert.deepEqual(state.personal.localTasks,beforeFailure.personal.localTasks);
  assert.equal((await page.evaluate(()=>store.captureLegacy(localStorage.getItem(ParisPersonal.KEY)))).personal.legacyArchive.length,2);
  await oldTab.close();
  console.log('PASS old-tab writes become independent recovery candidates without overwriting new notes/tasks');

  const backup=await page.evaluate(()=>store.backup());
  const imported=clone(backup);imported.personal.notesByActivityId={[activityId]:'从新版备份恢复'};imported.personal.legacyArchive=[];imported.personal.legacySourceHashes=[];
  const preview=await page.evaluate(payload=>ParisStore.inspectBackup(payload),imported);assert.equal(preview.kind,'v2');assert.equal(preview.counts.notes,1);
  state=await page.evaluate(async payload=>{const state=await store.read();return store.restoreBackup(payload,state.personal.revision);},imported);
  assert.equal(state.personal.notesByActivityId[activityId],'从新版备份恢复');assert.equal(state.personal.legacyArchive.length,2);assert.equal(state.importUndoAvailable,true);
  state=await page.evaluate(async()=>{const state=await store.read();return store.undoImport(state.personal.revision);});
  assert.deepEqual(state.personal.notesByActivityId,backup.personal.notesByActivityId);assert.equal(state.importUndoAvailable,false);
  const oldBackup={_format:'paris-pocket-backup-v1',_date:'2026-11-09',_tripVersion:'old',...legacy,miscNote:'导入的旧备份'};
  state=await page.evaluate(async payload=>{const state=await store.read();return store.restoreBackup(payload,state.personal.revision);},oldBackup);
  assert.deepEqual(state.personal.notesByActivityId,backup.personal.notesByActivityId);assert.equal(state.personal.legacyArchive.length,3);assert.deepEqual(state.personal.legacyArchive[2].data,oldBackup);
  const undoConflict=await page.evaluate(async()=>{let state=await store.read();state=await store.changePersonal(state.personal.revision,p=>{p.notesByActivityId['activity-later']='导入之后的新输入';});try{await store.undoImport(state.personal.revision);return '';}catch(e){return e.code;}});
  assert.equal(undoConflict,'IMPORT_UNDO_CONFLICT');
  const beforeInvalid=await page.evaluate(()=>store.read());
  const invalidBackup=clone(backup);invalidBackup.personal.localTasks['local-example'].url='javascript:alert(1)';
  assert.equal(await page.evaluate(async payload=>{const before=await store.read();try{await store.restoreBackup(payload,before.personal.revision);return false;}catch{return JSON.stringify((await store.read()).personal)===JSON.stringify(before.personal);}},invalidBackup),true);
  assert.deepEqual((await page.evaluate(()=>store.read())).personal,beforeInvalid.personal);
  console.log('PASS v2 preview/replace/checkpoint/undo, v1 archive-only import, all legacy preservation and later-edit undo guard');

  const v2source=clone(source);v2source.tasks[0].status='archived';v2source.tasks[0].archiveReason='测试：官方显式归档，不代表已完成';
  const retiredActivity=v2source.activities.find(activity=>!activity.conditionGroupId&&!v2source.tasks.some(task=>task.activityId===activity.id));
  const retiredStops=new Set(v2source.stops.filter(stop=>stop.activityId===retiredActivity.id).map(stop=>stop.id));
  v2source.activities=v2source.activities.filter(activity=>activity.id!==retiredActivity.id);
  v2source.stops=v2source.stops.filter(stop=>!retiredStops.has(stop.id));
  v2source.segments=v2source.segments.filter(segment=>!retiredStops.has(segment.fromStopId)&&!retiredStops.has(segment.toStopId));
  v2source.retiredActivityIds.push(retiredActivity.id);
  await page.evaluate(async id=>{const state=await store.read();return store.changePersonal(state.personal.revision,p=>{p.notesByActivityId[id]='活动退役后保留备注及原活动名称';});},retiredActivity.id);
  const v2=await release(v2source,2);activeManifest=v2.manifest;
  const beforeSync=await page.evaluate(()=>store.read());
  state=await page.evaluate(()=>store.sync());
  assert.equal(state.official.manifest.releaseSequence,2);assert.equal(state.previousAvailable,true);
  assert.deepEqual(state.personal.notesByActivityId,beforeSync.personal.notesByActivityId);assert.deepEqual(state.personal.completionByTaskId,beforeSync.personal.completionByTaskId);
  assert.deepEqual(state.personal.localTasks,beforeSync.personal.localTasks);assert.equal(state.personal.archivedSnapshots[taskId].task.status,'archived');
  assert.equal(state.personal.archivedSnapshots[retiredActivity.id].activity.title,retiredActivity.title);assert.equal(state.personal.archivedSnapshots[retiredActivity.id].tripDataVersion,v1.data.tripDataVersion);
  assert.equal(state.personal.notesByActivityId[retiredActivity.id],'活动退役后保留备注及原活动名称');
  const afterSync=clone(state);
  state=await page.evaluate(()=>store.rollback());
  assert.equal(state.official.manifest.releaseSequence,1);assert.equal(state.official.rollbackPin.sha256,v2.manifest.sha256);assert.equal(state.previousAvailable,false);
  assert.deepEqual(state.personal,afterSync.personal);
  assert.equal(await page.evaluate(async()=>{try{await store.sync();return '';}catch(e){return e.code;}}),'ROLLBACK_PINNED');
  state=await page.evaluate(()=>store.sync({force:true}));assert.equal(state.official.manifest.releaseSequence,2);assert.equal(state.official.rollbackPin,undefined);
  await page.evaluate(()=>store.rollback());
  const v3=await release(v2source,3);activeManifest=v3.manifest;
  state=await page.evaluate(()=>store.sync());assert.equal(state.official.manifest.releaseSequence,3);assert.equal(state.official.rollbackPin,undefined);
  console.log('PASS hash-verified atomic sync, explicit archive, previous release rollback, quarantine pin and higher-sequence repair');

  const v4=await release(v2source,4);activeManifest=v4.manifest;
  let enter,releaseHeld;const entered=new Promise(resolve=>{enter=resolve;}),wait=new Promise(resolve=>{releaseHeld=resolve;});heldSnapshot={enter,wait};
  await page.evaluate(()=>{window.pendingSync=store.sync().then(state=>({state}),failure=>({code:failure.code,message:failure.message}));});
  await entered;
  await page.evaluate(async()=>{const state=await store.read();return store.changePersonal(state.personal.revision,p=>{p.notesByActivityId['activity-during-sync']='下载期间的新备注不能被同步覆盖';});});
  releaseHeld();state=(await page.evaluate(()=>pendingSync)).state;
  assert.equal(state.official.manifest.releaseSequence,4);assert.equal(state.personal.notesByActivityId['activity-during-sync'],'下载期间的新备注不能被同步覆盖');
  const v5=await release(v2source,5);activeManifest=v5.manifest;
  const enteredRollback=new Promise(resolve=>{enter=resolve;}),waitRollback=new Promise(resolve=>{releaseHeld=resolve;});heldSnapshot={enter,wait:waitRollback};
  await page.evaluate(()=>{window.pendingSync=store.sync().then(state=>({state}),failure=>({code:failure.code,message:failure.message}));});
  await enteredRollback;
  await page.evaluate(()=>store.rollback());releaseHeld();
  assert.equal((await page.evaluate(()=>pendingSync)).code,'STORAGE_CONFLICT');
  state=await page.evaluate(()=>store.read());assert.equal(state.official.manifest.releaseSequence,3);
  state=await page.evaluate(()=>store.sync());assert.equal(state.official.manifest.releaseSequence,5);
  console.log('PASS edits committed during download survive sync; concurrent rollback rejects an obsolete in-flight installation');

  const safeState=await page.evaluate(()=>store.read());
  const assertUnchanged=async operation=>{
   assert.equal(await page.evaluate(async operation=>{try{await store[operation]();return false;}catch{return true;}},operation),true);
   assert.deepEqual(await page.evaluate(()=>store.read()),safeState);
  };
  await context.setOffline(true);await assertUnchanged('sync');await context.setOffline(false);
  const v6=await release(v2source,6);activeManifest=v6.manifest;breakSnapshot=true;await assertUnchanged('sync');breakSnapshot=false;
  activeManifest={...v6.manifest,snapshotUrl:'https://other.example/unsafe.json'};await assertUnchanged('sync');
  activeManifest={...v6.manifest,schemaVersion:2};await assertUnchanged('sync');
  activeManifest=v1.manifest;await assertUnchanged('sync');
  const missing=clone(v2source),missingId=missing.tasks[1].id;missing.tasks=missing.tasks.filter(task=>task.id!==missingId);missing.activities.forEach(activity=>{activity.taskIds=activity.taskIds.filter(id=>id!==missingId);});
  const missingRelease=await release(missing,7);activeManifest=missingRelease.manifest;await assertUnchanged('sync');
  manifestOffline=true;await assertUnchanged('sync');manifestOffline=false;
  assert.equal(await page.evaluate(()=>localStorage.getItem(ParisPersonal.KEY)),laterRaw);
  console.log('PASS offline, bad hash/size, unsafe URL, unsupported schema, stale release and missing-known-task failures leave all records and timestamps unchanged');

  // A failed second migration transaction leaves a recoverable pending record, not a ready flag.
  await page.evaluate(()=>otherStore.close());
  await context.setOffline(true);state=await reset(page,v1,null);assert.equal(state.migrationBlocked,false);await context.setOffline(false);
  await page.evaluate(async()=>{store.close();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(ParisStore.DB_NAME);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});window.store=await ParisStore.open();});
  const interrupted=await page.evaluate(async({v1,raw})=>{
   localStorage.setItem(ParisPersonal.KEY,raw);const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,key){if(key==='personal'&&value.migrationStatus==='ready')throw new DOMException('Synthetic interrupted ready commit','QuotaExceededError');return put.apply(this,arguments);};
   try{await store.initialize(v1,raw);return {saved:true};}catch(e){return {saved:false,state:await store.read()};}finally{IDBObjectStore.prototype.put=put;}
  },{v1,raw});
  assert.equal(interrupted.saved,false);assert.equal(interrupted.state.migrationBlocked,true);assert.equal(interrupted.state.personal.migrationStatus,'pending');assert.equal(interrupted.state.personal.legacyArchive.length,1);
  state=await page.evaluate(args=>store.initialize(args.v1,args.raw),{v1,raw});assert.equal(state.migrationBlocked,false);assert.equal(state.personal.legacyArchive.length,1);
  for(const badRaw of ['{bad',JSON.stringify({schemaVersion:0}),JSON.stringify({schemaVersion:99})]){
   state=await reset(page,v1,badRaw);assert.equal(state.migrationBlocked,true);assert.equal(state.personal.legacyArchive[0].sourceRaw,badRaw);assert.ok(state.personal.legacyArchive[0].error);
   assert.equal(await page.evaluate(async()=>{const before=await store.read();try{await store.changePersonal(before.personal.revision,p=>{p.notesByActivityId.a='blocked';});return '';}catch(e){return e.code;}}),'MIGRATION_BLOCKED');
   const exportBlocked=await page.evaluate(()=>store.backup());assert.equal(exportBlocked.personal.legacyArchive[0].sourceRaw,badRaw);
   assert.equal(await page.evaluate(()=>localStorage.getItem(ParisPersonal.KEY)),badRaw);
  }
  state=await page.evaluate(async payload=>{const state=await store.read();return store.restoreBackup(payload,state.personal.revision);},oldBackup);
  assert.equal(state.migrationBlocked,false);assert.equal(state.personal.legacyArchive.length,2);
  assert.equal(state.personal.legacyArchive[0].sourceRaw,JSON.stringify({schemaVersion:99}));
  assert.deepEqual(errors,[]);
  console.log('PASS interrupted migration resumes idempotently; invalid/future legacy raw stays exportable and blocks writes until explicit valid recovery');
  await context.close();
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
