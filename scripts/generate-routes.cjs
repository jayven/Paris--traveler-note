#!/usr/bin/env node
'use strict';
// Deliberate, one-time release preparation only. Never run by app startup/build/CI.
// Read docs/phase-3/MAP_SOURCES.md and provider policies before --fetch.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'trip/source-v4.12.json'), 'utf8'));
const reviewed = JSON.parse(fs.readFileSync(path.join(root, 'trip/location-verification.json'), 'utf8'));
const outPath = path.join(root, 'trip/route-overrides.json');
const previous = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {segments:[]};
const places = new Map(source.places.map(p => [p.id, {...p, ...reviewed.places.find(x => x.id === p.id)}]));
const stops = new Map(source.stops.map(s => [s.id, s]));
const prior = new Map(previous.segments.map(s => [s.id, s]));
const fetchEnabled = process.argv.includes('--fetch');
const writeEnabled = fetchEnabled || process.argv.includes('--review');
const maxRequests = 40;
const userAgent = 'ParisPocket/Phase3-route-preparation (https://github.com/jayven/Paris--traveler-note)';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const distance = (a,b) => {
  const rad = d => d * Math.PI / 180;
  const dlat = rad(b[1]-a[1]), dlng = rad(b[0]-a[0]);
  const h = Math.sin(dlat/2)**2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dlng/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
};
function eligibility(seg) {
  const from = places.get(stops.get(seg.fromStopId)?.placeId);
  const to = places.get(stops.get(seg.toStopId)?.placeId);
  if (!['walking','driving'].includes(seg.mode)) return {reason: seg.mode === 'rail' ? '铁路班次/轨迹未核验；禁止用公路替代。' : seg.mode === 'boat' ? '水路运营/码头/轨迹未核验；禁止用公路替代。' : '来源未确定单一交通方式；不猜测道路模式。'};
  if (!from || !to || from.verifiedStatus !== 'verified' || to.verifiedStatus !== 'verified' || ![from.lat,from.lng,to.lat,to.lng].every(Number.isFinite)) return {reason:'端点定位尚未核验（例如机场具体航站楼或运营商码头）；保留节点文字，不绘制路线。'};
  if (from.id === to.id) return {reason:'同一场地的不同活动/访问；没有经核验的馆内或接送路线。'};
  if ([from.id,to.id].includes('place-louvre')) return {reason:'DATA-02：卢浮宫私人导览集合点待确认；金字塔仅馆区参考，不据此发布精确接送动线。'};
  if (seg.mode === 'driving' && [from.id,to.id].includes('place-hamlet')) return {reason:'王后村庄为园区访问参考，不是已核验的驾车接送点；园内回酒店方式待确认。'};
  return {from,to};
}
function write(segments) {
  const out = {
    schemaVersion:1, tripDataVersion:source.tripDataVersion,
    attribution:'Road geometry: OSRM on FOSSGIS servers; © OpenStreetMap contributors.',
    license:'https://opendatacommons.org/licenses/odbl/1-0/',
    fixMapUrl:'https://www.openstreetmap.org/fixthemap',
    policyUrl:'https://routing.openstreetmap.de/about.html',
    scope:'Precomputed walking/car road reference only. Not live traffic, guaranteed access, a booking/meeting-point verification, or rail/boat geometry.',
    segments
  };
  fs.writeFileSync(outPath, JSON.stringify(out,null,2)+'\n');
}
(async () => {
  const rows = []; let requests = 0, ready = 0;
  for (const seg of source.segments) {
    const base = {id:seg.id, geometry:null, verifiedStatus:'unverified', routeDataVersion:source.tripDataVersion};
    const e = eligibility(seg);
    if (e.reason) {rows.push({...base, verificationNote:e.reason}); continue;}
    const input = [[e.from.lng,e.from.lat],[e.to.lng,e.to.lat]];
    const profile = seg.mode === 'walking' ? 'foot' : 'car';
    // OSRM profile is selected by the routed-foot/routed-car backend prefix.
    const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/${profile}/${input.map(p=>p.join(',')).join(';')}?overview=full&geometries=geojson&steps=false&alternatives=false&generate_hints=false`;
    const old = prior.get(seg.id);
    if (old?.verifiedStatus === 'verified' && old.sources?.some(s=>s.url===url) && old.routeDataVersion === source.tripDataVersion) {rows.push(old); ready++; continue;}
    if (!fetchEnabled) {rows.push({...base,verificationNote:old?.verifiedStatus === 'unverified' ? old.verificationNote : '尚未请求/审核道路几何。'}); console.log(`eligible: ${seg.id}`); continue;}
    if (requests >= maxRequests) throw new Error('Release request bound exceeded; review scope before any further request.');
    try {
      if (requests) await sleep(1500); // Single process, below provider maximum 1 request/s.
      requests++;
      const response = await fetch(url, {headers:{'User-Agent':userAgent,'Accept':'application/json'}, signal:AbortSignal.timeout(25000)});
      if (!response.ok) throw new Error(`provider HTTP ${response.status}`);
      const body = await response.json();
      const route = body.routes?.[0]; const points = route?.geometry?.coordinates;
      if (body.code !== 'Ok' || route?.geometry?.type !== 'LineString' || !Array.isArray(points) || points.length < 3 || points.some(p=>p.length!==2 || !p.every(Number.isFinite))) throw new Error('No valid road geometry returned');
      const snaps = [distance(input[0],points[0]),distance(input[1],points.at(-1))];
      const maxSnap = seg.mode === 'walking' ? 150 : 250;
      if (snaps.some(d=>d>maxSnap)) throw new Error(`Endpoint road snap exceeds ${maxSnap}m (${snaps.map(Math.round).join(', ')}m)`);
      const stamp = new Date().toISOString();
      const result = {
        id:seg.id, geometry:route.geometry, verifiedStatus:'verified',routeDataVersion:source.tripDataVersion,
        distanceMeters:route.distance,
        verificationNote:'按来源交通方式预计算的 OSM 道路/步行参考几何；不保证旅行日开放、通行、无障碍、上客位置或实时交通。',
        roadSnapMeters:snaps.map(x=>Math.round(x*10)/10),
        sources:[{source:'OSRM on FOSSGIS servers / OpenStreetMap',provider:'FOSSGIS',profile,mode:seg.mode,url,generatedAt:stamp,checkedAt:'2026-11-09',license:'ODbL-1.0',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',policyUrl:'https://routing.openstreetmap.de/about.html',note:'Only the selected source mode backend; no straight-line, car-for-rail, or car-for-boat fallback.'}]
      };
      if (body.data_version) result.sources[0].mapDataVersion = body.data_version;
      rows.push(result); ready++;
      console.log(`saved: ${seg.id} (${points.length} points; snapped ${snaps.map(Math.round).join('/')}m)`);
    } catch(error) {
      rows.push({...base,verificationNote:`道路几何未取得/未通过端点核验：${error.message}`});
      console.log(`unverified: ${seg.id}: ${error.message}`);
    }
    write(rows.concat(source.segments.filter(s=>!rows.some(r=>r.id===s.id)).map(s=>prior.get(s.id) || {id:s.id,geometry:null,verifiedStatus:'unverified',routeDataVersion:source.tripDataVersion,verificationNote:'尚未完成道路准备。'})));
  }
  if (writeEnabled) write(rows);
  console.log(JSON.stringify({requests,verified:ready,total:source.segments.length,fetchEnabled}));
})().catch(error => {console.error(error.message);process.exitCode=1;});
