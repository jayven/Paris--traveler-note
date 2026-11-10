# Phase 3 — 40 个地图缺口的分类与决策清单

2026-11-09；审计基线 `fe21176` / trip v4.12.1，快照 SHA256 `af2dbb626d063926bf126dad2ae376d51738df7e34546b60b2748a2a7ef63708`。仅审计，**未改 mode、Stop、地点或几何**。现有 28 条真实道路轨迹保持逐字不变。

| 当前模式 | 总段数 | 已有几何 | 无几何 |
| --- | ---: | ---: | ---: |
| walking | 24 | 24 | 0 |
| driving | 8 | 4 | 4 |
| unknown | 32 | 0 | 32 |
| rail | 2 | 0 | 2 |
| boat | 2 | 0 | 2 |

40 个缺口分为 **2 个来源明确但元数据待对齐的步行候选、7 个同场地/无外部道路衔接、4 个铁路/水路、27 个受未决事实阻塞的衔接**。不是还差 40 条道路，更不以 68/68 为目标。

两段步行候选仍保留当前 `unknown`：同一活动说明已写明“走艺术家广场与圣心堂”，属于来源与 mode 字段不一致，先提出审核，不在本轮默默改成 walking。四条缺失的 `driving` 都归入未决端点组，不是路由算法缺一条就随意补线。

## 分组决策（供用户评审）

| 组 / 类别 | 段数 | 待决与处理 |
| --- | ---: | --- |
| 蒙马特来源已明确的步行 / required-road | 2 | 评审同意按既有来源对齐两段 walking 字段后，再按原核验规则生成路径。 |
| 同场地与无须外部道路的衔接 / same-venue-no-road | 7 | 认可保留为无道路几何；不推断馆内通道、花园路线、航站楼或码头内部路径。 |
| 鹿特丹两段铁路及两段水路 / rail-boat | 4 | 确认往返车票、冬季船运是否运行、运营方及上下船点；道路几何不作为此组验收目标。 |
| CDG 抵离两段驾车 / blocked-decision | 2 | 提供实际抵离航站楼，之后核验对应落客/上车位置。 |
| 卢森堡公园 → 奥赛的驾车起点 / blocked-decision | 1 | 确认可用的街边上车位置；之后重做原标准道路核验。 |
| 卢浮宫私人导览相关三段 / blocked-decision | 3 | 确认导览时段/集合及结束地点，再确认返 Grand Powers 的方式。 |
| 铁塔约拍往返与场内点位 / blocked-decision | 3 | 确认摄影集合/结束地点与移动安排，再确认酒店往返方式。 |
| 鹿特丹/Kinderdijk 码头与陆路衔接 / blocked-decision | 4 | 确认 Erasmusbrug/Kinderdijk 船码头、中央站赴码头方式、回程码头赴 Fenix 是出租车还是 Water Taxi。 |
| 明确目的地但方式未定的市内/酒店交通 / blocked-decision | 10 | 逐组确认这些交通方式；街区代表点还须在确定具体目的地后复核路径端点。 |
| 条件活动影响的衔接 / blocked-decision | 4 | 确认游船及可选点/午餐条件；保留原顺序，不在本轮静默改起点或选择交通。 |

同场地组包括奥赛安检→午餐→参观（2）、凡尔赛主宫殿→花园（1）、Erasmusbrug 到达→候船（1）、Fenix 到达→参观（1）、Markthal 到达→参观（1）、CDG 到达→航班（1）。只表示无需外部道路几何，不断言具体内部通道、楼层或航站楼已核验。

铁路/水路组只包括鹿特丹往返火车与 Kinderdijk 往返船，不包括塞纳河游船。塞纳河游船尚无确定码头，没有凭空创建 Stop/Segment；DATA-01 仍须确认，不能因为不在 68 的分母就忽略。

两个 Kinderdijk 船程与参观的交接、Louvre 会合与导览虽然复用 Place，仍归 blocked：公共游客地址/金字塔不是已核实码头或会合点。Vivienne→Abbesses 来源写打车，但上游景点可跳过，需确认实际起点；不自动创建绕过可选点的路线。

## 逐段完整清单

下表覆盖全部 40 个缺口，编号仅为审计序号，不替代稳定 segmentId；机器可校验的完整 ID/来源关联见 [JSON](route-gap-audit.json)。

| # | 日期 / 当前方式 | 从 → 到 | 类别 / 决策组 |
| ---: | --- | --- | --- |
| 1 | 12-07 / driving | 巴黎戴高乐机场 → Marquis Faubourg Saint-Honoré | blocked-decision / airport |
| 2 | 12-07 / unknown | 协和广场 → Marquis Faubourg Saint-Honoré | blocked-decision / conditional-links |
| 3 | 12-08 / unknown | 巴黎春天百货 → Marquis Faubourg Saint-Honoré | blocked-decision / urban-transfers |
| 4 | 12-08 / unknown | Marquis Faubourg Saint-Honoré → Grand Hôtel du Palais Royal | blocked-decision / urban-transfers |
| 5 | 12-08 / unknown | 薇薇安拱廊 → Abbesses | blocked-decision / conditional-links |
| 6 | 12-08 / unknown | Abbesses → 小丘广场 | required-road / road-montmartre |
| 7 | 12-08 / unknown | 小丘广场 → 圣心堂 | required-road / road-montmartre |
| 8 | 12-09 / driving | 卢森堡公园 → 奥赛博物馆 | blocked-decision / luxembourg-pickup |
| 9 | 12-09 / unknown | 奥赛博物馆 → 奥赛博物馆 | same-venue-no-road / same-venue |
| 10 | 12-09 / unknown | 奥赛博物馆 → 奥赛博物馆 | same-venue-no-road / same-venue |
| 11 | 12-09 / unknown | 奥赛博物馆 → Grand Hôtel du Palais Royal | blocked-decision / urban-transfers |
| 12 | 12-10 / unknown | 凡尔赛宫 → 凡尔赛宫 | same-venue-no-road / same-venue |
| 13 | 12-10 / unknown | 凡尔赛宫 → 大特里亚农宫 | blocked-decision / conditional-links |
| 14 | 12-10 / unknown | 王后村庄 → Waldorf Astoria Versailles – Trianon Palace | blocked-decision / conditional-links |
| 15 | 12-11 / driving | Grand Powers → 卢浮宫 | blocked-decision / louvre |
| 16 | 12-11 / unknown | 卢浮宫 → 卢浮宫 | blocked-decision / louvre |
| 17 | 12-11 / unknown | 卢浮宫 → Grand Powers | blocked-decision / louvre |
| 18 | 12-12 / unknown | Grand Powers → 特罗卡德罗／夏约宫 | blocked-decision / photos |
| 19 | 12-12 / unknown | 特罗卡德罗／夏约宫 → 埃菲尔铁塔 | blocked-decision / photos |
| 20 | 12-12 / unknown | 埃菲尔铁塔 → Grand Powers | blocked-decision / photos |
| 21 | 12-12 / unknown | Grand Powers → Maison Astor Paris | blocked-decision / urban-transfers |
| 22 | 12-12 / unknown | Maison Astor Paris → 玛黑区 | blocked-decision / urban-transfers |
| 23 | 12-12 / unknown | 玛黑区 → 孚日广场 | blocked-decision / urban-transfers |
| 24 | 12-13 / rail | 巴黎北站 → 鹿特丹中央车站 | rail-boat / rail-boat |
| 25 | 12-13 / unknown | 鹿特丹中央车站 → Erasmusbrug 码头区域 | blocked-decision / rotterdam-piers |
| 26 | 12-13 / unknown | Erasmusbrug 码头区域 → Erasmusbrug 码头区域 | same-venue-no-road / same-venue |
| 27 | 12-13 / boat | Erasmusbrug 码头区域 → Kinderdijk 风车群 | rail-boat / rail-boat |
| 28 | 12-13 / unknown | Kinderdijk 风车群 → Kinderdijk 风车群 | blocked-decision / rotterdam-piers |
| 29 | 12-13 / unknown | Kinderdijk 风车群 → Kinderdijk 风车群 | blocked-decision / rotterdam-piers |
| 30 | 12-13 / boat | Kinderdijk 风车群 → Erasmusbrug 码头区域 | rail-boat / rail-boat |
| 31 | 12-13 / unknown | Erasmusbrug 码头区域 → Fenix 美术馆 | blocked-decision / rotterdam-piers |
| 32 | 12-13 / unknown | Fenix 美术馆 → Fenix 美术馆 | same-venue-no-road / same-venue |
| 33 | 12-13 / unknown | Markthal 市场 → Markthal 市场 | same-venue-no-road / same-venue |
| 34 | 12-13 / unknown | 立方体房屋外观 → 鹿特丹中央车站 | blocked-decision / urban-transfers |
| 35 | 12-13 / rail | 鹿特丹中央车站 → 巴黎北站 | rail-boat / rail-boat |
| 36 | 12-13 / unknown | 巴黎北站 → Maison Astor Paris | blocked-decision / urban-transfers |
| 37 | 12-14 / unknown | Maison Astor Paris → 圣日耳曼街区 | blocked-decision / urban-transfers |
| 38 | 12-14 / unknown | La Grande Épicerie → Maison Astor Paris | blocked-decision / urban-transfers |
| 39 | 12-14 / driving | Maison Astor Paris → 巴黎戴高乐机场 | blocked-decision / airport |
| 40 | 12-14 / unknown | 巴黎戴高乐机场 → 巴黎戴高乐机场 | same-venue-no-road / same-venue |

审计验收：JSON 与当前快照 hash 绑定；每个无几何 ID 恰好出现一次；28 个已验证几何不进入缺口表；不修改任何发布数据。事实确定后另行更新版本、核验端点和供应商路径；同场地/铁路/水路继续允许没有道路几何。
