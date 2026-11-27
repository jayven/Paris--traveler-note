'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),O=require('../official-data.js');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f))),m=read('trip/manifest.json'),s=O.validate(read(m.snapshotUrl)),old=read('trip/releases/b4ebb98b42154f45b116e9e7d2d32b9eb13d290269ee815853a9e992bcdb5ca3.json'),day='day-opera',act=id=>s.activities.find(a=>a.id===id),task=id=>s.tasks.find(t=>t.id===id),clean=({routeDataVersion,...x})=>x;
test('Dec8 revision retains every other date, hotel, place and route',()=>{
 assert.equal(s.tripDataVersion,'4.12.7');assert.equal(s.releaseSequence,7);O.validate(s,old);
 for(const k of ['days','activities','stops'])assert.deepEqual(s[k].filter(x=>(x.dayId||x.id)!==day),old[k].filter(x=>(x.dayId||x.id)!==day));
 assert.deepEqual(s.segments.filter(x=>x.dayId!==day).map(clean),old.segments.filter(x=>x.dayId!==day).map(clean));for(const k of ['hotels','places','conditionGroups','taskGroups'])assert.deepEqual(s[k],old[k]);
});
test('Dec8 exact order and times put Notre-Dame before Sainte12:30 and Orsay lunch13:45',()=>{
 assert.deepEqual(s.activities.filter(a=>a.dayId===day).sort((a,b)=>a.order-b.order).map(a=>[a.id,a.timeLabel]),[
 ['act-marquis-to-ghpr','09:30–10:15'],['act-notredame-transfer','10:15–10:45'],['act-notredame-visit','10:45–11:45'],['act-sainte-entry-buffer','11:45–12:30'],['act-sainte-visit','12:30–13:15 目标'],['act-orsay-transfer','13:15–13:45'],['act-orsay-lunch','13:45–14:45'],['act-orsay-visit','14:45–16:45 目标'],['act-ghpr-return','16:45–17:30'],['act-work-dec08','18:00 起']]);
 assert.match(act('act-notredame-visit').detail,/12\/8.*宗教.*入场/);assert.match(act('act-orsay-lunch').detail,/服务14:35结束/);assert.match(act('act-orsay-lunch').detail,/Café Campana或简餐/);assert.match(act('act-orsay-lunch').detail,/非餐厅预约/);
 for(const id of ['act-notredame-visit','act-sainte-visit','act-orsay-lunch','act-orsay-visit'])assert.equal(act(id).reservationStatus,'unconfirmed');
 assert.ok(!s.stops.some(x=>x.dayId===day&&['place-printemps','place-lafayette'].includes(x.placeId)));
});
test('new Sainte slot has a fresh task ID; previous checkboxes and all visit IDs remain valid',()=>{
 assert.equal(task('task-sainte-dec08-1045').status,'archived');assert.equal(task('task-sainte-dec08-1230').status,'active');assert.ok(!old.tasks.some(t=>t.id==='task-sainte-dec08-1230'));assert.deepEqual(act('act-sainte-visit').taskIds,['task-sainte-dec08-1230']);assert.match(task('task-sainte-dec08-1230').note,/未购买/);
 for(const t of old.tasks){assert.ok(task(t.id));if(!['task-sainte-dec08-1045','task-notredame-dec08-observances','task-carte-blanche-duo'].includes(t.id))assert.deepEqual(task(t.id),t);}
 for(const a of old.activities)assert.ok(act(a.id));assert.equal(s.tasks.filter(t=>t.status==='active').length,9);assert.ok(!s.retiredActivityIds.includes('act-notredame-transfer'));
});
test('reconnected map Stops and modes match the revised order without reversing old geometry',()=>{
 const stops=s.stops.filter(t=>t.dayId===day).sort((a,b)=>a.order-b.order),by=new Map(s.stops.map(t=>[t.id,t]));
 assert.deepEqual(stops.map(t=>t.placeId),['place-marquis','place-ghpr','place-notredame','place-notredame','place-sainte','place-sainte','place-orsay','place-orsay','place-orsay','place-ghpr','place-ghpr']);
 const segments=s.segments.filter(e=>e.dayId===day).sort((a,b)=>a.order-b.order);assert.equal(segments.length,stops.length-1);segments.forEach((e,i)=>assert.deepEqual([e.fromStopId,e.toStopId],[stops[i].id,stops[i+1].id]));
 assert.equal(segments.find(e=>by.get(e.fromStopId).placeId==='place-notredame'&&by.get(e.toStopId).placeId==='place-sainte').mode,'walking');assert.equal(segments.find(e=>by.get(e.fromStopId).placeId==='place-sainte'&&by.get(e.toStopId).placeId==='place-orsay').mode,'driving');
 const pool=new Set();for(const file of fs.readdirSync(path.join(root,'trip/releases'))){const h=read('trip/releases/'+file);if(h.releaseSequence>=7)continue;for(const e of h.segments.filter(e=>e.geometry)){const ends=[e.fromStopId,e.toStopId].map(id=>h.places.find(p=>p.id===h.stops.find(t=>t.id===id).placeId));pool.add(JSON.stringify([e.mode,ends.map(p=>[p.id,p.lat,p.lng,p.navigationTarget]),e.geometry]));}}
 for(const e of s.segments.filter(e=>e.geometry)){const ends=[e.fromStopId,e.toStopId].map(id=>s.places.find(p=>p.id===by.get(id).placeId));assert.ok(pool.has(JSON.stringify([e.mode,ends.map(p=>[p.id,p.lat,p.lng,p.navigationTarget]),e.geometry])));}
});
