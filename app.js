(() => {
'use strict';
const trip = window.PARIS_TRIP;
if (!trip) { document.getElementById('main-content').textContent='行程文件未加载，请确认 trip-data.js 与网页在同一文件夹。'; return; }
const main = document.getElementById('main-content');
const personal = window.ParisPersonal;
const itinerary = window.ParisItinerary;
const loaded = personal.read({ getItem: key => localStorage.getItem(key) });
try { loaded.data=itinerary.validate(trip,loaded.data); }
catch(error){loaded.error=error;loaded.data=personal.normalize({});}
let saved = loaded.data;
let expectedRaw = loaded.raw, storageConflict = false;
let creatingActivity = false;
const currentDays = () => itinerary.days(trip, saved);
const storageBlocked = Boolean(loaded.error);
let editingActivity = null, editorTrigger = null;
let tab='days', dayIndex=0, mapFilter='all', mapInstance=null, leafletPromise=null;
let toastTimer=null, mapGeneration=0;

const icons={
 pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
 calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>'
};
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(n)=>String(n).padStart(2,'0');
const mapHref=window.ParisMapLinks.view;
function mapLinks(place){
 return `<span class="map-links"><a class="text-link" href="${safe(mapHref(place))}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 查看 ${safe(place.name)}">${icons.pin} Google Maps</a><a class="text-link" href="${safe(window.ParisMapLinks.directions(place,'walking'))}" target="_blank" rel="noopener noreferrer" aria-label="用 Google Maps 步行前往 ${safe(place.name)}">步行 ↗</a><a class="text-link" href="${safe(window.ParisMapLinks.directions(place,'driving'))}" target="_blank" rel="noopener noreferrer" aria-label="用 Google Maps 驾车前往 ${safe(place.name)}">驾车 ↗</a></span>`;
}
function save(next) {
 if (storageBlocked) { showToast('原有数据无法读取，已暂停保存。请先检查浏览器存储或备份。'); return false; }
 try {
  saved = personal.write(localStorage, next, expectedRaw);
  expectedRaw = JSON.stringify(saved);return true;
 }catch(error){
  if(error.code==='STORAGE_CONFLICT'){storageConflict=true;showStorageConflict();showToast(error.message);}
  else showToast('未保存：本机存储不可用，请保留输入并重试');
  return false;
 }
}
const showToast=message=>{const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2400)};
function prettyDate(s) { const [y,m,d]=s.split('-');return `${Number(m)}月${Number(d)}日` }
function getParisToday(){try{const ps=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:trip.timezone}).formatToParts(new Date());const m=Object.fromEntries(ps.map(p=>[p.type,p.value]));return `${m.year}-${m.month}-${m.day}`}catch(e){return ''}}
function getCountdown(){
 const today=getParisToday(); if(!today)return '8 DAYS IN PARIS';
 const day=Date.parse(today+'T00:00:00Z'), start=Date.parse(trip.startDate+'T00:00:00Z'), end=Date.parse(trip.endDate+'T00:00:00Z');
 if(day<start)return `距离巴黎还有 ${Math.ceil((start-day)/86400000)} 天`;
 if(day<=end)return 'BONJOUR, PARIS!';
 return 'OUR PARIS MEMORIES';
}
function hero(){return `<section class="hero">
 <svg class="eiffel-art" viewBox="0 0 170 238" aria-hidden="true"><path d="M84 11v10m-15 6h30M83 19l-4 18-6 26-12 38-11 30-13 30-19 39M85 19l4 18 6 26 12 38 11 30 13 30 19 39M24 197h126M38 170h94M52 135h65M61 108h47M73 64h23M18 197c24-10 39-8 56-5m24 0c17-3 32-5 52 5M47 140c17-11 59-11 77 0M54 122c16-5 48-5 63 0"/><path d="M50 169c22-29 49-29 73 0M75 40h18m-19 8h20"/></svg>
 <div class="hero-content"><div class="eyebrow">DÉCEMBRE 2026 · PARIS, FRANCE</div><h1 class="hero-title">Paris, at our pace<small>我们的巴黎慢旅行</small></h1><div class="hero-hr"></div><div class="hero-sub">2026.12.07 — 12.14<br>第一次巴黎 · 两个人 · 冬日圣诞季</div></div><span class="hero-badge">${safe(getCountdown())}</span>
 </section><div class="top-meta"><div class="meta-item"><span class="meta-value">8 DAYS</span><span class="meta-label">12/7–12/14</span></div><div class="meta-item"><span class="meta-value">7 NIGHTS</span><span class="meta-label">七晚巴黎</span></div><div class="meta-item"><span class="meta-value">2 PEOPLE</span><span class="meta-label">我们的旅行</span></div></div>`}
function typeChip(type){return type==='必去'?'<span class="chip chip-gold">必去</span>':type==='交通'?'<span class="chip chip-gray">交通</span>':type==='景点'?'<span class="chip chip-green">景点</span>':type==='体验'?'<span class="chip chip-coral">体验</span>':''}
function renderActivity(activity,i,total){const place=activity.place && trip.locations[activity.place]; const extras=(activity.extraPlaces||[]).map(x=>trip.locations[x]).filter(Boolean);const bn=activity.booking && trip.bookings.find(b=>b.id===activity.booking);const checked=bn && saved.booked.includes(bn.id);
 return `<div data-activity-id="${safe(activity.id)}" class="time-row ${activity.type==='必去'||activity.fixed?'important':''}"><div class="time-col">${safe(activity.time)}${activity.end?`<span class="to">${safe(activity.end)}</span>`:''}</div><div class="line-col"><span class="dot"></span>${i+1<total?'<span class="thread"></span>':''}</div><div class="activity-card"><div class="activity-top"><div class="activity-title">${safe(activity.title)}</div>${typeChip(activity.type)}</div><div class="activity-description">${safe(activity.detail)}</div><div class="activity-actions">${place?`${extras.length?`<span class="map-place-label">${safe(place.name)}</span>`:''}${mapLinks(place)}`:''}${extras.map(x=>`<span class="map-place-label">${safe(x.name)}</span>${mapLinks(x)}`).join('')}${bn?`<button class="text-link dark" type="button" data-action="go-booking" data-id="${safe(bn.id)}">${icons.calendar} ${checked?'已标记预约':'待预约'}</button>`:''}<button class="text-link edit-activity" type="button" data-action="edit-activity" data-id="${safe(activity.id)}" aria-label="编辑 ${safe(activity.title)}">编辑${saved.customActivities[activity.id]?' · 新增':saved.activityOverrides[activity.id]?' · 已修改':''}</button><button class="text-link reorder-activity" type="button" data-action="move-up" data-id="${safe(activity.id)}" aria-label="上移 ${safe(activity.title)}" ${i===0?'disabled':''}>↑ 上移</button><button class="text-link reorder-activity" type="button" data-action="move-down" data-id="${safe(activity.id)}" aria-label="下移 ${safe(activity.title)}" ${i+1===total?'disabled':''}>↓ 下移</button></div></div></div>`}
function renderDays(){const d=currentDays()[dayIndex], today=getParisToday();
 const deleted=itinerary.all(trip,saved).filter(a=>a.date===d.date&&saved.deletedActivityIds.includes(a.id));main.innerHTML=hero()+`<section class="content"><div class="section-head"><div><div class="mini-caps">DAILY ITINERARY</div><h2 class="section-title">每日行程</h2></div><span class="section-aside">所有时间为巴黎当地时间<br>可点击切换日期</span></div>
 <div class="date-strip" role="tablist" aria-label="选择旅行日期">${trip.days.map((x,i)=>`<button class="date-chip ${dayIndex===i?'active':''} ${today===x.date?'today':''}" type="button" role="tab" aria-selected="${dayIndex===i}" data-day="${i}"><small>${safe(x.weekday)}</small><strong>${x.date.slice(-2)}</strong><small>DEC</small></button>`).join('')}</div>
 <section class="day-hero"><div class="mini-caps">DAY ${num(dayIndex+1)} / ${prettyDate(d.date)} · ${safe(d.weekday)}</div><h3 class="day-headline">${safe(d.theme)}</h3><div class="day-subline">${safe(d.area)} · ${safe(d.mood)}</div><div class="day-highlight">✦ 今日重点：${safe(d.highlight)}</div></section>
 <div class="section-head"><div><div class="mini-caps">THE PLAN</div><h2 class="section-title" style="font-size:21px">Today's moments</h2></div><span class="section-aside">${d.activities.length} 项安排</span></div>
 <button class="secondary-btn full add-activity" type="button" data-action="add-activity">＋ 添加活动</button>
 <div class="timeline">${d.activities.map((a,i)=>renderActivity(a,i,d.activities.length)).join('')||'<p class="empty-day">这一天还没有活动。可以添加活动，或恢复已删除的安排。</p>'}</div>
 ${deleted.length?`<details class="deleted-activities"><summary>已删除的安排（${deleted.length}）</summary>${deleted.map(a=>`<div class="deleted-row"><span>${safe(a.title)}</span><button class="secondary-btn" type="button" data-action="restore-activity" data-id="${safe(a.id)}" aria-label="恢复 ${safe(a.title)}">恢复</button></div>`).join('')}</details>`:''}
 <div class="day-footer"><div class="footer-lead">✦ 今日温馨提示</div><p class="footer-text">${safe(d.note)}</p></div>
 <div class="notes-box"><label class="field-title" for="day-note">我的 ${prettyDate(d.date)} 随手记</label><textarea class="note-input" id="day-note" data-note-day="${d.date}" placeholder="例如：想去的餐厅、补充景点、实际预约时间……">${safe(saved.dayNotes[d.date]||'')}</textarea><p class="notes-hint">文字自动保存在这台设备。点击「编辑」可调整日期、时间和描述；上移/下移可调整顺序；旅行卡片中可导出备份。</p></div></section>`;
}
function bookingGroup(items,label){return `<div class="group-label">${label}</div>${items.map(b=>{const done=saved.booked.includes(b.id);return `<article class="card"><div class="booking-row"><input type="checkbox" class="book-check" id="book-${b.id}" data-book="${b.id}" ${done?'checked':''}><div class="booking-content"><label for="book-${b.id}" class="booking-title ${done?'done':''}">${safe(b.title)}</label><div class="booking-date">${safe(b.date)}</div><div class="booking-note">${safe(b.note)}</div>${b.url?`<div class="booking-actions"><a class="mini-link" href="${safe(b.url)}" target="_blank" rel="noopener noreferrer">官方入口 ${icons.arrow}</a></div>`:''}<textarea class="inline-note" data-booking-note="${b.id}" rows="2" aria-label="${safe(b.title)} 的预订备注" placeholder="确认号、票价、集合点等……">${safe(saved.bookingNotes[b.id]||'')}</textarea></div>${done?'<span class="chip chip-green tag-right">已标记</span>':''}</div></article>`}).join('')}`}
function renderBookings(){const done=trip.bookings.filter(b=>saved.booked.includes(b.id)).length;const high=trip.bookings.filter(b=>b.priority==='high'),mid=trip.bookings.filter(b=>b.priority==='medium'),later=trip.bookings.filter(b=>b.priority==='later');main.innerHTML=`<section class="page-heading"><div class="mini-caps">KEEP IT SIMPLE</div><h1>预订清单</h1><p>先锁定最影响行程的项目。勾选仅表示你已完成预订，不会自动购买门票。</p></section><section class="page-body"><div class="progress-header"><span>我们的准备进度</span><strong>${done} / ${trip.bookings.length}</strong></div><div class="progress-bg"><div class="progress-inner" style="width:${(done/trip.bookings.length)*100}%"></div></div><div class="callout">所有项目目前都是拟定安排，并非已出票。预订确认号可以记在各项目下方，信息只保存在这台设备。</div>${bookingGroup(high,'01 · 尽快确定')}${bookingGroup(mid,'02 · 提前预约')}${bookingGroup(later,'03 · 临近再看')}</section>`}
function uniquePlacesForDay(i){const seen=new Set();const list=[];currentDays()[i].activities.forEach(a=>{[a.place,...(a.extraPlaces||[])].forEach(key=>{if(key && trip.locations[key] && !seen.has(key)){list.push({key,day:i,place:trip.locations[key]});seen.add(key)}})});return list}
function allPlaces(){return trip.days.flatMap((d,i)=>uniquePlacesForDay(i))}
function renderMap(){if(mapInstance){mapInstance.stop();mapInstance.remove();mapInstance=null;}const generation=++mapGeneration;mapFilter=mapFilter??'all';const raw=mapFilter==='all'?allPlaces():uniquePlacesForDay(Number(mapFilter));const seen=new Set();const places=raw.filter(item=>!seen.has(item.key)&&seen.add(item.key));main.innerHTML=`<section class="page-heading"><div class="mini-caps">WHERE WE WANDER</div><h1>巴黎地图</h1><p>按日期查看行程地点，用 Google Maps 查看位置或选择步行、驾车导航。</p></section><section class="page-body"><div class="map-filter"><button class="filter-btn ${mapFilter==='all'?'selected':''}" data-map-filter="all">全部</button>${trip.days.map((d,i)=>`<button class="filter-btn ${String(i)===mapFilter?'selected':''}" data-map-filter="${i}">12/${7+i} ${safe(d.weekday)}</button>`).join('')}</div><div class="map-frame" id="map-container"><div id="leaflet-target" style="height:100%;width:100%"><div class="map-fallback">正在载入在线街道地图…<br>下方地点列表可随时用于导航</div></div></div><p class="map-hint">定位采用景点经纬度，非导览集合处、出租车上下客点或游船具体码头。互动街道底图需联网。导航起点由 Google Maps 获取或由你填写；请核对实际入口。</p><div class="section-head"><h2 class="section-title" style="font-size:21px">${mapFilter==='all'?'所有景点':`${prettyDate(trip.days[Number(mapFilter)].date)} 的景点`}</h2><span class="section-aside">${places.length} 个位置</span></div>${places.map((item,i)=>`<div class="location-row"><span class="location-number">${i+1}</span><div class="location-copy"><strong>${safe(item.place.name)}</strong><small>${safe(item.place.en)} · ${mapFilter==='all'?`12/${item.day+7}`:''}</small>${item.place.info?`<small>${safe(item.place.info)}</small>`:''}${mapLinks(item.place)}</div></div>`).join('')}</section>`;
 initializeLeaflet(places,generation);
}
function loadLeaflet(){ if(window.L) return Promise.resolve();if(leafletPromise)return leafletPromise;
 leafletPromise=new Promise((resolve,reject)=>{let finished=false;const good=()=>{if(!finished){finished=true;resolve()}};const bad=(err)=>{if(!finished){finished=true;reject(err)}};setTimeout(()=>bad(new Error('地图加载超时')),7000);const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.crossOrigin='anonymous';document.head.appendChild(link);const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.crossOrigin='anonymous';script.onload=()=>window.L?good():bad(new Error('地图引擎未加载'));script.onerror=()=>bad(new Error('离线 / 地图资源不可用'));document.head.appendChild(script)});return leafletPromise;
}
async function initializeLeaflet(places,generation){try{await loadLeaflet();if(tab!=='map'||generation!==mapGeneration)return;const target=document.getElementById('leaflet-target');if(!target)return;
 if(mapInstance){mapInstance.remove();mapInstance=null;}
 target.innerHTML='';mapInstance=L.map(target,{zoomControl:true,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([48.864,2.33],12);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(mapInstance);
 const markers=[];places.forEach((item,i)=>{const icon=L.divIcon({className:'',html:`<span class="map-marker"><span>${i+1}</span></span>`,iconSize:[28,32],iconAnchor:[14,30]});const marker=L.marker([item.place.lat,item.place.lng],{icon,title:item.place.name}).addTo(mapInstance).bindPopup(`<strong>${safe(item.place.name)}</strong><br>${safe(item.place.en)}<br>${mapLinks(item.place)}`);markers.push(marker)});
 if(markers.length>1)mapInstance.fitBounds(L.featureGroup(markers).getBounds().pad(.18),{maxZoom:14,animate:false});else if(markers.length===1)mapInstance.setView(markers[0].getLatLng(),14);
 const instance=mapInstance;setTimeout(()=>{if(mapInstance===instance)instance.invalidateSize({animate:false})},200);
 }catch(e){leafletPromise=null;const target=document.getElementById('leaflet-target');if(tab==='map'&&generation===mapGeneration&&target)target.innerHTML='<div class="map-fallback"><div><strong>街道地图需要联网</strong><br>行程中的景点位置都在下方<br>下方可用 Google Maps 查看位置或选择步行、驾车</div></div>';}}
function renderMore(){main.innerHTML=`<section class="page-heading"><div class="mini-caps">THE LITTLE DETAILS</div><h1>旅行卡片</h1><p>航班、酒店、交通习惯，还有旅行路上的灵感。</p></section><section class="page-body"><div class="info-stat"><div class="stat-box"><div class="stat-eyebrow">ARRIVAL</div><strong>12/07</strong><p>08:00 · CDG<br>巴黎戴高乐机场</p></div><div class="stat-box"><div class="stat-eyebrow">DEPARTURE</div><strong>12/14</strong><p>22:20 · CDG<br>建议约 19:00 抵达机场</p></div></div><section class="card info-card"><h3>⌂ 酒店 · 暂未确定</h3><p>优先对比 Hilton / Hyatt 免房券及 Amex FHR。候选住宿区：Opéra / Madeleine / Place Vendôme / Louvre。为减少搬行李，尽量不超过一次换酒店。</p><div class="field-wrap"><label for="hotel-note">住宿预订记录</label><textarea class="note-input" id="hotel-note" data-note-field="hotelNote" placeholder="酒店名称、入住日期、确认号、FHR 权益……">${safe(saved.hotelNote)}</textarea></div></section><section class="card info-card"><h3>✈ 航班与机场</h3><p>12/7 08:00 抵达，12/14 22:20 离开。市区主要打车；12/14 出发去 CDG 的时间，要在酒店确定后按当天路况微调。</p><div class="field-wrap"><label for="flight-note">航班 / 接送机备注</label><textarea class="note-input" id="flight-note" data-note-field="flightNote" placeholder="航班号、航站楼、打车安排……">${safe(saved.flightNote)}</textarea></div></section><section class="card info-card"><h3>♡ 旅行习惯</h3><p>景点与巴黎生活各半；凡尔赛宫必去；卢浮宫安排 4–5 小时；以打车为主，景点紧邻时步行。圣诞灯饰、下午日落与咖啡馆留出灵活时间。</p></section><section class="card info-card"><h3>◈ 实用提醒</h3><ul class="tip-list">${trip.important.map(x=>`<li><strong>${safe(x.title)}：</strong>${safe(x.text)}</li>`).join('')}</ul></section><section class="card info-card"><h3>✎ 其他想法</h3><textarea class="note-input" data-note-field="miscNote" placeholder="购物愿望清单、餐厅候选、特别想去的小店……">${safe(saved.miscNote)}</textarea></section><section class="card info-card"><h3>保存与后续更新</h3><p>活动修改、勾选状态和私人笔记保存在<strong>当前浏览器 / 当前网址</strong>。同一网站发布新行程文件，会保留这些数据（已修改的活动优先使用本机版本）。换设备或换网站地址前，可以先导出备份再导入。</p><div class="btn-row"><button class="secondary-btn" data-action="export-backup">导出个人备份</button><button class="secondary-btn" data-action="import-backup">导入备份</button></div><input type="file" id="backup-file" accept="application/json,.json" hidden><div class="btn-row"><button class="primary-btn full" data-action="install-help">如何添加到 iPhone 主屏幕 ↗</button></div><p class="tiny" style="margin-top:13px">当前行程 ${safe(trip.version)} · 数据与安装说明可随时更新。</p></section></section>`}
function render(){mapGeneration++;if(mapInstance){mapInstance.stop();mapInstance.remove();mapInstance=null;}if(tab==='days')renderDays();if(tab==='bookings')renderBookings();if(tab==='map')renderMap();if(tab==='more')renderMore();document.querySelectorAll('.nav-item').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')})}
function switchTab(next){if(next===tab)return;tab=next;render();window.scrollTo({top:0,behavior:'instant'})}
function downloadBackup(){if(storageBlocked){showToast('原有数据无法读取，暂不能导出。请检查浏览器存储。');return;}const payload=personal.backup(saved,trip.version);const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='paris-pocket-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);showToast('活动修改、备注和预约进度已导出')}
async function importBackup(file){
 try {
  if(!file)return;
  if(file.size>5*1024*1024)throw new Error('备份文件过大（最多 5 MB）');
  const data=JSON.parse(await file.text());
  const next=itinerary.validate(trip,personal.restore(data,saved));
  const message=(data.schemaVersion??1)<3
    ? '这是旧版备份：替换笔记与预约状态，合并支持的活动修改，并保留当前新增、删除、日期和顺序。建议先导出当前备份。继续吗？'
    : '导入将替换本机完整活动安排、预约状态与笔记。建议先导出当前备份。继续吗？';
  if(!confirm(message))return;
  if(!save(next))return;
  render();showToast('备份导入成功');
 }catch(e){showToast(e.message||'导入失败')}
 finally { const input=document.getElementById('backup-file');if(input)input.value=''; }
}
function newActivityId(){
 const value=typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 return 'user-'+value;
}
function openActivityEditor(id, trigger){
 const activity=id?itinerary.find(trip,saved,id):{id:newActivityId(),date:trip.days[dayIndex].date,title:'',time:'',end:'',detail:''};
 if(!activity)return;
 editingActivity=activity;creatingActivity=!id;editorTrigger=trigger;
 const modal=document.getElementById('activity-dialog');
 document.getElementById('activity-title').textContent=id?'编辑活动':'添加活动';
 document.getElementById('activity-date').textContent='所有活动时间为巴黎当地时间';
 document.getElementById('activity-name').value=activity.title;
 const dateSelect=document.getElementById('activity-day');
 dateSelect.innerHTML=trip.days.map(day=>`<option value="${day.date}">${prettyDate(day.date)} · ${safe(day.weekday)}</option>`).join('');
 dateSelect.value=activity.date;
 document.getElementById('activity-time').value=activity.time;
 document.getElementById('activity-end').value=activity.end||'';
 document.getElementById('activity-detail').value=activity.detail;
 document.getElementById('activity-error').textContent='';
 document.getElementById('activity-fixed').hidden=!activity.fixed;
 document.getElementById('activity-reset').hidden=creatingActivity||Boolean(saved.customActivities[activity.id])||!saved.activityOverrides[activity.id];
 document.getElementById('activity-delete').hidden=creatingActivity;
 modal.showModal();
}
function closeActivityEditor(){document.getElementById('activity-dialog').close();}
function focusActivity(id){
 const button=Array.from(main.querySelectorAll('[data-action="edit-activity"]')).find(el=>el.dataset.id===id);
 (button||main.querySelector('[data-action="add-activity"]'))?.focus({preventScroll:true});
}
function commitActivity(edit, reset=false){
 if(!editingActivity)return;
 try {
  const id=editingActivity.id;
  const next=reset?itinerary.reset(trip,saved,id):itinerary.edit(trip,saved,id,edit,creatingActivity);
  if(!save(next)){
   document.getElementById('activity-error').textContent=storageConflict?'另一窗口已保存修改，请先导出当前备份并重新载入。输入仍保留。':'未保存。请保留输入，检查本机存储后重试。';return;
  }
  const destination=itinerary.find(trip,next,id).date;
  dayIndex=trip.days.findIndex(day=>day.date===destination);
  const y=window.scrollY;closeActivityEditor();renderDays();window.scrollTo(0,y);focusActivity(id);
  showToast(reset?'已恢复原始名称、日期、时间和描述':'活动安排已保存在本机');
 }catch(error){document.getElementById('activity-error').textContent=error.message;}
}
function changeActivity(action,id){
 try {
  const next=action==='restore-activity'?itinerary.restore(trip,saved,id):itinerary.reorder(trip,saved,id,action==='move-up'?-1:1);
  if(!save(next))return;
  const y=window.scrollY;renderDays();window.scrollTo(0,y);focusActivity(id);
  showToast(action==='restore-activity'?'活动已恢复':'活动顺序已保存');
 }catch(error){showToast(error.message);}
}
const activityDialog=document.getElementById('activity-dialog');
activityDialog.addEventListener('close',()=>{if(!activityDialog.open){editingActivity=null;creatingActivity=false;}if(editorTrigger?.isConnected)editorTrigger.focus({preventScroll:true});});
document.getElementById('activity-cancel').addEventListener('click',closeActivityEditor);
document.getElementById('activity-form').addEventListener('submit',event=>{
 event.preventDefault();commitActivity({title:document.getElementById('activity-name').value,date:document.getElementById('activity-day').value,time:document.getElementById('activity-time').value,end:document.getElementById('activity-end').value,detail:document.getElementById('activity-detail').value});
});
document.getElementById('activity-reset').addEventListener('click',()=>{
 if(confirm('恢复这项活动的原始名称、日期、时间和描述？预约状态与笔记会保留。'))commitActivity(null,true);
});
document.getElementById('activity-delete').addEventListener('click',()=>{
 if(!editingActivity||!confirm('从行程中删除这项活动？不会取消实际预约或删除预约笔记，可在「已删除的安排」中恢复。'))return;
 if(!save(itinerary.remove(trip,saved,editingActivity.id))){document.getElementById('activity-error').textContent='未删除：无法保存。请检查本机存储或另一窗口的修改。';return;}
 closeActivityEditor();renderDays();main.querySelector('[data-action="add-activity"]')?.focus({preventScroll:true});showToast('活动已删除，可在下方恢复');
});
function showStorageConflict(){
 const warning=document.getElementById('storage-warning');warning.hidden=false;
 warning.textContent='另一窗口已更新个人数据。为避免覆盖，请先导出本窗口备份，再重新载入。未保存输入可先复制。';
 document.getElementById('reload-data').hidden=false;
}
window.addEventListener('storage',event=>{if(event.key===personal.KEY||event.key===null){storageConflict=true;showStorageConflict();}});
document.getElementById('reload-data').addEventListener('click',()=>{
 if(confirm('重新载入另一窗口的最新数据？请先保存备份并复制未保存的输入。'))location.reload();
});
function installHelp(){const modal=document.getElementById('install-dialog');if(modal.showModal)modal.showModal();else modal.setAttribute('open','')}
main.addEventListener('click',e=>{
 const chip=e.target.closest('[data-day]');if(chip){dayIndex=Number(chip.dataset.day);renderDays();document.querySelector('.date-chip.active')?.scrollIntoView({block:'nearest',inline:'center'});window.scrollTo({top:0,behavior:'smooth'});return;}
 const filter=e.target.closest('[data-map-filter]');if(filter){mapFilter=filter.dataset.mapFilter;renderMap();return;}
 const action=e.target.closest('[data-action]');if(action){const name=action.dataset.action;if(name==='add-activity')openActivityEditor(null,action);else if(['move-up','move-down','restore-activity'].includes(name))changeActivity(name,action.dataset.id);else if(name==='edit-activity')openActivityEditor(action.dataset.id,action);else if(name==='go-booking')switchTab('bookings');else if(name==='install-help')installHelp();else if(name==='export-backup')downloadBackup();else if(name==='import-backup')document.getElementById('backup-file')?.click();return;}
});
main.addEventListener('change',e=>{
 if(e.target.matches('[data-book]')){
  const id=e.target.dataset.book,checked=e.target.checked;
  const booked=checked?[...new Set([...saved.booked,id])]:saved.booked.filter(x=>x!==id);
  if(!save({...saved,booked})){e.target.checked=!checked;return;}
  const y=window.scrollY;renderBookings();window.scrollTo(0,y);
  showToast(checked?'已标记为预订完成':'已恢复为待预约');
 }
 if(e.target.id==='backup-file')importBackup(e.target.files?.[0]);
});
main.addEventListener('input',e=>{
 const el=e.target;
 if(el.matches('[data-note-day]'))save({...saved,dayNotes:{...saved.dayNotes,[el.dataset.noteDay]:el.value}});
 else if(el.matches('[data-booking-note]'))save({...saved,bookingNotes:{...saved.bookingNotes,[el.dataset.bookingNote]:el.value}});
 else if(el.matches('[data-note-field]'))save({...saved,[el.dataset.noteField]:el.value});
});
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
document.getElementById('help-btn').addEventListener('click',installHelp);document.getElementById('close-dialog').addEventListener('click',()=>document.getElementById('install-dialog').close());document.getElementById('dialog-done').addEventListener('click',()=>document.getElementById('install-dialog').close());
if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
 const updateButton=document.getElementById('app-update');
 let requestedUpdate=false;
 navigator.serviceWorker.register('./sw.js').then(registration=>{
  const offerUpdate=()=>{if(registration.waiting && navigator.serviceWorker.controller)updateButton.hidden=false;};
  offerUpdate();
  registration.addEventListener('updatefound',()=>{
   const worker=registration.installing;
   worker?.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller)updateButton.hidden=false;
    else offerUpdate();
   });
  });
  updateButton.addEventListener('click',()=>{
   if(editingActivity){showToast('请先保存或取消正在编辑的活动');return;}
   if(registration.waiting){requestedUpdate=true;registration.waiting.postMessage({type:'SKIP_WAITING'});}
  });
 }).catch(()=>showToast('离线缓存暂不可用，联网后请重新打开'));
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requestedUpdate)location.reload();});
}
render();
if(storageBlocked){
 const warning=document.getElementById('storage-warning');warning.hidden=false;
 warning.textContent='原有个人数据暂时无法读取。为保护笔记，已暂停保存和导入。请检查浏览器存储后重新打开；不要清除网站数据。';
}
})();
