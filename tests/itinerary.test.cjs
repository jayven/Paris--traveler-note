const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const personal=require('../personal-data.js');
const itinerary=require('../itinerary-data.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../trip-data.js'),'utf8'),context);
const trip=JSON.parse(JSON.stringify(context.window.PARIS_TRIP));
const legacy={booked:['louvre'],bookingNotes:{louvre:'既有预约备注'},dayNotes:{'2026-12-09':'每日笔记'},hotelNote:'既有酒店记录'};
const state=()=>personal.normalize(legacy);
const fields={title:'新午餐安排',date:'2026-12-08',time:'12:30',end:'14:00',detail:'我的计划'};
const visible=(data,date)=>itinerary.days(trip,data).find(day=>day.date===date).activities;
test('new activity appends with stable ID, persists and does not change canonical itinerary',()=>{
 const before=JSON.stringify(trip),original=state();
 const next=itinerary.edit(trip,original,'user-test-1',fields,true);
 assert.equal(visible(next,fields.date).at(-1).id,'user-test-1');
 assert.equal(itinerary.find(trip,next,'user-test-1').title,fields.title);
 assert.deepEqual(original,state());assert.equal(JSON.stringify(trip),before);
 let raw;personal.write({setItem:(key,value)=>raw=value},next);
 assert.deepEqual(personal.read({getItem:()=>raw}).data,next);
});
test('move a booked activity between dates, preserving booking references and destination order',()=>{
 const original=state(),destinationIds=visible(original,fields.date).map(a=>a.id);
 const next=itinerary.edit(trip,original,'d3-1',fields);
 assert.ok(!visible(next,'2026-12-09').some(a=>a.id==='d3-1'));
 assert.deepEqual(visible(next,fields.date).map(a=>a.id),[...destinationIds,'d3-1']);
 const activity=itinerary.find(trip,next,'d3-1');assert.equal(activity.booking,'louvre');assert.equal(activity.place,'louvre');
 assert.deepEqual(next.booked,legacy.booked);assert.deepEqual(next.bookingNotes,legacy.bookingNotes);assert.deepEqual(next.dayNotes,legacy.dayNotes);
});
test('reordering is explicit, bounded and retained after editing time and description',()=>{
 let next=itinerary.reorder(trip,state(),'d1-2',-1);
 assert.equal(visible(next,'2026-12-07')[0].id,'d1-2');
 next=itinerary.edit(trip,next,'d1-2',{...fields,date:'2026-12-07',time:'晚上',end:''});
 assert.equal(visible(next,'2026-12-07')[0].id,'d1-2');
 assert.deepEqual(itinerary.reorder(trip,next,'d1-2',-1),next);
 assert.throws(()=>itinerary.reorder(trip,next,'d1-2',0));
});
test('delete and restore original/custom activities without deleting records or booking notes',()=>{
 let next=itinerary.edit(trip,state(),'user-test-1',fields,true);
 next=itinerary.remove(trip,next,'d3-1');next=itinerary.remove(trip,next,'user-test-1');
 assert.ok(!visible(next,'2026-12-09').some(a=>a.id==='d3-1'));
 assert.ok(next.customActivities['user-test-1']);assert.deepEqual(next.bookingNotes,legacy.bookingNotes);
 next=itinerary.restore(trip,next,'d3-1');next=itinerary.restore(trip,next,'user-test-1');
 assert.equal(itinerary.find(trip,next,'d3-1').booking,'louvre');assert.ok(visible(next,fields.date).some(a=>a.id==='user-test-1'));
});
test('reset moved activity restores canonical name/date/time while preserving user records',()=>{
 const next=itinerary.reset(trip,itinerary.edit(trip,state(),'d3-1',fields),'d3-1');
 assert.equal(itinerary.find(trip,next,'d3-1').date,'2026-12-09');
 assert.equal(itinerary.find(trip,next,'d3-1').time,'09:00');assert.deepEqual(next.booked,legacy.booked);
 assert.ok(!visible(next,fields.date).some(a=>a.id==='d3-1'));
});
test('full backup restores additions, moves, deletion, order and original personal data',()=>{
 let next=itinerary.edit(trip,state(),'user-test-1',fields,true);
 next=itinerary.edit(trip,next,'d3-1',fields);next=itinerary.remove(trip,next,'d1-3');next=itinerary.reorder(trip,next,'user-test-1',-1);
 const restored=personal.restore(personal.backup(next,trip.version),state());
 assert.deepEqual(restored,next);assert.deepEqual(itinerary.days(trip,restored),itinerary.days(trip,next));
});
test('earlier time-editor backup merges time edits without losing date moves, title, additions, deletion or order',()=>{
 let next=itinerary.edit(trip,state(),'d3-1',fields);
 next=itinerary.edit(trip,next,'user-test-1',fields,true);next=itinerary.remove(trip,next,'d1-3');
 const restored=personal.restore({_format:'paris-pocket-backup-v1',schemaVersion:2,...legacy,activityOverrides:{'d3-1':{time:'11:00',end:'12:00',detail:'旧版描述'}}},next);
 assert.equal(restored.activityOverrides['d3-1'].time,'11:00');assert.equal(restored.activityOverrides['d3-1'].date,fields.date);
 assert.equal(restored.activityOverrides['d3-1'].title,fields.title);
 for(const key of ['customActivities','deletedActivityIds','activityOrder'])assert.deepEqual(restored[key],next[key]);
});
test('invalid dates, empty names, duplicate IDs and malformed management payloads are rejected',()=>{
 for(const bad of [{date:'2027-01-01'},{date:'2026-02-30'},{title:''}])assert.throws(()=>itinerary.edit(trip,state(),'d1-2',{...fields,...bad}));
 let next=itinerary.edit(trip,state(),'user-test-1',fields,true);
 assert.throws(()=>itinerary.edit(trip,next,'user-test-1',fields,true));
 for(const bad of [{deletedActivityIds:['d1-2','d1-2']},{activityOrder:{'2026-12-07':['d1-2','d1-2']}},{customActivities:[]},{customActivities:{'user-test-1':{...fields,id:'wrong',type:'生活'}}},{activityOverrides:JSON.parse('{"__proto__":{"time":"09:00","end":"","detail":""}}')}])assert.throws(()=>personal.normalize({...state(),...bad}));
});
test('stale storage writes are rejected before mutation',()=>{
 let raw=JSON.stringify(state());const storage={getItem:()=>raw,setItem:(key,value)=>raw=value};
 const snapshot=raw;personal.write(storage,{...state(),hotelNote:'另一窗口保存'},snapshot);
 const latest=raw;
 assert.throws(()=>personal.write(storage,itinerary.remove(trip,state(),'d1-2'),snapshot),error=>error.code==='STORAGE_CONFLICT');
 assert.equal(raw,latest);
});
