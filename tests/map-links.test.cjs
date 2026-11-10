const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const maps=require('../map-links.js');
const place={lat:48.8635,lng:2.3274};
test('Google viewing pins the exact existing coordinates instead of searching an ambiguous name',()=>{
 const url=new URL(maps.view(place));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/maps/search/');
 assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.get('query'),'48.8635,2.3274');
 assert.equal(url.searchParams.has('key'),false);
});
test('walking/driving directions preserve destination and use Google-provided origin',()=>{
 for(const mode of ['walking','driving']){
  const url=new URL(maps.directions(place,mode));
  assert.equal(url.pathname,'/maps/dir/');assert.equal(url.searchParams.get('api'),'1');
  assert.equal(url.searchParams.get('destination'),'48.8635,2.3274');
  assert.equal(url.searchParams.get('travelmode'),mode);assert.equal(url.searchParams.get('dir_action'),'navigate');
  assert.equal(url.searchParams.has('origin'),false);assert.equal(url.searchParams.has('key'),false);
 }
});
test('optional explicitly supplied Place IDs are encoded; invalid coordinates/modes cannot create links',()=>{
 const fixture={...place,googlePlaceId:'test-id&encoded'};
 assert.equal(new URL(maps.view(fixture)).searchParams.get('query_place_id'),fixture.googlePlaceId);
 assert.equal(new URL(maps.directions(fixture,'walking')).searchParams.get('destination_place_id'),fixture.googlePlaceId);
 assert.throws(()=>maps.directions(place,'taxi'));
 for(const bad of [null,{lat:NaN,lng:1},{lat:91,lng:1},{lat:1,lng:181},{lat:'48.8635',lng:2.3274}])assert.throws(()=>maps.view(bad));
});
test('every canonical place retains its coordinates in all Google links',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../trip-data.js'),'utf8'),context);
 for(const place of Object.values(context.window.PARIS_TRIP.locations)){
  const coordinates=`${place.lat},${place.lng}`;
  assert.equal(new URL(maps.view(place)).searchParams.get('query'),coordinates);
  for(const mode of ['walking','driving'])assert.equal(new URL(maps.directions(place,mode)).searchParams.get('destination'),coordinates);
 }
});

test('verified address navigation and explicit single-leg origins are encoded without geocoding',()=>{
 const target={address:'Rue Auber / Rue Scribe, Paris, France'};
 const search=new URL(maps.view(target));assert.equal(search.searchParams.get('query'),target.address);
 const origin={lat:48.8631637,lng:2.3378569,googlePlaceId:'explicit-origin-id'};
 const route=new URL(maps.directions(target,'walking',origin));
 assert.equal(route.searchParams.get('origin'),'48.8631637,2.3378569');
 assert.equal(route.searchParams.get('origin_place_id'),'explicit-origin-id');
 assert.equal(route.searchParams.get('destination'),target.address);
 assert.equal(route.searchParams.get('travelmode'),'walking');
 assert.throws(()=>maps.view({address:''}));assert.throws(()=>maps.directions(target,'rail',origin));
});
