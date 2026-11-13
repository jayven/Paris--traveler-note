/* The user-approved two-day change must keep identities and unrelated travel facts intact. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Official=require('../official-data.js');
const root=path.resolve(__dirname,'..');
const oldHash='af2dbb626d063926bf126dad2ae376d51738df7e34546b60b2748a2a7ef63708';
const oldBytes=fs.readFileSync(path.join(root,'trip/releases',oldHash+'.json'));
const old=JSON.parse(oldBytes);
// This contract records the completed v4.12.2 itinerary change; later task releases are separate.
function maintained(){
 const bytes=fs.readFileSync(path.join(root,'trip/releases/f7f8ce3d91fa777de40cc87829afa31a837455085bd8b59b256f90de55665e24.json'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'f7f8ce3d91fa777de40cc87829afa31a837455085bd8b59b256f90de55665e24');
 return Official.validate(JSON.parse(bytes),old);
}
const changedDays=new Set(['day-opera','day-orsay']);
const activity=(data,id)=>data.activities.find(a=>a.id===id);
const onDay=(data,dayId)=>data.activities.filter(a=>a.dayId===dayId).sort((a,b)=>a.order-b.order);
const omitRouteVersion=({routeDataVersion,...rest})=>rest;
test('v4.12.2 changes only the approved two days and retains the immutable v4.12.1 release',()=>{
 const data=maintained();assert.equal(data.tripDataVersion,'4.12.2');assert.equal(data.releaseSequence,2);
 assert.equal(crypto.createHash('sha256').update(oldBytes).digest('hex'),oldHash);
 for(const key of ['days','activities','stops','tasks'])assert.deepEqual(data[key].filter(i=>!changedDays.has(i.dayId||i.id)),old[key].filter(i=>!changedDays.has(i.dayId||i.id)),key+' outside December8/9 changed');
 assert.deepEqual(data.segments.filter(i=>!changedDays.has(i.dayId)).map(omitRouteVersion),old.segments.filter(i=>!changedDays.has(i.dayId)).map(omitRouteVersion));
 for(const key of ['hotels','places','conditionGroups'])assert.deepEqual(data[key],old[key],key+' changed outside this update');
 assert.ok(data.segments.every(s=>s.routeDataVersion==='4.12.2'));
});
test('Tuesday performs the hotel handoff first and contains the moved visits exactly once in the approved order',()=>{
 const data=maintained(),rows=onDay(data,'day-opera');
 assert.deepEqual(rows.map(a=>a.id),['act-marquis-to-ghpr','act-sainte-visit','act-notredame-visit','act-luxembourg-walk','act-orsay-lunch','act-orsay-visit','act-department-stores','act-ghpr-return']);
 const slots=['08:00–09:15','09:30–10:30','10:45–11:45','12:00–12:40','13:15–14:15','14:15–17:15','17:45–19:15'];
 for(let i=0;i<slots.length;i++)assert.ok(rows[i].timeLabel.includes(slots[i]),rows[i].id+' time');
 assert.match(rows.at(-1).timeLabel,/晚间|晚上/);
 assert.match(rows[0].detail,/寄存/);assert.doesNotMatch(rows[0].timeLabel,/12:30/);
 assert.match(activity(data,'act-department-stores').detail,/缩短|缩减/);
 for(const id of rows.map(a=>a.id))assert.equal(data.activities.filter(a=>a.id===id).length,1);
 const day=data.days.find(d=>d.id==='day-opera');assert.equal(day.date,'2026-12-08');assert.match(day.theme,/圣礼拜|西岱/);assert.match(day.theme,/奥赛/);
});
test('Wednesday keeps morning and evening luggage visits, afternoon Montmartre and an explicitly estimated Versailles departure',()=>{
 const data=maintained(),rows=onDay(data,'day-orsay');
 assert.deepEqual(rows.map(a=>a.id),['act-ghpr-checkout','act-palais-royal','act-opera-visit','act-opera-lunch','act-vivienne-optional','act-montmartre','act-ghpr-luggage','act-waldorf-transfer','act-waldorf-arrival']);
 const slots=['08:45–09:30','08:45–09:30','10:00–11:30','11:30–12:45','11:30–12:45','13:15–16:30','16:30–17:30','17:30–18:00'];
 for(let i=0;i<slots.length;i++)assert.ok(rows[i].timeLabel.includes(slots[i]),rows[i].id+' time');
 assert.equal(activity(data,'act-vivienne-optional').status,'optional');
 assert.equal(activity(data,'act-opera-lunch').placeIds.length,0,'no invented lunch restaurant');
 assert.match(activity(data,'act-waldorf-transfer').timeLabel,/出发/);
 assert.match(activity(data,'act-waldorf-transfer').detail,/不是.*抵达|不代表.*抵达|非.*抵达/);
 assert.match(activity(data,'act-waldorf-arrival').timeLabel+' '+activity(data,'act-waldorf-arrival').detail,/估|待定|待核/);
 for(const id of ['act-sainte-visit','act-notredame-visit','act-luxembourg-walk','act-orsay-lunch','act-orsay-visit'])assert.equal(rows.some(a=>a.id===id),false);
 const ghpr=data.stops.filter(s=>s.dayId==='day-orsay'&&s.placeId==='place-ghpr');assert.deepEqual(ghpr.map(s=>s.id),['stop-ghpr-checkout','stop-ghpr-luggage']);
 assert.notEqual(ghpr[0].activityId,ghpr[1].activityId);
});
test('moved activities and official To-dos retain identities, while superseded combined/extra activities are explicitly retired',()=>{
 const data=maintained();
 for(const before of old.activities){const after=activity(data,before.id);if(['act-orsay-transfer','act-martyrs-optional'].includes(before.id)){assert.equal(after,undefined);assert.ok(data.retiredActivityIds.includes(before.id));}else{assert.ok(after,before.id+' identity lost');assert.equal(after.reservationStatus,before.reservationStatus,before.id+' booking status changed');}}
 assert.deepEqual(data.tasks.map(t=>t.id).sort(),old.tasks.map(t=>t.id).sort());
 for(const id of ['task-sainte','task-notredame','task-orsay','task-orsay-lunch','task-opera']){
  const before=old.tasks.find(t=>t.id===id),after=data.tasks.find(t=>t.id===id);assert.equal(after.activityId,before.activityId);assert.equal(after.dayId,activity(data,after.activityId).dayId);assert.equal(after.status,before.status);assert.equal(after.dueDate,before.dueDate);assert.equal(data.tasks.filter(t=>t.id===id).length,1);
 }
 const nd=data.tasks.find(t=>t.id==='task-notredame');assert.match(nd.note,/礼拜|宗教/);assert.match(nd.note,/待核|待确认/);assert.equal(nd.dayId,'day-opera');
 for(const id of ['act-sainte-visit','act-notredame-visit','act-orsay-lunch','act-orsay-visit','act-opera-visit'])assert.equal(activity(data,id).reservationStatus,'unconfirmed');
});
test('two-day map sequences retain repeated visits and cannot reuse old geometry with different physical endpoints or mode',()=>{
 const data=maintained();
 const places=dayId=>data.stops.filter(s=>s.dayId===dayId).sort((a,b)=>a.order-b.order).map(s=>s.placeId);
 assert.deepEqual(places('day-opera'),['place-marquis','place-ghpr','place-sainte','place-notredame','place-lux','place-orsay','place-orsay','place-lafayette','place-printemps','place-ghpr']);
 assert.deepEqual(places('day-orsay'),['place-ghpr','place-royal','place-opera','place-vivienne','place-abbesses','place-sacre','place-tertre','place-ghpr','place-waldorf','place-waldorf']);
 const signature=(trip,s)=>{const point=id=>{const stop=trip.stops.find(x=>x.id===id),p=trip.places.find(x=>x.id===stop.placeId);return [p.id,p.lat,p.lng];};return JSON.stringify([s.mode,point(s.fromStopId),point(s.toStopId)]);};
 const oldRoutes=new Map();for(const s of old.segments.filter(s=>s.geometry)){const key=JSON.stringify(s.geometry);oldRoutes.set(key,[...(oldRoutes.get(key)||[]),signature(old,s)]);}
 for(const s of data.segments.filter(s=>changedDays.has(s.dayId))){
  const from=data.stops.find(t=>t.id===s.fromStopId),to=data.stops.find(t=>t.id===s.toStopId);assert.equal(from.dayId,s.dayId);assert.equal(to.dayId,s.dayId);assert.ok(from.order<to.order);
  if(!s.geometry){assert.equal(s.verifiedStatus,'unverified');continue;}
  assert.ok(['walking','driving'].includes(s.mode));assert.ok(s.geometry.coordinates.length>=3);assert.ok(s.sources.length);
  const reused=oldRoutes.get(JSON.stringify(s.geometry));if(reused)assert.ok(reused.includes(signature(data,s)),'old geometry attached to changed endpoint/mode: '+s.id);
 }
});
