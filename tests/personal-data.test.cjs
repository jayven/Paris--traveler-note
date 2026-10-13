const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const personal=require('../personal-data.js');
const legacy={booked:['louvre'],dayNotes:{'2026-12-09':'午餐留在馆内'},bookingNotes:{louvre:'个人备注'},hotelNote:'酒店未定',flightNote:'航班笔记',miscNote:'购物清单'};
const edit={time:'10:15',end:'12:45',detail:'新描述\n保留换行'};
test('legacy migration keeps all notes, bookings and unknown fields',()=>{
 const next=personal.normalize({...legacy,futurePreference:'keep'});
 for(const key of Object.keys(legacy))assert.deepEqual(next[key],legacy[key]);
 assert.deepEqual(next.activityOverrides,{});assert.equal(next.futurePreference,'keep');
});
test('edit survives storage reload and backup round trip; IDs stay attached',()=>{
 let raw=JSON.stringify(legacy);
 const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,personal.KEY);raw=value;}};
 const loaded=personal.read(storage);assert.equal(loaded.error,null);
 const next=personal.write(storage,{...loaded.data,activityOverrides:{'d3-1':edit}});
 assert.deepEqual(personal.read(storage).data,next);
 assert.deepEqual(personal.restore(personal.backup(next,'test'),personal.normalize({})),next);
 assert.deepEqual(next.booked,legacy.booked);assert.deepEqual(next.bookingNotes,legacy.bookingNotes);
});
test('old backup retains current edits; new backup explicitly replaces edits',()=>{
 const current=personal.normalize({...legacy,activityOverrides:{'d3-1':edit}});
 assert.deepEqual(personal.restore({_format:'paris-pocket-backup-v1',...legacy},current).activityOverrides,current.activityOverrides);
 assert.deepEqual(personal.restore(personal.backup(legacy,'test'),current).activityOverrides,{});
});
test('malformed backups and future schemas are rejected',()=>{
 for(const bad of [{booked:null},{dayNotes:null},{hotelNote:null},{booked:'bad'},{bookingNotes:[]},{dayNotes:{x:4}},{hotelNote:{}},{activityOverrides:[]},{activityOverrides:{x:{time:4}}},{schemaVersion:4}]) {
  assert.throws(()=>personal.restore({_format:'paris-pocket-backup-v1',...bad},legacy));
 }
 assert.throws(()=>personal.restore({},legacy));
});
test('storage access, corrupt JSON and quota failures never report a successful write',()=>{
 assert.ok(personal.read({getItem:()=>'{bad'}).error);
 assert.ok(personal.read({getItem:()=>{throw new Error('denied')}}).error);
 assert.throws(()=>personal.write({setItem:()=>{throw new Error('quota')}},legacy));
});
test('flexible planning labels and empty descriptions stay editable; bad clock ranges fail',()=>{
 assert.equal(personal.validateEdit({...edit,time:'晚上',end:'',detail:''}).time,'晚上');
 assert.equal(personal.validateEdit({...edit,time:'约19:00',end:''}).time,'约19:00');
 for(const time of ['25:00',' 25:00 ','09:99',''])assert.throws(()=>personal.validateEdit({...edit,time}));
 assert.throws(()=>personal.validateEdit({...edit,time:'13:00',end:'12:00'}));
});
test('canonical itinerary: eight dates, unique IDs, valid references and preserved Tuileries center',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../trip-data.js'),'utf8'),context);
 const trip=context.window.PARIS_TRIP,ids=new Set();
 assert.equal(trip.days.length,8);assert.equal(trip.timezone,'Europe/Paris');
 trip.days.forEach((day,i)=>{
  assert.equal(day.date,`2026-12-${String(i+7).padStart(2,'0')}`);
  day.activities.forEach(activity=>{
   assert.ok(activity.id&&!ids.has(activity.id));ids.add(activity.id);
   for(const id of [activity.place,...(activity.extraPlaces||[])].filter(Boolean))assert.ok(trip.locations[id]);
   if(activity.booking)assert.ok(trip.bookings.some(b=>b.id===activity.booking));
  });
 });
 Object.values(trip.locations).forEach(loc=>{assert.ok(Number.isFinite(loc.lat)&&Math.abs(loc.lat)<=90);assert.ok(Number.isFinite(loc.lng)&&Math.abs(loc.lng)<=180);});
 assert.equal(trip.locations.tuileries.lat,48.8635);assert.equal(trip.locations.tuileries.lng,2.3274);
 assert.equal(trip.arrival.time,'08:00');assert.equal(trip.departure.time,'22:20');
});
