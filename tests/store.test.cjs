const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
global.ParisPersonal=require('../personal-data.js');
global.ParisItinerary=require('../itinerary-data.js');
global.ParisOfficial=require('../official-data.js');
const store=require('../local-store.js');
const legacyContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../trip-data.js'),'utf8'),legacyContext);
const oldTrip=JSON.parse(JSON.stringify(legacyContext.window.PARIS_TRIP));
global.PARIS_TRIP=oldTrip;
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../trip/manifest.json'),'utf8'));
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'..',manifest.snapshotUrl),'utf8'));
const rawLegacy={booked:['louvre','unknown-booking','louvre'],dayNotes:{'2026-12-09':'每日原文','unknown-date':'孤立笔记'},bookingNotes:{louvre:'保留旧目标',unknown:'孤立预约'},hotelNote:'原酒店笔记',flightNote:'原航班笔记',miscNote:'原通用笔记',activityOverrides:{'d3-1':{time:'10:15',end:'11:15',detail:'旧描述',extraNested:{untouched:true}}},customActivities:{'user-test':{id:'user-test',title:'自建安排',date:'2026-12-10',time:'晚上',end:'',detail:'保留',type:'生活'}},activityOrder:{'2026-12-10':['user-test']},deletedActivityIds:['d1-1'],unknown:{nested:[false,'keep',{orphan:1}]}};
test('legacy schema absent/1/2/3 archive exact raw, unknown nested fields and old context without mapping completions',async()=>{
 for(const schemaVersion of [undefined,1,2,3]){
  const input={...rawLegacy,...(schemaVersion===undefined?{}:{schemaVersion})};
  const raw=JSON.stringify(input,null,2),entry=await store.archiveLegacy(raw,oldTrip);
  assert.equal(entry.error,undefined);
  assert.equal(entry.sourceRaw,raw);
  assert.deepEqual(entry.data,input);
  assert.equal(entry.sourceHash,await ParisOfficial.digest(raw));
  assert.equal(entry.sourceCanonicalHash,await ParisOfficial.digest(JSON.stringify(oldTrip)));
  const personal=store.blankPersonal();
  personal.legacyArchive=[entry];personal.legacySourceHashes=[entry.sourceHash];personal.legacySourceHash=entry.sourceHash;
  assert.deepEqual(store.validatePersonal(personal).completionByTaskId,{});
  assert.deepEqual(store.validatePersonal(personal).notesByActivityId,{});
 }
});
test('bad JSON, literal schema 0/future versions, invalid types and dates are recovery archives, never normalized success',async()=>{
 for(const raw of ['{bad','null',JSON.stringify({schemaVersion:0}),JSON.stringify({schemaVersion:4}),JSON.stringify({booked:'wrong'}),JSON.stringify({customActivities:{'user-test':{id:'user-test',date:'2027-01-01',time:'10:00',end:'',detail:'',title:'X',type:'生活'}}})]){
  const entry=await store.archiveLegacy(raw,oldTrip);
  assert.equal(entry.sourceRaw,raw);assert.ok(entry.error);assert.equal(entry.data,undefined);
  assert.equal(entry.sourceHash,await ParisOfficial.digest(raw));
 }
 await assert.rejects(store.archiveLegacy(undefined,oldTrip),{code:'LEGACY_UNREADABLE'});
 const absent=await store.archiveLegacy(null,oldTrip);assert.equal(absent.sourceRaw,null);assert.equal(absent.error,undefined);
});
test('personal validation retains orphan notes/tasks/completions and unknown fields, rejects unsafe fields and task links',()=>{
 const personal=store.blankPersonal();personal.migrationStatus='ready';
 personal.notesByActivityId={'activity-retired':'仍可恢复'};personal.completionByTaskId={'task-retired':true};
 personal.unknown={nested:['retained']};
 personal.localTasks['local-example']={id:'local-example',title:'测试',priority:'medium',dueDate:null,url:'https://example.com/',note:'备注',activityId:null,dayId:null,createdAt:'2026-11-09T10:00:00Z',updatedAt:'2026-11-09T10:00:00Z'};
 assert.deepEqual(store.validatePersonal(personal),personal);
 for(const key of ['__proto__','prototype','constructor'])assert.throws(()=>store.validatePersonal(JSON.parse(JSON.stringify(personal).replace('"nested"',JSON.stringify(key)))));
 assert.throws(()=>store.validatePersonal({...personal,notesByActivityId:{a:4}}));
 assert.throws(()=>store.validatePersonal({...personal,completionByTaskId:{a:'yes'}}));
 assert.throws(()=>store.validatePersonal({...personal,localTasks:{'local-example':{...personal.localTasks['local-example'],url:'javascript:alert(1)'}}}));
 assert.throws(()=>store.validatePersonal({...personal,schemaVersion:5}));
});
test('official bootstrap checks exact hash, byte length, schema, version and publication sequence before use',async()=>{
 const text=fs.readFileSync(path.join(__dirname,'../trip/releases',path.basename(manifest.snapshotUrl)),'utf8');
 const envelope=await store.checkEnvelope({data,manifest});assert.equal(envelope.manifest.sha256,manifest.sha256);
 assert.deepEqual(envelope.data,ParisOfficial.validate(data));assert.equal(text,JSON.stringify(data));
 for(const bad of [{...manifest,byteLength:1},{...manifest,sha256:'a'.repeat(64),snapshotUrl:'./trip/releases/'+'a'.repeat(64)+'.json'},{...manifest,schemaVersion:2},{...manifest,releaseSequence:99},{...manifest,tripDataVersion:'wrong'},{...manifest,snapshotUrl:'https://other.example/trip.json'}])await assert.rejects(store.checkEnvelope({data,manifest:bad}));
 await assert.rejects(store.checkEnvelope({data:{...data,schemaVersion:2},manifest}));
 await assert.rejects(store.checkEnvelope({data,manifest,text:text+'\n'}));
});
test('backup preview validates without storage and never treats old detail/booked as new notes or completion',async()=>{
 const oldPayload={_format:'paris-pocket-backup-v1',_date:'2026-11-09',_tripVersion:'old',...rawLegacy};
 const old=await store.inspectBackup(oldPayload);
 assert.equal(old.kind,'v1');assert.deepEqual(old.legacy.data,oldPayload);assert.equal(old.personal,undefined);
 const personal=store.blankPersonal();personal.migrationStatus='ready';personal.notesByActivityId={'activity-test':'新备注'};
 const next={_format:'paris-pocket-backup-v2',schemaVersion:4,tripId:'paris-2026',personal};
 const preview=await store.inspectBackup(next);assert.equal(preview.kind,'v2');assert.equal(preview.counts.notes,1);assert.deepEqual(preview.personal,personal);
 for(const bad of [{...next,schemaVersion:5},{...next,tripId:'other'},{...next,personal:{...personal,schemaVersion:5}},{_format:'paris-pocket-backup-v1',schemaVersion:0}])await assert.rejects(store.inspectBackup(bad));
 const entry=await store.archiveLegacy(JSON.stringify(rawLegacy),oldTrip);entry.sourceRaw+=' ';
 await assert.rejects(store.inspectBackup({...next,personal:{...personal,legacyArchive:[entry]}}),{code:'INTEGRITY_ERROR'});
});
