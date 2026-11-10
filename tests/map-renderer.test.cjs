/* Renderer projection invariants; no DOM, map network or personal storage. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Renderer=require('../map-renderer.js');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'trip/manifest.json')));
const data=JSON.parse(fs.readFileSync(path.join(root,manifest.snapshotUrl.slice(2))));
const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}
test('renderer copies exactly the 28 verified road geometries without mutating the official snapshot',()=>{
 const source=freeze(clone(data)),before=JSON.stringify(source);
 const collection=Renderer.routeCollection(source.stops,source.segments);
 assert.equal(collection.features.length,28);
 for(const feature of collection.features){const segment=source.segments.find(s=>s.id===feature.properties.id);assert.equal(feature.id,segment.id);assert.equal(feature.properties.mode,segment.mode);assert.deepEqual(feature.geometry,segment.geometry);assert.notEqual(feature.geometry,segment.geometry);}
 collection.features[0].geometry.coordinates[0][0]+=1;
 assert.equal(JSON.stringify(source),before,'MapLibre receiving projected GeoJSON cannot mutate the official geometry through shared references');
});
test('road projection respects stop visibility and never draws unknown, rail, boat or unverified geometry',()=>{
 const selected=data.stops.filter(s=>s.dayId==='day-orsay');
 const collection=Renderer.routeCollection(selected,data.segments);
 const visible=new Set(selected.map(s=>s.id));
 assert.deepEqual(collection.features.map(f=>f.id).sort(),data.segments.filter(s=>s.geometry&&visible.has(s.fromStopId)&&visible.has(s.toStopId)).map(s=>s.id).sort());
 const valid=data.segments.find(s=>s.geometry);
 for(const mode of ['unknown','rail','boat'])assert.equal(Renderer.routeCollection(data.stops,[{...valid,mode}]).features.length,0);
 assert.equal(Renderer.routeCollection(data.stops,[{...valid,verifiedStatus:'unverified'}]).features.length,0);
 assert.equal(Renderer.routeCollection(data.stops,[{...valid,geometry:null}]).features.length,0,'no straight-line missing-route substitute');
});
test('same-place repeated hotel stops keep exact coordinates, visit IDs and official order',()=>{
 const source=freeze(clone(data)),stops=source.stops.filter(s=>s.dayId==='day-orsay');
 const groups=Renderer.markerGroups([...stops].reverse(),source.places),ghpr=groups.find(g=>g.place.id==='place-ghpr');
 assert.equal(ghpr.stops.length,2);assert.equal(new Set(ghpr.stops.map(s=>s.id)).size,2);assert.ok(ghpr.stops[0].order<ghpr.stops[1].order);
 const original=source.places.find(p=>p.id==='place-ghpr');assert.equal(ghpr.place.lng,original.lng);assert.equal(ghpr.place.lat,original.lat);
 assert.ok(!Renderer.markerGroups(source.stops,source.places).some(g=>!Number.isFinite(g.place.lat)||!Number.isFinite(g.place.lng)),'unverified airport/pier coordinates are not invented');
});
