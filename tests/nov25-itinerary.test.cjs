'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const O=require('../official-data.js'),root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f))),s=O.validate(read('trip/releases/b4ebb98b42154f45b116e9e7d2d32b9eb13d290269ee815853a9e992bcdb5ca3.json')),old=read('trip/releases/979bb47ae1cd39c4ebaa3b9f59c681583bfb1e1048b4bf4d5e22dee9073fa011.json');
const changed=new Set(['day-opera','day-photos','day-sunday']),rows=id=>s.activities.filter(a=>a.dayId===id).sort((a,b)=>a.order-b.order),activity=id=>s.activities.find(a=>a.id===id),task=id=>s.tasks.find(t=>t.id===id),clean=({routeDataVersion,...x})=>x;
test('Nov25 creates the next release while preserving five unchanged days, hotels and navigation locations',()=>{
 assert.equal(s.tripDataVersion,'4.12.6');assert.equal(s.releaseSequence,6);assert.equal(s.trip.sourceDate,'2026-11-25');O.validate(s,old);
 for(const key of ['days','activities','stops'])assert.deepEqual(s[key].filter(x=>!changed.has(x.dayId||x.id)),old[key].filter(x=>!changed.has(x.dayId||x.id)),key);
 assert.deepEqual(s.segments.filter(x=>!changed.has(x.dayId)).map(clean),old.segments.filter(x=>!changed.has(x.dayId)).map(clean));
 for(const key of ['places','hotels','conditionGroups','taskGroups'])assert.deepEqual(s[key],old[key],key);
});
test('Tuesday keeps both churches together then Orsay lunch13:00 and museum14:00 without department stores',()=>{
 assert.deepEqual(rows('day-opera').map(a=>[a.id,a.timeLabel]),[
  ['act-marquis-to-ghpr','09:45–10:25'],['act-sainte-entry-buffer','10:25–10:45'],['act-sainte-visit','10:45–11:30 目标'],['act-notredame-visit','11:30–12:20'],['act-orsay-transfer','12:20–13:00'],['act-orsay-lunch','13:00–14:00'],['act-orsay-visit','14:00–16:30 目标'],['act-ghpr-return','16:30–17:30'],['act-work-dec08','18:00 起']
 ]);
 assert.match(activity('act-notredame-visit').detail,/12\/8.*瞻礼.*礼仪.*临近核实/);assert.match(activity('act-notredame-visit').detail,/7–10分钟/);assert.match(activity('act-orsay-lunch').detail,/不是餐厅预约/);
 for(const id of ['act-sainte-visit','act-notredame-visit','act-orsay-visit'])assert.equal(activity(id).reservationStatus,'unconfirmed');
 assert.ok(!s.stops.some(t=>t.dayId==='day-opera'&&['place-printemps','place-lafayette'].includes(t.placeId)));
});
test('Saturday restores exterior Arc and luggage sequence with four uninterrupted Marais hours',()=>{
 assert.deepEqual(rows('day-photos').map(a=>[a.id,a.timeLabel]),[
  ['act-powers-pack','10:15–10:45'],['act-arc-exterior','10:45–11:30'],['act-powers-to-astor','11:30–13:00'],['act-marais-transfer','13:00–14:00'],['act-marais-afternoon','14:00–15:00'],['act-marais-streets','15:00–16:30'],['act-marais-temple','16:30–18:00']
 ]);
 assert.match(activity('act-arc-exterior').detail,/暂不登顶/);assert.deepEqual(activity('act-powers-to-astor').placeIds,['place-grand-powers','place-maison-astor']);
 assert.deepEqual(s.stops.filter(x=>x.dayId==='day-photos').sort((a,b)=>a.order-b.order).map(x=>x.placeId),['place-grand-powers','place-arc','place-champs','place-grand-powers','place-maison-astor','place-vosges','place-francs-bourgeois','place-rosiers','place-vieille-temple']);
 assert.match(s.days.find(d=>d.id==='day-photos').note,/14:00–18:00.*4小时/);
});
test('Sunday shopping stays optional before Montmartre13:30 and one tentative18:30 cruise',()=>{
 assert.deepEqual(rows('day-sunday').map(a=>[a.id,a.timeLabel]),[
  ['act-astor-to-stores','10:30–11:00 可选'],['act-department-stores','11:00–12:30 可选'],['act-montmartre-transfer','12:30–13:30'],['act-montmartre','13:30–16:30'],['act-cruise-transfer','16:30–18:15'],['act-cruise-sunday','18:30–19:30 目标'],['act-astor-sunday-return','19:30 以后']
 ]);
 for(const id of ['act-astor-to-stores','act-department-stores']){assert.equal(activity(id).status,'optional');assert.equal(activity(id).reservationStatus,'not-required');assert.deepEqual(activity(id).taskIds,[]);}
 assert.equal(activity('act-cruise-sunday').reservationStatus,'unconfirmed');
 for(const id of ['act-sainte-visit','act-notredame-visit','act-arc-exterior','act-department-stores','act-orsay-visit','act-opera-visit'])assert.equal(s.activities.filter(a=>a.id===id).length,1);
 assert.ok(!s.activities.some(a=>/Rotterdam|Eurostar|鹿特丹/.test(a.title)));
});
test('new booking dates have fresh task IDs, retained goals keep their IDs and removed visits remain recoverable',()=>{
 for(const [prior,current,aid] of [['task-sainte-dec12-1145','task-sainte-dec08-1045','act-sainte-visit'],['task-notredame-dec12','task-notredame-dec08-observances','act-notredame-visit']]){
  assert.equal(task(prior).status,'archived');assert.equal(task(prior).originalDayId,'day-photos');assert.equal(task(current).status,'active');assert.equal(task(current).dayId,'day-opera');assert.ok(!old.tasks.some(t=>t.id===current));assert.deepEqual(activity(aid).taskIds,[current]);
 }
 for(const t of old.tasks)assert.ok(task(t.id));assert.equal(s.tasks.filter(t=>t.status==='active').length,9);
 for(const t of old.tasks.filter(t=>t.status==='active'&&!['task-sainte-dec12-1145','task-notredame-dec12','task-carte-blanche-duo'].includes(t.id)))assert.deepEqual(task(t.id),t);
 for(const id of ['act-notredame-transfer','act-opera-lunch','act-orsay-to-stores','act-orsay-visit-afternoon'])assert.ok(s.retiredActivityIds.includes(id));assert.ok(!s.retiredActivityIds.includes('act-powers-pack'));
});
test('every retained route has prior verified geometry with the same endpoint coordinates and mode',()=>{
 const pool=new Set();for(const file of fs.readdirSync(path.join(root,'trip/releases'))){const h=read('trip/releases/'+file);if(h.releaseSequence>=6)continue;for(const e of h.segments.filter(e=>e.geometry)){const ends=[e.fromStopId,e.toStopId].map(id=>h.places.find(p=>p.id===h.stops.find(t=>t.id===id).placeId));pool.add(JSON.stringify([e.mode,ends.map(p=>[p.id,p.lat,p.lng,p.navigationTarget]),e.geometry]));}}
 for(const e of s.segments.filter(e=>e.geometry)){const ends=[e.fromStopId,e.toStopId].map(id=>s.places.find(p=>p.id===s.stops.find(t=>t.id===id).placeId));assert.ok(pool.has(JSON.stringify([e.mode,ends.map(p=>[p.id,p.lat,p.lng,p.navigationTarget]),e.geometry])));}
 const st=new Map(s.stops.map(x=>[x.id,x]));assert.ok(s.segments.some(e=>e.mode==='walking'&&e.geometry&&st.get(e.fromStopId).placeId==='place-sainte'&&st.get(e.toStopId).placeId==='place-notredame'&&e.dayId==='day-opera'));
 assert.ok(!s.segments.some(e=>e.dayId==='day-sunday'&&e.mode==='driving'));
});
