const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/phase-3/route-gap-audit.json')));
// This audit is historical evidence for the retained v4.12.1 release, not the latest route set.
const bytes=fs.readFileSync(path.join(root,'trip/releases',audit.snapshotSha256+'.json')),trip=JSON.parse(bytes);
test('route gap review covers every missing segment exactly once and preserves the reviewed release',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),audit.snapshotSha256);
 assert.equal(trip.tripDataVersion,'4.12.1');assert.equal(audit.totalSegments,trip.segments.length);
 const missing=trip.segments.filter(s=>s.geometry===null),verified=trip.segments.filter(s=>s.geometry!==null);
 assert.equal(missing.length,40);assert.equal(verified.length,28);
 assert.equal(audit.entries.length,missing.length);assert.equal(new Set(audit.entries.map(e=>e.segmentId)).size,missing.length);
 assert.deepEqual(audit.entries.map(e=>e.segmentId).sort(),missing.map(s=>s.id).sort());
 const categories=['required-road','same-venue-no-road','rail-boat','blocked-decision'];
 for(const entry of audit.entries){const s=missing.find(s=>s.id===entry.segmentId);assert.equal(entry.mode,s.mode);assert.equal(entry.fromStopId,s.fromStopId);assert.equal(entry.toStopId,s.toStopId);assert.ok(categories.includes(entry.category));assert.ok(entry.reason&&entry.requiredDecision);}
 for(const category of categories)assert.equal(audit.entries.filter(e=>e.category===category).length,audit.classificationCounts[category]);
});
test('mode totals and source-backed candidates stay distinct from new transport decisions',()=>{
 assert.deepEqual(audit.modeCounts,{walking:{total:24,storedGeometry:24},driving:{total:8,storedGeometry:4},unknown:{total:32,storedGeometry:0},rail:{total:2,storedGeometry:0},boat:{total:2,storedGeometry:0}});
 assert.deepEqual(audit.classificationCounts,{'required-road':2,'same-venue-no-road':7,'rail-boat':4,'blocked-decision':27});
 for(const entry of audit.entries.filter(e=>e.category==='required-road')){assert.equal(entry.mode,'unknown');const a=trip.activities.find(a=>entry.sourceActivityIds.includes(a.id));assert.match(a.detail,/走艺术家广场与圣心堂/);}
 for(const s of trip.segments.filter(s=>s.geometry&&['unknown','rail','boat'].includes(s.mode)))assert.fail(`Unreviewed geometry for ${s.id}`);
});
test('shared place IDs do not erase unresolved guide and pier movements',()=>{
 for(const tail of ['louvre-transfer--louvre-private-guide','watershuttle-outbound--kinderdijk-visit','kinderdijk-visit--kinderdijk-boarding']){
  const e=audit.entries.find(e=>e.segmentId==='segment-'+tail);assert.equal(e.samePlaceId,true);assert.equal(e.category,'blocked-decision');
 }
 for(const group of audit.decisionGroups)assert.equal(group.count,audit.entries.filter(e=>e.decisionGroup===group.id).length);
});
