# Phase 1 — Current Code Audit

审计日期：2026-11-08（用户时区 America/Los_Angeles）。状态：审计完成，运行代码未修改；等待 Phase 2 评审。

## 可复现基线与范围

- GitHub：`jayven/Paris--traveler-note`，最新 `origin/main` 为 `05790404b87b616db7b1a786770232dc55fbfe7b`（PR #1，V1.1.1）。已 fetch，不以旧草案的 V1 ZIP 推断现状。
- 独立 checkout：`feature/paris-pocket-v2-refactor`。原本 `codex/activity-editing` 工作目录中的未提交 styles.css、sw.js 和图片保持原样；未将其混入本审计。
- 对原生产网址只读获取 index/styles/app/personal-data/itinerary-data/map-links/trip-data/sw/manifest 九项，与 main 全部一致（HTML 仅移除 Netlify 注入注释后比较）。没有读取用户浏览器数据。
- GitHub 上有 active Netlify webhook；本轮未改设置。主分支发布关联已存在，但未据此假定 Deploy Preview 可用。没有 Netlify 账户内的 publish-directory/预览配置证据。
- 审阅四份附件、受控重构说明、全部当前源文件及测试；PDF 8 页均渲染核对，第 5 页鹿特丹表格是图片，纯文本提取会遗漏。
- [旧审计](docs/history/AUDIT_V1.1_2026-10.md) 仅记录历史，不再作为产品要求。当前目标以 PRD v1.0 / v4.12 / UI v1.1 为准。

## 当前实现与处理建议

| 领域 | 当前代码证据 | 复用/调整及风险 |
| --- | --- | --- |
| 架构 | index.html；app.js 230 行，数据/DOM/编辑/地图/备份/SW 集中；无构建步骤；package.json 1.1.1，仅 Playwright 开发依赖 | 保留原生 JS 与导航/日期切换，按责任渐进拆分，无框架迁移理由 |
| 官方内容 | trip-data.js:3–10，旧 v1.0 · 2026.10.12；8 日、44 活动、22 地点、10 booking；酒店待定 | 与 v4.12 差异显著，不能沿用为新旅行事实。保留公共旧快照用于解释个人编辑档案 |
| 活动编辑 | itinerary-data.js:5–21；app.js:107–166，新增/跨日/排序/删除恢复、稳定 dN-N 与 user-UUID | 未来只读行程不再提供这些功能；隔离旧解释器与数据，不能直接删字段或应用到新版活动 |
| 详情/备注 | app.js:61–69、196–202；描述在列表，只有每日/预约/通用备注 | 复用转义、输入与失败保护；新增共用活动详情及 notesByActivityId，不能把每日笔记自动配给活动 |
| To-do | app.js:70–71，固定 bookings 分组及勾选，无自建任务/截止日/显式归档 | 复用本机完成与文本输入模式；以新任务模型替换，旧 booking 目标必须审核后映射 |
| 存储 | personal-data.js:4、52–98，唯一 localStorage 键 paris-pocket-personal-v1，未标版本旧格式与 schema 1/2 归一为 3；无 IndexedDB | 旧键不可重写为新 schema。保留原字符串；新存储独立，详见迁移规范 |
| 校验/导入 | personal-data.js:57 保留顶层未知字段，但嵌套覆盖/自建活动未知字段被重建丢弃；app.js:92–105，5MB 上限与 confirm | 复用现有 legacy 解码规则，不把 normalize 当原始备份。新导入加差异预览、检查点与撤销 |
| 保存错误 | app.js:31–40、141–142；损坏/未来 schema 阻止写入、失败保留编辑草稿 | 保留。当前损坏数据时下载备份也被禁止（91），新恢复入口应能导出原字符串 |
| 并发 | personal-data.js:91–98 expectedRaw 比对；app.js:169–179 storage 事件 | 能挡常见旧标签页覆盖，比较后写入不等于跨标签页原子事务；新存储用事务与 revision |
| 地图 | app.js:72、74 按 Place 去重；82–85 仅底图/图钉/Popup；无路段或 GeoJSON | 保留 Leaflet 及异步 generation 防护；改按 Stop 展示重复到访，新增经核验路段 |
| 导航 | map-links.js:4–26 已有 Google URL、精确坐标、walking/driving、可选 Place ID | v0.1「仍是 Apple Maps」已过时。扩展明确起点及已核实地址目标；坐标有效不代表入口已核验 |
| 地图降级 | app.js:77–87 CDN 加载超时/错误时保留列表；83 无 tileerror 状态 | 保留列表；补底图单独失败、Stop→详情、模式/路段缺失处理 |
| PWA | manifest id/scope ./，start_url ./?source=homescreen；sw.js:2–22 完整 CORE、等待手动更新、自家缓存清理 | 保留身份与等待更新。trip-data.js 同属 cache-first shell，无法独立同步官方数据 |
| 更新/版本 | app.js:205–223 保护编辑弹窗后 SKIP_WAITING；仅显示 trip.version | 新备注/任务草稿也需保护；新增 appVersion、tripDataVersion、真实最近同步时间 |
| 外部资源 | Leaflet 1.9.4 动态 CDN、无 SRI；OSM 瓦片有 attribution | 不假定供应链无风险；建议后续随 shell 自托管合法 Leaflet 资源。瓦片/路由条款单独核实 |
| 静态发布 | scripts/serve.cjs:4–15 服务仓库根非隐藏文件；无专门发布 allowlist/netlify 配置 | 根目录文档不是私密存储。后续纯复制式发布产物白名单，Netlify 设置变更另批 |

本轮未执行依赖漏洞扫描；没有读取 Netlify 控制台安全头配置，不能断言线上无 CSP/安全头。

## PRD Gap Analysis

状态仅评价 main 当前实现，不代表 Phase 1 已补齐功能。

| PRD | 状态 | 主要差距/后续责任 |
| --- | --- | --- |
| FR-IT-01…06 | 部分 | 已有日期/稳定 ID，但仍编辑式长列表、旧内容；需官方 order、最简时间线、统一详情、明确状态 |
| FR-NOTE-01…05 | 未满足活动级要求 | 只有旧每日/预约/通用笔记；需活动备注自动保存、孤立档案、预览备份和本机隐私提示 |
| FR-MAP-01…07、10 | 部分基础 | 图钉与底图可复用；无 Stop/Segment、真实道路轨迹/过滤/共用详情/定位来源与语义验证 |
| FR-MAP-08…09 | 部分 | 已支持当前位置 walking/driving 和引擎失败列表；缺明确起终点单段 URL、瓦片失败状态、真机 handoff |
| FR-TODO-01…07 | 大部缺失 | 固定 booking 勾选不能代表官方+本地任务、逾期排序、不同目标新 ID、显式归档与历史 |
| FR-SYNC-01、06、08 | 基础符合方向 | 原仓库/站点、个人本机存储，无云写回；尚未建立新版官方数据边界 |
| FR-SYNC-02…05、07 | 关键缺口 | 没有独立版本/全量原子同步/成功时间/离线快照；未标版本旧格式与 schema 1/2/3 已兼容，下一次迁移尚未实施 |

## 重新执行的基线测试

在独立 checkout、隔离 Chrome profile、本地 4178 / PWA 模拟 4174 执行，无生产写入或私人资料。

- `npm test`：20/20 通过（个人数据 7、活动管理 9、Maps URL 4）。
- `TEST_URL=http://localhost:4178 PW_CHANNEL=chrome node tests/browser.cjs`：通过；编辑/转义/保存/导入导出/错误保护、320–1024px、离线与 Google 链接。
- 同样环境 `node tests/management.cjs`：通过；schema 2、新建/跨日/顺序/删除恢复、关联笔记、备份/离线/旧窗口冲突。
- `PW_CHANNEL=chrome node tests/pwa.cjs`：通过；等待用户更新、保留草稿与存储、无关缓存保留、完整离线 shell、缺失核心文件使安装失败时旧 shell 仍可用。
- 浏览器套件无未捕获页面错误。使用了 bundled Playwright 的 NODE_PATH；脚本与源代码未改。

这些是现有版本回归，**不是新版迁移/同步验收**。PWA 测试只切换旧 worker fixture，仍提供当前 HTML/JS，不是真实旧安装 bundle→新 schema 测试；Chromium iPhone 参数不等于 Safari。新增门槛见 [测试计划](docs/TEST_PLAN_v1.0.md)。

## 结论与优先级

1. 先建立旧资料可恢复边界及官方/本机模型，禁止直接覆盖 trip-data 和复用位置 ID。
2. Phase 2 采用 UI v1.1 token，限定视觉与必要结构支撑；四屏评审后再集成功能。
3. Phase 3 先校验/迁移/离线存储，再只读详情与 To-do、一键同步、Stop/真实路段及导航。
4. 真实 iPhone、真实旧 bundle 升级/回滚、数据冲突核对、路径供应商/许可和预览配置是发布门槛。

建议、模型与停止条件见 [架构 v1.0](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)、[迁移/回滚](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md)、[评审包](docs/PHASE_1_REVIEW.md)。Phase 1 未修改 UI、运行数据、存储、Service Worker 或生产站点。
