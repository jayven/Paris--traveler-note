/* Paris Pocket / TRIP DATA — 更新行程时优先修改这里。所有时间为巴黎当地时间。 */
window.PARIS_TRIP = {
  version: 'v1.0 · 2026.10.12',
  title: 'Paris, at our pace',
  subtitle: '第一次巴黎 · 冬日与圣诞',
  startDate: '2026-12-07',
  endDate: '2026-12-14',
  timezone: 'Europe/Paris',
  people: 2,
  hotel: '待定 · Hilton / Hyatt 免房券 / Amex FHR',
  transport: '市内以打车为主；交通拥堵时考虑地铁 / RER',
  arrival: {date:'12/07',time:'08:00',airport:'CDG',note:'早间抵达，预留入境与行李时间'},
  departure: {date:'12/14',time:'22:20',airport:'CDG',note:'建议约 19:00 到机场，视实际交通和航空公司要求调整'},
  locations: {
    vendome:    {name:'旺多姆广场',en:'Place Vendôme',lat:48.86747,lng:2.32944},
    tuileries:  {name:'杜乐丽花园',en:'Jardin des Tuileries',lat:48.86350,lng:2.32740,info:'定位为花园中心；圣诞市集的具体入口以现场为准'},
    sainte:     {name:'圣礼拜堂',en:'Sainte-Chapelle',lat:48.855278,lng:2.345000},
    notredame:  {name:'巴黎圣母院',en:'Notre-Dame de Paris',lat:48.853056,lng:2.349722},
    saintgermain:{name:'圣日耳曼德佩',en:'Saint-Germain-des-Prés',lat:48.85397,lng:2.33447},
    lux:        {name:'卢森堡公园',en:'Jardin du Luxembourg',lat:48.84671,lng:2.33637},
    louvre:     {name:'卢浮宫玻璃金字塔',en:'Pyramide du Louvre',lat:48.860932,lng:2.335902,info:'此点为金字塔；导览小团请以实际集合地址为准'},
    royal:      {name:'皇家宫殿花园',en:'Jardin du Palais-Royal',lat:48.86501,lng:2.33782},
    vivienne:   {name:'薇薇安拱廊',en:'Galerie Vivienne',lat:48.86670,lng:2.33970},
    orsay:      {name:'奥赛博物馆',en:'Musée d’Orsay',lat:48.85992,lng:2.32653},
    trocadero:  {name:'特罗卡德罗广场',en:'Place du Trocadéro',lat:48.863038,lng:2.287108},
    eiffel:     {name:'埃菲尔铁塔',en:'Tour Eiffel',lat:48.85837,lng:2.29448},
    boat:       {name:'塞纳河游船登船区',en:'Bateaux Parisiens · Port de la Bourdonnais',lat:48.86039,lng:2.29353,info:'参考登船位置，最终以运营商票面码头为准'},
    versailles: {name:'凡尔赛宫',en:'Château de Versailles',lat:48.804328,lng:2.120936},
    trianon:    {name:'大特里亚农宫',en:'Grand Trianon',lat:48.81475,lng:2.10490},
    sacre:      {name:'圣心堂',en:'Sacré-Cœur',lat:48.886944,lng:2.343056},
    tertre:     {name:'小丘广场',en:'Place du Tertre',lat:48.88643,lng:2.34087},
    opera:      {name:'巴黎歌剧院',en:'Palais Garnier',lat:48.871944,lng:2.332222},
    lafayette:  {name:'老佛爷百货',en:'Galeries Lafayette Haussmann',lat:48.87366,lng:2.33220},
    vosges:     {name:'孚日广场',en:'Place des Vosges',lat:48.85564,lng:2.36554},
    arc:        {name:'凯旋门',en:'Arc de Triomphe',lat:48.87378,lng:2.29504},
    champs:     {name:'香榭丽舍大道',en:'Avenue des Champs-Élysées',lat:48.86980,lng:2.30790}
  },
  days: [
    {
      date:'2026-12-07',weekday:'周一',theme:'抵达 · 巴黎初印象',area:'旺多姆 · 杜乐丽',mood:'慢慢开始',emoji:'✦',highlight:'圣诞灯饰与第一杯巴黎咖啡',
      note:'抵达当天以轻松为主，不安排严格的付费预约；酒店提前入住尚未确认。',
      activities:[
        {id:'d1-1',time:'08:00',end:'11:30',title:'抵达 CDG → 前往酒店',type:'交通',detail:'入境、领取行李、打车进城，寄存行李。',fixed:true},
        {id:'d1-2',time:'12:00',end:'14:00',title:'午餐、咖啡、休息',type:'生活',detail:'在酒店周边找一家咖啡馆；如果房间准备好可以先休息。'},
        {id:'d1-3',time:'14:30',end:'16:00',title:'旺多姆广场与圣奥诺雷街',type:'街区',place:'vendome',detail:'优雅的巴黎街道，适合第一天下午散步。'},
        {id:'d1-4',time:'16:30',end:'18:30',title:'杜乐丽花园圣诞市集',type:'体验',place:'tuileries',detail:'天黑后看灯饰；市集入口及 2026 营业时间临近再确认。'},
        {id:'d1-5',time:'19:00',end:'',title:'晚餐并早点休息',type:'生活',detail:'不要安排太晚，给时差留空间。'}
      ]
    },
    {
      date:'2026-12-08',weekday:'周二',theme:'历史中心与左岸生活',area:'西岱岛 · 圣日耳曼',mood:'光与古城',emoji:'✧',highlight:'圣礼拜堂的彩色玻璃',
      note:'圣礼拜堂冬季 09:00–17:00；12/8 巴黎圣母院可能有特殊宗教活动，内部参观仅作备选。',
      activities:[
        {id:'d2-1',time:'09:45',end:'11:00',title:'圣礼拜堂 Sainte-Chapelle',type:'景点',place:'sainte',detail:'优先安排上午自然光下参观。',booking:'sainte'},
        {id:'d2-2',time:'11:15',end:'12:00',title:'巴黎圣母院',type:'景点',place:'notredame',detail:'确定看外观；内部需看节日安排和免费预约情况。',booking:'notredame'},
        {id:'d2-3',time:'12:30',end:'14:00',title:'圣日耳曼区午餐',type:'生活',place:'saintgermain',detail:'适合挑一家 Bistro 或咖啡馆。'},
        {id:'d2-4',time:'14:00',end:'16:00',title:'左岸闲逛 · 卢森堡公园',type:'街区',place:'lux',detail:'书店、甜点、街巷与公园自由组合；短冬日尽量利用白天。'},
        {id:'d2-5',time:'晚上',end:'',title:'左岸晚餐 / 自由活动',type:'生活',detail:'不强制安排行程。'}
      ]
    },
    {
      date:'2026-12-09',weekday:'周三',theme:'卢浮宫深度参观',area:'卢浮宫 · 皇家宫殿',mood:'艺术的一天',emoji:'♜',highlight:'3 小时导览 + 1–2 小时自由参观',
      note:'这天将卢浮宫延长到 4–5 小时。导览后是否允许继续自由参观要提前问导游；离馆后一般不能凭原票重新入场，中午留在馆内用餐。',
      activities:[
        {id:'d3-1',time:'09:00',end:'12:00',title:'卢浮宫英文小团导览',type:'必去',place:'louvre',detail:'优先选 6–8 人或更小团队，导览时间 2–3 小时。',booking:'louvre'},
        {id:'d3-2',time:'12:00',end:'13:00',title:'馆内午餐与休息',type:'生活',detail:'不要为了吃午饭出馆后再尝试重新进入。'},
        {id:'d3-3',time:'13:00',end:'14:30',title:'卢浮宫自由参观',type:'景点',place:'louvre',detail:'补看喜欢的展厅；如疲惫可缩短。'},
        {id:'d3-4',time:'14:30',end:'15:30',title:'皇家宫殿庭院',type:'街区',place:'royal',detail:'黑白柱廊、庭院和短暂休息。'},
        {id:'d3-5',time:'15:30',end:'16:30',title:'薇薇安拱廊 & 咖啡',type:'街区',place:'vivienne',detail:'玻璃拱廊，适合逛店和拍照。'},
        {id:'d3-6',time:'晚上',end:'',title:'晚餐 / 自由安排',type:'生活',detail:'可以预订一顿正式法餐。'}
      ]
    },
    {
      date:'2026-12-10',weekday:'周四',theme:'印象派与埃菲尔铁塔',area:'奥赛 · 特罗卡德罗',mood:'蓝调时刻',emoji:'✳',highlight:'日落前后的埃菲尔铁塔',
      note:'约 16:53 日落；如果决定登塔，需要挪出 1.5–2 小时，游船时间也要相应调整。',
      activities:[
        {id:'d4-1',time:'09:30',end:'12:00',title:'奥赛博物馆',type:'景点',place:'orsay',detail:'重点看印象派作品，参观约 2–2.5 小时。',booking:'orsay'},
        {id:'d4-2',time:'12:00',end:'14:00',title:'午餐与休息',type:'生活',detail:'下午外景拍照前留出休息。'},
        {id:'d4-3',time:'15:15',end:'17:15',title:'特罗卡德罗 · 埃菲尔铁塔',type:'必去',place:'trocadero',extraPlaces:['eiffel'],detail:'拍白天、日落和亮灯。登塔尚未决定。',booking:'eiffel'},
        {id:'d4-4',time:'18:30',end:'19:30',title:'塞纳河夜游',type:'体验',place:'boat',detail:'冬季可选有室内区域的游船；具体登船点以票面为准。',booking:'boat'},
        {id:'d4-5',time:'20:00',end:'',title:'晚餐',type:'生活',detail:'游船结束后就近用餐。'}
      ]
    },
    {
      date:'2026-12-11',weekday:'周五',theme:'凡尔赛宫一日游',area:'Versailles',mood:'皇家时光',emoji:'♛',highlight:'镜厅、宫殿与特里亚农',
      note:'必去已确认，但门票尚未预订。冬季主宫殿通常 09:00–17:30、特里亚农 12:00 开放；花园依天气缩短。',
      activities:[
        {id:'d5-1',time:'08:00',end:'09:30',title:'巴黎出发 → 凡尔赛',type:'交通',detail:'先看实时路况，严重堵车时可考虑 RER。'},
        {id:'d5-2',time:'09:30',end:'12:00',title:'凡尔赛宫主宫殿 · 镜厅',type:'必去',place:'versailles',detail:'建议购买覆盖宫殿及特里亚农的 Passport。',booking:'versailles'},
        {id:'d5-3',time:'12:00',end:'13:00',title:'午餐',type:'生活',detail:'宫内或附近用餐。'},
        {id:'d5-4',time:'13:00',end:'14:00',title:'皇家花园',type:'街区',place:'versailles',detail:'冬季不期待喷泉表演，天气恶劣可缩短。'},
        {id:'d5-5',time:'14:00',end:'15:30',title:'特里亚农宫区域',type:'景点',place:'trianon',detail:'需要预留从主宫殿步行或乘园内交通的时间。'},
        {id:'d5-6',time:'16:00',end:'',title:'返回巴黎 · 晚上自由活动',type:'交通',detail:'不再叠加必须准时入场的景点。'}
      ]
    },
    {
      date:'2026-12-12',weekday:'周六',theme:'蒙马特与圣诞百货',area:'蒙马特 · 歌剧院',mood:'浪漫街巷',emoji:'❋',highlight:'圣心堂、歌剧院与穹顶圣诞树',
      note:'周六蒙马特中午起人会比较多。歌剧院可能因排练取消部分区域开放，务必核对预约页面。',
      activities:[
        {id:'d6-1',time:'09:00',end:'11:30',title:'蒙马特 · 圣心堂 · 小丘广场',type:'景点',place:'sacre',extraPlaces:['tertre'],detail:'上午走小巷、看艺术家广场；路有坡度。'},
        {id:'d6-2',time:'11:30',end:'13:00',title:'Abbesses / Rue des Martyrs 午餐',type:'生活',detail:'咖啡馆、烘焙店、街区生活。'},
        {id:'d6-3',time:'14:00',end:'15:30',title:'巴黎歌剧院 Palais Garnier',type:'景点',place:'opera',detail:'需按开放日及预约时段入场。',booking:'opera'},
        {id:'d6-4',time:'15:30',end:'18:30',title:'老佛爷百货 · 春天百货',type:'购物',place:'lafayette',detail:'看圣诞布置、玻璃穹顶与购物。'},
        {id:'d6-5',time:'晚上',end:'',title:'可选歌剧 / 芭蕾 / 晚餐',type:'体验',detail:'暂不预订，后续可根据演出表调整。'}
      ]
    },
    {
      date:'2026-12-13',weekday:'周日',theme:'玛黑区与凯旋门',area:'Le Marais · Champs-Élysées',mood:'自在巴黎',emoji:'◇',highlight:'设计小店与城市夜景',
      note:'如果 12/8 圣母院内部无法参观，可在今天调整上午安排。凯旋门登顶受天气影响。',
      activities:[
        {id:'d7-1',time:'10:00',end:'12:30',title:'玛黑区 · 孚日广场',type:'街区',place:'vosges',detail:'设计店、老街、小众品牌和甜品。'},
        {id:'d7-2',time:'12:30',end:'14:00',title:'玛黑区午餐',type:'生活',detail:'可选 Brunch 或轻松的 Bistro。'},
        {id:'d7-3',time:'14:00',end:'15:00',title:'咖啡馆和自由购物',type:'购物',detail:'给自己留一点没有打卡任务的时间。'},
        {id:'d7-4',time:'15:45',end:'17:15',title:'凯旋门登顶',type:'景点',place:'arc',detail:'争取日落前后登顶；不喜欢登高也可以看外观。',booking:'arc'},
        {id:'d7-5',time:'17:30',end:'19:00',title:'香榭丽舍大道圣诞灯饰',type:'体验',place:'champs',detail:'灯光、城市夜景、散步与购物。'},
        {id:'d7-6',time:'晚上',end:'',title:'最后一顿正式晚餐',type:'生活',detail:'可预订喜欢的法餐。'}
      ]
    },
    {
      date:'2026-12-14',weekday:'周一',theme:'最后购物 · 返程',area:'巴黎市区 · CDG',mood:'带走巴黎',emoji:'✈',highlight:'不赶路的最后半天',
      note:'22:20 从 CDG 离开，目标约 19:00 到机场。酒店若是最后一晚 FHR，可关注 16:00 退房权益。',
      activities:[
        {id:'d8-1',time:'09:30',end:'12:00',title:'早餐 · 散步 · 整理行李',type:'生活',detail:'可在酒店附近补逛一家喜欢的咖啡馆。'},
        {id:'d8-2',time:'12:00',end:'14:00',title:'午餐',type:'生活',detail:'不安排远离酒店的餐厅。'},
        {id:'d8-3',time:'14:00',end:'16:00',title:'最后购物 / 休息',type:'购物',detail:'取决于酒店位置和退房安排。'},
        {id:'d8-4',time:'16:30',end:'17:00',title:'取行李 · 前往机场',type:'交通',detail:'打车出发时间需视酒店与路况重新确认。'},
        {id:'d8-5',time:'约19:00',end:'',title:'抵达 CDG · 办理登机',type:'交通',detail:'为出境航班预留约 3 小时。'},
        {id:'d8-6',time:'22:20',end:'',title:'离开巴黎',type:'交通',detail:'航班号尚未录入。',fixed:true}
      ]
    }
  ],
  bookings:[
    {id:'hotel',title:'确认巴黎酒店',date:'12/7–12/14',priority:'high',note:'考虑 Hilton / Hyatt Free Night Reward、积分、Amex FHR；品牌和区域还没定。',url:''},
    {id:'louvre',title:'卢浮宫英文小团',date:'12/9 · 建议 09:00',priority:'high',note:'2–3 小时导览 + 1–2 小时自由参观；确认导览后可留馆内。',url:'https://www.louvre.fr/en'},
    {id:'versailles',title:'凡尔赛宫 Passport',date:'12/11 · 建议 09:30',priority:'high',note:'必去；确认宫殿与特里亚农园区覆盖范围。',url:'https://en.chateauversailles.fr/'},
    {id:'eiffel',title:'决定是否登埃菲尔铁塔',date:'12/10 · 下午',priority:'high',note:'先决定登塔还是只拍外观，再协调塞纳河游船时间。',url:'https://ticket.toureiffel.paris/en'},
    {id:'sainte',title:'圣礼拜堂定时门票',date:'12/8 · 09:45',priority:'medium',note:'冬季 09:00–17:00。',url:'https://www.sainte-chapelle.fr/en/'},
    {id:'orsay',title:'奥赛博物馆',date:'12/10 · 09:30',priority:'medium',note:'可先订上午入场；避免和铁塔冲突。',url:'https://www.musee-orsay.fr/en'},
    {id:'opera',title:'巴黎歌剧院内部参观',date:'12/12 · 14:00',priority:'medium',note:'需核实当天参观时段，剧院厅可能临时关闭。',url:'https://www.operadeparis.fr/en/visits/palais-garnier'},
    {id:'boat',title:'塞纳河夜游',date:'12/10 · 18:30',priority:'later',note:'冬季优先有室内座位；登船码头以订单为准。',url:'https://www.bateauxparisiens.com/'},
    {id:'arc',title:'凯旋门登顶',date:'12/13 · 15:45',priority:'later',note:'受天气影响，可灵活调整。',url:'https://www.paris-arc-de-triomphe.fr/en/'},
    {id:'notredame',title:'圣母院内部参观',date:'12/8 / 12/13 备选',priority:'later',note:'免费参观，12/8 可能受宗教活动影响；临近日期查开放。',url:'https://www.notredamedeparis.fr/en/'}
  ],
  important:[
    {title:'时间均为巴黎当地时间',text:'12 月冬季日落约 16:53；户外摄影尽量放在下午四点前后。'},
    {title:'地图是景点定位，不是车站入口',text:'所有定位点使用景点坐标，导览集合点和游船登船码头以最终订单为准。'},
    {title:'门票 ≠ 已预订',text:'日历写了时间不代表已经出票。完成订票后可以在「预约」页面勾选。'},
    {title:'地图需要网络',text:'行程文本可离线查看；互动街道地图需要联网。也可以从每个地点直接使用 Google Maps 查看位置或选择步行、驾车导航。'}
  ]
};
