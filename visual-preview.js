/* Phase 2 review fixtures only. No personal storage, migration, booking or sync writes. */
(function(root){
'use strict';
function mount({trip,loadLeaflet,mapLinks,safe}){
 const dialog=document.getElementById('design-preview-dialog');
 const host=document.getElementById('design-preview-content');
 const days=[
  {date:'07',weekday:'周一',theme:'抵达 · 橘园 · 夜游',hotel:'Marquis Faubourg Saint-Honoré',items:[
   ['08:00–12:30','抵达 CDG · 酒店寄存行李',null,'抵达后入境、取行李，前往 Marquis。入住时间不保证。'],
   ['12:30–14:30','福宝街 · 马德莱娜 · 旺多姆','vendome','挑重点散步，不深逛全部。'],
   ['14:45–16:00','橘园美术馆',null,'目标时间；Carte Blanche 办理方式与入场另行确认。'],
   ['16:00–17:30','杜乐丽花园 · 协和广场','tuileries','之后如何衔接游船取决于最终船型与登船点。'],
   ['时间待核','塞纳河夜游 · 周一首选',null,'船公司、产品、时间和码头存在源文件冲突。周一未成行才改周四，只乘一次。']
  ]},
  {date:'08',weekday:'周二',theme:'歌剧院 · 皇家宫殿 · 蒙马特',hotel:'Grand Hôtel du Palais Royal',items:[
   ['10:00–11:30','巴黎歌剧院','opera','目标场次与开放范围待核。'],['11:40–12:30','老佛爷 · 春天百货','lafayette','穹顶、装饰与简短逛店。'],
   ['12:30–14:15','Marquis 取包 · 换入 GHPR',null,'先寄存，不依赖提前入住。'],['14:15–14:45','皇家宫殿 · 薇薇安可选','royal','花园优先；拱廊视时间。'],['14:45–17:45','蒙马特 · 圣心堂','sacre','换店后出发，尽量保证日落前上山。']
  ]},
  {date:'09',weekday:'周三',theme:'西岱岛 · 卢森堡 · 奥赛',hotel:'GHPR → Waldorf Versailles',items:[
   ['08:15–09:00','酒店退房 · 寄存行李',null,'Grand Hôtel du Palais Royal · 4 Rue de Valois。傍晚回同一酒店取包。'],
   ['09:00–10:00','圣礼拜堂','sainte','目标场次以实际预订为准；预留安检。'],
   ['10:15–11:15','巴黎圣母院','notredame','外观与内部安排需看排队及礼拜情况。'],
   ['11:15–12:20','卢森堡公园','lux','包括前往公园及短逛；延误时缩短停留。'],
   ['12:20–13:00','前往奥赛 · 安检','orsay','打车到奥赛，预留安检和馆内餐厅入场。'],
   ['13:00–14:00','Le Restaurant 午餐','orsay','目标午餐，不保证座位或等位时间；等待过久改简餐。'],
   ['14:00–17:15','奥赛博物馆','orsay','午餐后参观，按计划约 17:15 离馆。'],
   ['17:15–18:15','返回 GHPR · 取行李',null,'返回 Grand Hôtel du Palais Royal 取包后叫车，不遗漏这次回访。'],
   ['18:15 后','前往凡尔赛 · Waldorf 入住',null,'Waldorf Astoria Versailles – Trianon Palace · 1 Boulevard de la Reine。']
  ]},
  {date:'10',weekday:'周四',theme:'凡尔赛宫 · 返回巴黎',hotel:'Waldorf → Grand Powers',items:[
   ['08:15–09:00','早餐 · Waldorf 寄存行李',null,'收好行李，寄存在前台后出发。'],['09:00–11:30','凡尔赛主宫殿 · 镜厅','versailles','目标入场时间待预约确认。'],['12:00–13:30','午餐 · 花园','versailles','天气不佳可缩短户外。'],['13:45–16:00','特里亚农宫','trianon','王后村庄视天气、开放与时间。'],['16:00 后','Waldorf 取包 · 回 Grand Powers',null,'返回巴黎时段为预计，不保证实时路况。'],['仅周一未成行','塞纳河游船 · 后备',null,'只乘一次；船班、产品和码头仍待确认。']
  ]},
  {date:'11',weekday:'周五',theme:'凯旋门 · 购物 · 卢浮宫',hotel:'Grand Powers · 连住',items:[
   ['08:45–09:45','凯旋门外观','arc','只看外观，不安排登顶。'],['09:45–11:50','香榭丽舍 · George V 购物','champs','沿酒店方向散步。'],['11:50–12:30','回酒店放购物袋 · 午餐',null,'Grand Powers 连住，无需换房。'],['下午 · 时段待核','卢浮宫中文私人导览','louvre','源文档同时出现 13:30–16:30 与 16:30–20:00，不能任选其一。集合点、实际预约和导览后留馆规则待确认。'],['晚间','返回 Grand Powers · 晚餐',null,'游船已经放在周一/周四条件安排，不重复添加。']
  ]},
  {date:'12',weekday:'周六',theme:'铁塔约拍 · 换店 · 玛黑',hotel:'Grand Powers → Maison Astor',items:[
   ['09:00 左右','特罗卡德罗 · 铁塔约拍','trocadero','约拍时间与集合点未确认，不表示已预约。'],['11:00–13:30','回 Grand Powers 取包 · 换店',null,'摄影后回旧酒店取箱，再去 Maison Astor · 11 Rue d’Astorg。'],['13:30 后','玛黑区 · 孚日广场','vosges','设计小店、咖啡馆；可选地点视时间。']
  ]},
  {date:'13',weekday:'周日',theme:'鹿特丹 · 全天一日游',hotel:'Maison Astor · 连住',items:[
   ['全天 · 待核','巴黎北站 ↔ 鹿特丹',null,'Eurostar 往返运营、施工与订票状态待核，不填猜测的去程发车时刻。'],['目标安排','Kinderdijk 风车群',null,'WaterShuttle 冬季时刻待确认。'],['15:30–17:00 目标','Fenix 美术馆 + Tornado',null,'源文档目标时段，非已预约。'],['17:20 后 目标','Markthal · Cube Houses',null,'市内交通均为规划缓冲，非实时 ETA。'],['18:58 目标','Eurostar 返回巴黎',null,'目标车次未确认，不表示已出票。']
  ]},
  {date:'14',weekday:'周一',theme:'圣日耳曼 · 购物 · 返程',hotel:'Maison Astor · 退房取包',items:[
   ['09:00–10:15','早餐 · 退房寄存行李',null,'Maison Astor，购物结束后回店取包。'],['10:30–12:00','圣日耳曼街区','saintgermain','咖啡与漫步，不补游卢森堡公园。'],['12:00–15:45','Le Bon Marché · 午餐购物',null,'优先购买重点商品。'],['16:00 左右','返回 Maison Astor 取行李',null,'保留机场缓冲。'],['17:00–17:30 目标','前往 CDG',null,'打车出发为目标，实际交通需核对。'],['22:20','CDG 起飞',null,'以实际航班及航空公司要求为准。']
  ]}
 ];
 const taskExamples=[
  {title:'确认卢浮宫私人导览时段',priority:'高',meta:'官方主题示例 · 12/11 · 预约待核',state:'open'},
  {title:'核实 Eurostar 与 WaterShuttle',priority:'高',meta:'官方主题示例 · 12/13 · 班次待核',state:'open'},
  {title:'确定游船产品与登船码头',priority:'高',meta:'官方主题示例 · 周一首选 / 周四后备',state:'open'},
  {title:'出门前带上充电宝',priority:'中',meta:'本地任务示例 · 不会创建真实任务',state:'open'},
  {title:'检查随身充电器',priority:'中',meta:'已完成状态示例 · 不是实际记录',state:'done'},
  {title:'旧行程草稿任务',priority:'低',meta:'归档样式示例 · 归档不等于完成',state:'archived'}
 ];
 let screen='days',dayIndex=2,selected=5,taskFilter='open',map=null,generation=0,trigger=null;
 // Review shortcuts only. Activity Detail is never an independent final-app nav destination.
 const labels={days:'每日行程',detail:'详情预览',map:'每日地图',todo:'To-do'};
 function cleanupMap(){generation++;if(map){map.stop();map.remove();map=null;}}
 function close(){dialog.close();}
 function itemTitle(item){return safe(item[1]);}
 function timeLabel(label){const parts=label.split('–');return parts.length===2?`${safe(parts[0])}<small>${safe(parts[1])}</small>`:safe(label);}
 function renderHeader(day){
  const item=day.items[selected]||day.items[0];
  if(screen==='detail')return `<header class="preview-header"><div class="detail-kicker">ACTIVITY DETAILS · 样式预览</div><h1 tabindex="-1">${itemTitle(item)}</h1><p>12/${day.date} · ${safe(item[0])} · 巴黎时间</p></header>`;
  return `<header class="preview-header"><div class="detail-kicker">PARIS / DECEMBER 2026</div><h1 tabindex="-1">${screen==='todo'?'准备好，再出发':`12 / ${day.date} · ${day.weekday}`}</h1><p>${screen==='todo'?'官方事项与个人小事，放在同一个清单。':safe(day.theme)}</p></header>`;
 }
 function render(focusTarget='.preview-header h1'){
  cleanupMap();const day=days[dayIndex];
  host.innerHTML=`<div class="preview-topbar"><span>PHASE 2 · 视觉预览</span><button class="preview-control" type="button" data-preview-close aria-label="退出视觉预览">退出 ×</button></div><div class="preview-notice">v4.12 内容样本 · 不修改本机行程，不保存或同步</div>${renderHeader(day)}${screen!=='todo'&&screen!=='detail'?`<div class="preview-dates" aria-label="预览日期">${days.map((d,i)=>`<button type="button" class="preview-date ${i===dayIndex?'active':''}" data-preview-day="${i}" aria-pressed="${i===dayIndex}"><small>${safe(d.weekday)}</small><strong>${d.date}</strong></button>`).join('')}</div>`:''}<div class="preview-content">${screen==='days'?renderDays(day):screen==='detail'?renderDetail(day):screen==='map'?renderMap(day):renderTodo()}</div><nav class="preview-nav" aria-label="设计预览页面">${Object.entries(labels).map(([key,label])=>`<button type="button" data-preview-screen="${key}" class="${key===screen?'active':''}" aria-current="${key===screen?'page':'false'}">${label}</button>`).join('')}</nav>`;
  const focus=host.querySelector(focusTarget);focus?.focus({preventScroll:true});
  if(focus?.matches('[data-preview-day]'))focus.scrollIntoView({block:'nearest',inline:'nearest'});
  if(screen==='map')initializeMap(day,generation);
 }
 function renderDays(day){return `<section class="preview-screen"><div class="section-head"><h2 class="detail-kicker">DAILY ITINERARY</h2><span class="preview-version">v4.12 样本</span></div><div class="preview-timeline">${day.items.map((item,i)=>`<button type="button" class="preview-row" data-preview-item="${i}"><span class="preview-time">${timeLabel(item[0])}</span><span class="preview-name">${itemTitle(item)}<span aria-hidden="true">›</span></span></button>`).join('')}</div><div class="preview-day-note"><strong>今晚住宿</strong><p>${safe(day.hotel)}</p></div><p class="notes-hint">时间为来源文件中的建议或目标，非预约确认。点活动查看详情样式。</p></section>`;}
 function renderDetail(day){const item=day.items[selected]||day.items[0],place=trip.locations[item[2]];
  return `<section class="preview-screen"><button class="preview-control" type="button" data-preview-screen="days">← 返回当日行程</button><div class="detail-section"><p class="detail-status">${item[1].includes('午餐')?'目标午餐 · 不保证座位':'计划 / 待核 · 非预约确认'}</p></div><section class="detail-section"><h3 class="detail-label">执行说明</h3><p class="detail-copy">${safe(item[3])}</p></section><section class="detail-section"><h3 class="detail-label">地点与导航</h3><strong>${place?safe(place.en):'地址或导航目标待核'}</strong><p class="detail-copy">${place?'使用已有景点参考坐标，实际入口或集合点需再核对。':'没有已核实的坐标，不生成导航目标。'}</p>${place?mapLinks(place):''}</section><section class="detail-section"><label for="preview-note" class="detail-label">我的备注 · 样式示例</label><textarea id="preview-note" class="note-input preview-disabled" readonly aria-describedby="preview-note-hint" placeholder="记录集合位置、现场注意事项……"></textarea><p class="notes-hint" id="preview-note-hint">仅展示输入框样式，未接入保存，也不读取你的私人备注。</p></section><button type="button" class="secondary-btn full" data-preview-screen="todo">查看关联待办样式 →</button></section>`;
 }
 function renderMap(day){const known=knownPlaces(day);return `<section class="preview-screen"><div class="section-head"><h2 class="detail-kicker">DAILY MAP</h2><span class="preview-version">图钉样式</span></div><p class="notes-hint">已有景点坐标用于真实底图。酒店等待核目标只保留文字；道路动线尚未接入。</p><div class="preview-map map-frame"><div id="preview-leaflet" style="height:100%"><div class="map-fallback">地图正在加载；下方地点列表始终可用。</div></div></div><p id="preview-map-status" class="map-hint" role="status">仅显示参考图钉，不表示入口或路线已核验。</p><div class="preview-map-list">${day.items.map((item,i)=>`<div class="location-row"><span class="location-number">${i+1}</span><div class="location-copy"><button type="button" class="preview-control" data-preview-item="${i}">${itemTitle(item)} →</button><small>${safe(item[0])}${item[2]?' · 景点参考位置':' · 导航目标待核'}</small></div></div>`).join('')}</div>${known.length?'':'<p class="notes-hint">当天样本尚无可复用坐标，不猜测地点或绘制路线。</p>'}</section>`;}
 function renderTodo(){return `<section class="preview-screen"><div class="section-head"><h2 class="detail-kicker">TO-DO LIST</h2><span class="preview-version">示例状态</span></div><div class="preview-notice">以下勾选与归档仅作设计示例，不代表你的真实准备进度。</div><div class="preview-tabs" aria-label="待办样式状态">${[['open','未完成'],['done','已完成'],['archived','已归档']].map(([key,label])=>`<button class="preview-control ${key===taskFilter?'active':''}" type="button" data-preview-filter="${key}" aria-pressed="${key===taskFilter}">${label}</button>`).join('')}</div><div class="preview-timeline">${taskExamples.filter(t=>t.state===taskFilter).map(t=>`<div class="preview-todo-item"><input class="preview-check" type="checkbox" disabled ${t.state==='done'?'checked':''} aria-label="${safe(t.title)}（不可操作的状态示例）"><div><span class="preview-priority">${t.priority}优先级</span><h3>${safe(t.title)}</h3><p class="preview-task-meta">${safe(t.meta)}</p></div></div>`).join('')}</div><button class="primary-btn full preview-disabled" type="button" disabled>＋ 本地任务 · 尚未接入</button><p class="notes-hint">本地任务、完成状态与独立同步将在后续阶段接入。现有预约勾选和备注仍在主导航的「预约」。</p></section>`;}
 function knownPlaces(day){const seen=new Set();return day.items.flatMap((item,i)=>{const key=item[2],place=trip.locations[key];if(!place||seen.has(key))return [];seen.add(key);return [{place,index:i,key}];});}
 async function initializeMap(day,token){
  const target=document.getElementById('preview-leaflet'),known=knownPlaces(day);if(!known.length){target.innerHTML='<div class="map-fallback">导航目标待核<br>下方保留当日地点清单</div>';return;}
  try{
   await loadLeaflet();if(token!==generation||!dialog.open||screen!=='map')return;
   target.innerHTML='';map=L.map(target,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([48.858,2.34],13);
   const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
   tiles.on('tileerror',()=>{if(token===generation){const status=document.getElementById('preview-map-status');if(status)status.textContent='部分底图暂不可用，地点清单和详情仍可查看。';}});
   const markers=known.map(({place,index})=>L.marker([place.lat,place.lng],{title:place.name,icon:L.divIcon({className:'',html:`<span class="map-marker"><span>${index+1}</span></span>`,iconSize:[28,32],iconAnchor:[14,30]})}).addTo(map).on('click',()=>{selected=index;screen='detail';render();}));
   if(markers.length>1)map.fitBounds(L.featureGroup(markers).getBounds().pad(.2),{maxZoom:14,animate:false});
   else map.setView(markers[0].getLatLng(),14);
  }catch(error){if(token===generation&&dialog.open)target.innerHTML='<div class="map-fallback">街道地图需要联网<br>下方地点清单仍可查看详情和导航</div>';}
 }
 host.addEventListener('click',event=>{
  if(event.target.closest('[data-preview-close]')){close();return;}
  const day=event.target.closest('[data-preview-day]');if(day){dayIndex=Number(day.dataset.previewDay);selected=0;render(`[data-preview-day="${dayIndex}"]`);return;}
  const item=event.target.closest('[data-preview-item]');if(item){selected=Number(item.dataset.previewItem);screen='detail';render();return;}
  const view=event.target.closest('[data-preview-screen]');if(view){screen=view.dataset.previewScreen;render();return;}
  const filter=event.target.closest('[data-preview-filter]');if(filter){taskFilter=filter.dataset.previewFilter;render(`[data-preview-filter="${taskFilter}"]`);}
 });
 document.getElementById('design-preview-btn').addEventListener('click',()=>{trigger=document.activeElement;screen='days';dayIndex=2;selected=5;taskFilter='open';dialog.showModal();render();});
 dialog.addEventListener('close',()=>{cleanupMap();if(trigger?.isConnected)trigger.focus({preventScroll:true});});
}
root.ParisVisualPreview={mount};
})(window);
