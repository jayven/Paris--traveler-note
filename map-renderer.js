/* Embedded map only. Public basemap resources load lazily; official/local data is never written here. */
(function(root){
'use strict';
const VERSION='6.17.0';
const SDK=Object.freeze({
 module:`https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.mjs`,
 css:`https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl.css`,
 // Direct browser ESM resolves this pinned sibling automatically, using MapLibre's supported Blob worker bridge.
 worker:`https://unpkg.com/maplibre-gl@${VERSION}/dist/maplibre-gl-worker.mjs`
});
const STYLES=Object.freeze({positron:'https://tiles.openfreemap.org/styles/positron',liberty:'https://tiles.openfreemap.org/styles/liberty'});
const SOURCE='paris-itinerary-routes';
const LAYERS=Object.freeze({walking:'paris-route-walking',driving:'paris-route-driving'});
const COLORS=Object.freeze({walking:'#39795d',driving:'#55769d'});
const STYLE_ID='paris-maplibre-css';
let libraryPromise=null,cssPromise=null,libraryAttempt=0;
const copy=value=>JSON.parse(JSON.stringify(value));
const finitePosition=p=>!!p&&Number.isFinite(p.lng)&&Number.isFinite(p.lat)&&Math.abs(p.lng)<=180&&Math.abs(p.lat)<=90;
function loadCSS(){
 if(cssPromise)return cssPromise;
 cssPromise=new Promise((resolve,reject)=>{
  const existing=root.document.getElementById(STYLE_ID);
  if(existing?.dataset.loaded==='true'){resolve();return;}
  const link=existing||root.document.createElement('link');
  let complete=false;
  const finish=error=>{if(complete)return;complete=true;clearTimeout(timer);link.onload=null;link.onerror=null;if(error){link.remove();reject(error);}else{link.dataset.loaded='true';resolve();}};
  const timer=setTimeout(()=>finish(new Error('地图样式组件载入超时')),12000);
  link.id=STYLE_ID;link.rel='stylesheet';link.href=SDK.css;
  link.integrity='sha384-S+OnE5M4U3Qc2nR0RgljGrVs06xqfRg8L7uFk/pOF5+sRuSDG4oKkqKZmFrx7w09';link.crossOrigin='anonymous';
  link.onload=()=>finish();link.onerror=()=>finish(new Error('地图样式组件不可用'));
  if(!existing)root.document.head.appendChild(link);
 }).catch(error=>{cssPromise=null;throw error;});
 return cssPromise;
}
function loadLibrary(){
 if(libraryPromise)return libraryPromise;
 const attempt=libraryAttempt++;
 // A failed native module fetch may be cached by the browser. A retry still uses the same immutable version.
 const moduleUrl=attempt?SDK.module+'?paris-retry='+attempt:SDK.module;
 let timer;
 libraryPromise=Promise.race([
  Promise.all([loadCSS(),import(moduleUrl)]).then(([,sdk])=>{
   if(typeof sdk.Map!=='function'||typeof sdk.Marker!=='function'||typeof sdk.Popup!=='function')throw new Error('地图组件不完整');
   if(typeof sdk.getVersion==='function'&&sdk.getVersion()!==VERSION)throw new Error('地图组件版本不匹配');
   return sdk;
  }),
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('地图组件载入超时')),15000);})
 ]).finally(()=>clearTimeout(timer)).catch(error=>{libraryPromise=null;throw error;});
 return libraryPromise;
}
function routeCollection(stops,segments){
 const visible=new Set(stops.map(stop=>stop.id));
 return {type:'FeatureCollection',features:segments.filter(segment=>segment.geometry&&segment.verifiedStatus==='verified'&&['walking','driving'].includes(segment.mode)&&visible.has(segment.fromStopId)&&visible.has(segment.toStopId)).map(segment=>({type:'Feature',id:segment.id,properties:{id:segment.id,mode:segment.mode},geometry:copy(segment.geometry)}))};
}
function markerGroups(stops,places){
 const index=places instanceof Map?places:new Map((Array.isArray(places)?places:Object.values(places||{})).map(place=>[place.id,place]));
 const groups=new Map();
 for(const stop of [...stops].sort((a,b)=>a.order-b.order)){
  const place=index.get(stop.placeId);if(!finitePosition(place))continue;
  if(!groups.has(place.id))groups.set(place.id,{place,stops:[]});
  groups.get(place.id).stops.push(stop);
 }
 return [...groups.values()];
}
function flatStyle(_previous,next){
 // Liberty comparison contains an extrusion layer. This app intentionally keeps both basemaps flat.
 const style={...next,layers:(next.layers||[]).filter(layer=>layer.type!=='fill-extrusion')};
 delete style.terrain;
 return style;
}
function mount(options){
 const {container,stops=[],places=[],activities=[],segments=[],focusedStopId=null,onOpenActivity=()=>{},onStatus=()=>{},routesVisible=true}=options||{};
 if(!container||!container.ownerDocument)throw new Error('地图容器不可用');
 const document=container.ownerDocument;
 let destroyed=false,map=null,settled=false,styleLoaded=false,hadNetworkError=false,styleTimer;
 const markers=[],popups=[],domCleanups=[],mapListeners=[],frames=new Set(),framing=new Set();
 let resolveReady;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const finish=value=>{if(!settled){settled=true;resolveReady(value);}};
 function status(state,message,reason){
  if(destroyed)return;
  container.dataset.mapState=state;
  const value={state,message,...(reason?{reason}:{})};
  try{onStatus(value);}catch{/* A consumer callback must not break map cleanup. */}
  return value;
 }
 function listen(event,handler){map.on(event,handler);mapListeners.push([event,handler]);}
 function afterLayout(callback){
  const id=root.requestAnimationFrame(()=>{frames.delete(id);if(!destroyed&&map&&container.isConnected)callback();});frames.add(id);
 }
 function attributionHeight(){return container.querySelector('.maplibregl-ctrl-attrib')?.getBoundingClientRect().height||26;}
 function fitPadding(){
  const {width,height}=container.getBoundingClientRect();
  return {left:Math.min(80,width*.28),top:32,right:28,bottom:Math.min(Math.max(76,attributionHeight()+30),height*.36)};
 }
 function framePopup(popup){
  if(destroyed||!map||!popup.isOpen()||framing.has(popup))return;
  framing.add(popup);let passes=0;
  const measure=()=>{
   if(destroyed||!map||!popup.isOpen()){framing.delete(popup);return;}
   const outer=popup.getElement(),content=outer?.querySelector('.maplibregl-popup-content'),area=container.getBoundingClientRect();
   if(!outer||!content){framing.delete(popup);return;}
   const gap=10,reserved=attributionHeight()+gap;
   content.style.maxHeight=Math.max(100,area.height-reserved-gap*2-14)+'px';
   popup.setMaxWidth(Math.min(280,Math.max(140,area.width-gap*2))+'px');
   afterLayout(()=>{
    if(!popup.isOpen()){framing.delete(popup);return;}
    const box=outer.getBoundingClientRect(),now=container.getBoundingClientRect(),left=now.left+gap,right=now.right-gap,top=now.top+gap,bottom=now.bottom-reserved;
    const dx=box.left<left?box.left-left:box.right>right?box.right-right:0;
    const dy=box.top<top?box.top-top:box.bottom>bottom?box.bottom-bottom:0;
    // Move the camera, never a Stop's coordinates. Bound the number of layout passes to avoid pan loops.
    if((Math.abs(dx)>1||Math.abs(dy)>1)&&passes++<3){map.panBy([dx,dy],{duration:0});afterLayout(measure);}
    else framing.delete(popup);
   });
  };
  afterLayout(measure);
 }
 function disposeMap(){
  for(const id of frames)root.cancelAnimationFrame(id);frames.clear();framing.clear();
  clearTimeout(styleTimer);
  for(const cleanup of domCleanups.splice(0))cleanup();
  for(const popup of popups.splice(0))try{popup.remove();}catch{}
  for(const marker of markers.splice(0))try{marker.remove();}catch{}
  if(map){const current=map;map=null;for(const [event,handler] of mapListeners.splice(0))try{current.off(event,handler);}catch{}try{current.stop();}catch{}try{current.remove();}catch{}}
 }
 function fallback(reason){
  if(destroyed)return;
  disposeMap();
  const p=document.createElement('p');p.className='map-fallback';
  p.textContent=reason==='locations'?'当前筛选的地点暂无可用地图坐标，请查看下方列表中的待核说明。':reason==='webgl'?'此设备暂时无法显示互动底图。下方行程地点、详情和 Google Maps 导航仍可使用。':'底图暂不可用。可继续查看下方停靠点、活动详情和 Google Maps 链接。';
  container.replaceChildren(p);
  finish(status('fallback',p.textContent,reason));
 }
 function destroy(){
  if(destroyed)return;destroyed=true;disposeMap();
  container.dataset.mapState='destroyed';finish({state:'destroyed'});
 }
 const groups=markerGroups(stops,places),activityIndex=new Map(activities.map(activity=>[activity.id,activity]));
 status('loading','正在载入矢量底图…');
 if(!groups.length){fallback('locations');return {ready,destroy};}
 (async()=>{
  let sdk;
  try{sdk=await loadLibrary();}catch{if(!destroyed)fallback('dependency');return;}
  if(destroyed||!container.isConnected){destroy();return;}
  const style=options.style||STYLES.positron;
  if(!Object.values(STYLES).includes(style)){fallback('style');return;}
  container.replaceChildren();
  try{
   map=new sdk.Map({container,style,center:[2.34,48.86],zoom:12,pitch:0,bearing:0,maxPitch:0,dragRotate:false,touchPitch:false,pitchWithRotate:false,renderWorldCopies:false,scrollZoom:false,fadeDuration:0,reduceMotion:true,attributionControl:false,transformStyle:flatStyle,canvasContextAttributes:{antialias:false,powerPreference:'low-power'}});
  }catch{fallback('webgl');return;}
  if(destroyed){disposeMap();return;}
  try{
   map.touchZoomRotate?.disableRotation();
   map.addControl(new sdk.NavigationControl({showCompass:false,visualizePitch:false}),'top-left');
   map.addControl(new sdk.AttributionControl({compact:false,customAttribution:'<a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">MapLibre</a>'}),'bottom-right');
   const lost=event=>{event.preventDefault();fallback('webgl');};
   const canvas=map.getCanvas();canvas.addEventListener('webglcontextlost',lost);domCleanups.push(()=>canvas.removeEventListener('webglcontextlost',lost));
   const bounds=new sdk.LngLatBounds();
   for(const group of groups){
    const {place}=group,position=[place.lng,place.lat];bounds.extend(position);
    const markerButton=document.createElement('button');markerButton.type='button';markerButton.className='paris-stop-marker';markerButton.dataset.placeId=place.id;markerButton.dataset.stopIds=JSON.stringify(group.stops.map(stop=>stop.id));
    const number=document.createElement('span');number.textContent=group.stops.map(stop=>stop.order).join('/');markerButton.appendChild(number);markerButton.setAttribute('aria-expanded','false');
    markerButton.setAttribute('aria-label',`${place.name}，行程第 ${group.stops.map(stop=>stop.order).join('、')} 站`);
    const box=document.createElement('div');box.className='paris-map-popup';
    const title=document.createElement('strong');title.textContent=place.name;box.appendChild(title);
    const label=document.createElement('p');label.className='tiny';label.textContent=[place.address||place.en,'地点参考；完整定位说明见活动详情。'].filter(Boolean).join(' · ');box.appendChild(label);
    for(const stop of group.stops){
     const button=document.createElement('button');button.type='button';button.className='secondary-btn full';button.dataset.mapActivityId=stop.activityId;button.dataset.stopId=stop.id;const activity=activityIndex.get(stop.activityId);button.textContent=`${stop.order}. ${activity?.timeLabel?activity.timeLabel+' · ':''}${activity?.title||stop.label||place.name}`;
     const open=()=>{if(!destroyed)onOpenActivity(stop.activityId,button,stop.id);};button.addEventListener('click',open);domCleanups.push(()=>button.removeEventListener('click',open));box.appendChild(button);
    }
    const popup=new sdk.Popup({closeButton:true,closeOnClick:true,focusAfterOpen:true,maxWidth:'280px',offset:20}).setDOMContent(box);popups.push(popup);
    const opened=()=>{markerButton.setAttribute('aria-expanded','true');framePopup(popup);},closed=()=>{markerButton.setAttribute('aria-expanded','false');framing.delete(popup);};popup.on('open',opened);popup.on('close',closed);domCleanups.push(()=>{popup.off('open',opened);popup.off('close',closed);});
    const marker=new sdk.Marker({element:markerButton,anchor:'center'}).setLngLat(position).setPopup(popup).addTo(map);markers.push(marker);
    if(group.stops.some(stop=>stop.id===focusedStopId))marker.togglePopup();
   }
   const collection=routeCollection(stops,segments);
   if(routesVisible)for(const feature of collection.features)for(const coordinate of feature.geometry.coordinates)bounds.extend(coordinate);
   let padding=fitPadding();map.fitBounds(bounds,{padding,maxZoom:15,duration:0});
   function fitCredits(force=false){const next=fitPadding();if(force||JSON.stringify(next)!==JSON.stringify(padding)){padding=next;map.fitBounds(bounds,{padding,maxZoom:15,duration:0});}for(const popup of popups)if(popup.isOpen())framePopup(popup);}
   listen('resize',()=>fitCredits(true));
   function styleReady(){
    if(destroyed||!map)return;styleLoaded=true;clearTimeout(styleTimer);
    try{
     if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:collection});
     for(const mode of ['walking','driving'])if(!map.getLayer(LAYERS[mode]))map.addLayer({id:LAYERS[mode],type:'line',source:SOURCE,filter:['==',['get','mode'],mode],layout:{visibility:routesVisible?'visible':'none','line-cap':'round','line-join':'round'},paint:{'line-color':COLORS[mode],'line-width':mode==='walking'?3.5:4,'line-opacity':.88}});
     // Rejecting style/network resources leaves the list usable; a partial map is visibly labelled.
     const value=hadNetworkError?status('degraded','部分底图未能载入。已存路径、停靠点和下方导航仍可使用。','network'):status('ready','矢量底图已载入；路径为预先核验的参考路线。');
     fitCredits();finish(value);
    }catch{fallback('style');}
   }
   listen('style.load',styleReady);
   listen('error',event=>{
    if(destroyed)return;
    hadNetworkError=true;
    const message=String(event?.error?.message||'');
    if(/webgl|gpu|context lost/i.test(message)){fallback('webgl');return;}
    if(!styleLoaded){
     // Style, worker or initial tile errors must not strand an empty canvas until a long timeout.
     fallback('network');return;
    }
    status('degraded','部分底图未能载入。已存路径、停靠点和下方导航仍可使用。','network');
   });
   styleTimer=setTimeout(()=>{if(!destroyed&&!styleLoaded)fallback('timeout');},15000);
   if(map.isStyleLoaded())styleReady();
  }catch{fallback('initialization');}
 })().catch(()=>{if(!destroyed)fallback('initialization');});
 return {ready,destroy};
}
const api={VERSION,SDK,STYLES,SOURCE,LAYERS,COLORS,loadLibrary,mount,routeCollection,markerGroups};
root.ParisMapRenderer=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
