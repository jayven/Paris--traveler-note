'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Official=require('../official-data.js');
const root=path.join(__dirname,'..');
const source=()=>JSON.parse(fs.readFileSync(path.join(root,'trip/source-v4.12.json'),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
test('v4.12 covers eight days, source-confirmed hotels, all luggage returns and unresolved reservations',()=>{
 const s=Official.validate(source());assert.equal(s.days.length,8);assert.equal(s.hotels.length,5);assert.deepEqual(s.hotels.flatMap(h=>h.nights).sort(),['2026-12-07','2026-12-08','2026-12-09','2026-12-10','2026-12-11','2026-12-12','2026-12-13']);
 const wed=s.days.find(d=>d.date==='2026-12-09'),wedActs=s.activities.filter(a=>a.dayId===wed.id);assert.equal(wedActs.some(a=>a.title.includes('卢浮宫')),false);
 const ghpr=s.stops.filter(stop=>stop.dayId===wed.id&&stop.placeId==='place-ghpr');assert.equal(ghpr.length,2);assert.notEqual(ghpr[0].id,ghpr[1].id);
 for(const id of ['act-cruise-preferred','act-cruise-backup','act-louvre-private-guide','act-eiffel-photos','act-orsay-lunch','act-eurostar-return'])assert.equal(s.activities.find(a=>a.id===id).reservationStatus,'unconfirmed');
 assert.equal(s.conditionGroups[0].maxOccurrences,1);assert.equal(s.activities.find(a=>a.id==='act-cruise-preferred').placeIds.length,0);assert.ok(s.tasks.every(t=>t.dueDate===null));assert.ok(s.activities.every(a=>!/^d\d+-\d+$/.test(a.id)));
 const result=Official.validate(s);result.trip.title='changed';assert.notEqual(s.trip.title,result.trip.title);
});
test('explicit official order survives nonnumeric and conflicting source time labels',()=>{const s=source(),louvre=s.activities.filter(a=>a.dayId==='day-louvre');assert.ok(louvre.some(a=>a.timeLabel.includes('时段待确认')));const i=s.activities.find(a=>a.id==='act-louvre-private-guide');i.timeLabel='08:00';assert.equal(Official.validate(s).activities.find(a=>a.id===i.id).order,i.order);});
test('malformed IDs, duplicate daily order, references and trip dates cannot publish',()=>{
 const mutations=[s=>s.activities[0].id='d1-1',s=>s.activities[1].order=s.activities[0].order,s=>s.activities[0].placeIds=['place-no-such'],s=>s.days[0].date='2026-12-08',s=>s.trip.timezone='UTC',s=>s.stops[0].dayId='day-other',s=>s.segments[0].routeDataVersion='old',s=>s.tasks[0].url='javascript:alert(1)',s=>s.tasks[0].dueDate='2026-02-30'];
 for(const mutate of mutations){const s=source();mutate(s);assert.throws(()=>Official.validate(s));}
});
test('task disappearance is rejected; explicit archive and explicit activity retirement preserve identity',()=>{
 const old=source(),next=copy(old),removed=next.tasks.shift();for(const a of next.activities)a.taskIds=a.taskIds.filter(id=>id!==removed.id);assert.throws(()=>Official.validate(next,old),/显式归档/);
 next.tasks.push({...removed,status:'archived',archiveReason:'用户确认此目标已取消'});assert.equal(Official.validate(next,old).tasks.find(t=>t.id===removed.id).status,'archived');
 const prior=copy(old),candidate=copy(old),optional=candidate.activities.find(a=>a.id==='act-vivienne-optional');candidate.activities=candidate.activities.filter(a=>a.id!==optional.id);const removedStops=candidate.stops.filter(st=>st.activityId===optional.id).map(st=>st.id);candidate.stops=candidate.stops.filter(st=>st.activityId!==optional.id);candidate.segments=candidate.segments.filter(s=>!removedStops.includes(s.fromStopId)&&!removedStops.includes(s.toStopId));assert.throws(()=>Official.validate(candidate,prior),/显式退役/);candidate.retiredActivityIds.push(optional.id);assert.ok(Official.validate(candidate,prior));
});
test('archived task keeps its original activity association after explicit activity retirement',()=>{
 const old=source(),next=copy(old),id='act-orangerie-visit';next.activities=next.activities.filter(a=>a.id!==id);const stops=new Set(next.stops.filter(s=>s.activityId===id).map(s=>s.id));next.stops=next.stops.filter(s=>s.activityId!==id);next.segments=next.segments.filter(s=>!stops.has(s.fromStopId)&&!stops.has(s.toStopId));next.retiredActivityIds.push(id);const task=next.tasks.find(t=>t.id==='task-orangerie');task.status='archived';task.archiveReason='官方取消此活动，保留历史内容';assert.equal(Official.validate(next,old).tasks.find(t=>t.id===task.id).activityId,id);
 task.status='active';assert.throws(()=>Official.validate(next,old),/悬空/);
});
test('verified road geometry needs real route coordinates, verified endpoints, version and sources',()=>{
 const s=source(),segment=s.segments.find(x=>x.mode==='walking'),from=s.stops.find(x=>x.id===segment.fromStopId),to=s.stops.find(x=>x.id===segment.toStopId),a=s.places.find(x=>x.id===from.placeId),b=s.places.find(x=>x.id===to.placeId);
 Object.assign(a,{lat:48.86,lng:2.32,verifiedStatus:'verified'});Object.assign(b,{lat:48.861,lng:2.322,verifiedStatus:'verified'});Object.assign(segment,{verifiedStatus:'verified',geometry:{type:'LineString',coordinates:[[2.32,48.86],[2.321,48.8601],[2.322,48.861]]}});assert.ok(Official.validate(s));
 const variants=[v=>v.segments.find(x=>x.id===segment.id).geometry.coordinates.pop(),v=>v.segments.find(x=>x.id===segment.id).mode='rail',v=>v.segments.find(x=>x.id===segment.id).geometry.coordinates[1]=[181,91],v=>v.segments.find(x=>x.id===segment.id).sources=[],v=>v.places.find(x=>x.id===a.id).verifiedStatus='reference'];for(const mutate of variants){const v=copy(s);mutate(v);assert.throws(()=>Official.validate(v));}
});
test('manifest pins same-origin immutable bytes and bootstrap matches released hash',async()=>{
 const m=Official.manifest(JSON.parse(fs.readFileSync(path.join(root,'trip/manifest.json'),'utf8'))),text=fs.readFileSync(path.join(root,m.snapshotUrl),'utf8');assert.equal(await Official.digest(text),m.sha256);assert.equal(Buffer.byteLength(text),m.byteLength);assert.equal(JSON.parse(text).tripDataVersion,m.tripDataVersion);
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'trip/bootstrap.js'),'utf8'),ctx);assert.equal(await Official.digest(JSON.stringify(ctx.window.PARIS_BOOTSTRAP.data)),m.sha256);
 for(const mutate of [v=>v.snapshotUrl='https://evil.example/trip.json',v=>v.snapshotUrl='./trip/releases/../../notes.json',v=>v.byteLength=0,v=>v.sha256='bad']){const v=copy(m);mutate(v);assert.throws(()=>Official.manifest(v));}
});
test('To-do sorts overdue oldest first then priority, due date, and undated last',()=>{
 const t=(id,priority,dueDate)=>({id,priority,dueDate}),tasks=[t('undated-high','high',null),t('later-high','high','2026-12-04'),t('overdue-low','low','2026-11-01'),t('dated-medium','medium','2026-12-01'),t('oldest-low','low','2026-10-01'),t('soon-high','high','2026-11-12')];assert.deepEqual(Official.sortTasks(tasks,{},'2026-11-09').map(t=>t.id),['oldest-low','overdue-low','soon-high','later-high','undated-high','dated-medium']);
 assert.equal(tasks[0].id,'undated-high');assert.equal(Official.sortTasks(tasks,{'oldest-low':true},'2026-11-09')[0].id,'overdue-low');
});
test('local task requires only valid ID/name and validates optional dates/links',()=>{
 assert.deepEqual(Official.validateLocalTask({id:'local-example',title:'  充电宝  '}),{id:'local-example',title:'充电宝',priority:'medium',dueDate:null,url:'',note:'',activityId:null,dayId:null});
 assert.throws(()=>Official.validateLocalTask({id:'task-official',title:'x'}));assert.throws(()=>Official.validateLocalTask({id:'local-example',title:'x',priority:0}));assert.throws(()=>Official.validateLocalTask({id:'local-example',title:'x',url:0}));assert.throws(()=>Official.validateLocalTask({id:'local-example',title:'x',dueDate:'2026-02-30'}));assert.throws(()=>Official.validateLocalTask({id:'local-example',title:'x',url:'data:text/html,evil'}));
});
