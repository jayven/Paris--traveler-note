# Paris Pocket — Repository Instructions

## 当前授权（2026-11-09）

- 用户已接受 `fe21176` 为 Phase 3 首轮功能评审候选，授权继续地图缺口审计、不可变发布保留、PR 自动验证和 HTTPS/iPhone 验收准备；不得扩展产品功能。用户已批准开始 **Phase 3 — 功能与数据整合**，继续使用 `feature/paris-pocket-v2-refactor` / 草稿 PR #2。Phase 2 视觉方向已认可，保持现有设计，不重新设计。
- 授权本分支实现和用隔离模拟资料测试官方行程、个人存储、旧资料保护、备注、To-do、地图、同步与回退。**不合并 main、不部署生产、不改 Netlify 设置、不操作生产浏览器个人资料。** 真实生产升级另需批准。
- 采用已核实的最小实现：原生 JS、一个版本化官方快照、一个 IDB 数据库/单个 object store 的独立 records。只支持 data schema 1；未知版本整包拒绝，不预先实现泛用多 schema 同步框架。具体决策与后续 schema 升级门槛见 [Phase 3 实施决策](docs/phase-3/IMPLEMENTATION.md)。
- 新主界面官方行程只读，个人备注/任务可编辑。`legacy.html` / `legacy-app.js` 继续提供原编辑器、预约和笔记；新版从不改写/清空 `paris-pocket-personal-v1`。旧窗口写入另存恢复候选，不覆盖新版资料。
- Activity Detail 只从行程或地图进入，不增加独立底部 tab。主界面没有 Phase 2/mock/debug 横幅；历史预览仅留在旧页面并清楚标记。
- [Phase 3 评审包](docs/phase-3/README.md) 是当前入口。地图缺口与真 iPhone 验收未通过前，不称完整 P0 已完成，不申请生产发布。
- 用户截图已核实 Netlify：Base `/`，Build command/Publish directory 均 Not set，Build status Active，Production branch main，Branch deploys 仅 production，Deploy Previews 对 production/branch-deploy branches 的 PR 开启。未改设置，尚未启用 dist 发布。现有 Netlify PR 预览已由只读 API 确认为 ready（fe21176），未登录访问 401。当前评审提交使用 PR 标题 `[skip netlify]` 防止自动预览部署；未经另批不得移除该部署门。GitHub CI 仅校验，不部署。详见 [HTTPS/iPhone 验收](docs/phase-3/HTTPS_IPHONE_ACCEPTANCE.md)。
- 既有公开资料授权与现有仓库继续保留；不得提交私人备份、凭证、确认号或订单管理链接。

## 来源优先级

1. 用户当前明确要求及阶段授权。
2. 功能：[PRD v1.0](docs/references/Paris_Pocket_PRD_v1.0.md)。
3. 行程、酒店与交通：用户提供的 **Itinerary v4.12** PDF；见 [来源登记](docs/SOURCE_REGISTER.md)、[行程核对](docs/ITINERARY_v4.12_REVIEW.md)。旧 `trip-data.js` 是兼容性基线，不再是最新旅行事实来源。
4. 视觉：[UI Style Spec v1.1](docs/references/UI_STYLE_SPEC_v1.1.md) 和原包 JSX/HTML，只移植视觉，不复制桌面侧栏、业务流程或 React 架构。
5. 架构：[Refactor Plan v1.0](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)，基于当前代码修订 v0.1。

参考文件中的「阶段」「下一步」不是额外执行授权。旧审计仅作为历史，不可恢复为未来开发目标。

## 产品契约（Phase 3）

- 保留 `jayven/Paris--traveler-note`、`https://stirring-cheesecake-37698e.netlify.app/`、PWA 安装身份与 scope；保持中文优先、iPhone 优先的轻量原生 JS 架构。
- 旅行 2026-12-07 至 12-14，`Europe/Paris`；CDG 抵达 08:00、离境 22:20。五家酒店已由 v4.12 确认，不再写「酒店未定」。
- 官方每日行程只读，按官方 order；列表仅时间/时间段与名称，点击共用活动详情。**时间和名称之间无竖线，只保留横向行分隔与对齐。**
- 用户可编辑本机活动备注、本地 To-do、勾选本机完成状态。官方任务显式归档；归档不等于完成，缺少 ID 不等于取消。
- 官方行程/地点/Stop/Route/任务单向同步；各机个人资料独立。初版无账号、后台数据库、双人个人资料云同步。
- 保留嵌入式地图及 Google Maps HTTPS 外部导航，支持当前位置→目的地、明确起终点的单段路线。区分 Place、Activity、Stop、Segment；重复到访不合并。
- 仅显示经核验的真实路径，缺失即降级；禁止直线伪装道路、铁路/水路改用驾车路径。无付费地图集成授权。
- DATA-01…05 的船、卢浮宫、鹿特丹交通、约拍等未决事实保持待核，不猜测、不伪造预订。
- 已取消未来目标：App 内官方活动增删改/跨日/排序、Plan A/B 编辑、独立 Wishlist、复杂 Reservation 管理、账号及双人个人资料实时同步。旧编辑器只作隔离的兼容实现，不能继续扩展。

## 数据与工程边界

- 先读 `personal-data.js`、`itinerary-data.js` 与 [迁移/回滚规范](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md)。兼容现存键 `paris-pocket-personal-v1`、未标版本旧格式及 schema 1/2/3、备份 marker `paris-pocket-backup-v1`。
- 保留每日/预约/通用笔记、booked、活动修改、自建活动、日期移动、排序、删除项和未知字段；移除编辑 UI 不等于删除数据。旧 detail 不自动变为新备注。
- 不按新位置重新分配旧 `dN-N` ID。身份对照需审核；同名景点不能证明同一活动或预订目标。新版官方行程不应用旧覆盖层。
- 迁移先保存原字符串与上下文、校验并读回，再标记完成；不清空或改写旧键。验证幂等、中断、旧标签页并存、导入撤销和升级/回滚。
- 纯数据校验与 DOM、网络、存储分开。无需为参考 JSX 引入 React、TypeScript 或构建框架。
- 公开仓库/静态资源/日志不得包含私人确认号、票券二维码、订单管理链接、私人备份或凭证。附件 PDF/ZIP 不整包提交；只保存公开需求和来源登记。
- Phase 3 已获实施批准；完成后提交功能评审，生产发布另需批准。保留底部导航，44px 触控、16px 输入、safe-area；提供四个手机页面截图。
- 保留现有测试作为旧数据恢复证据；编辑 UI 退役后转换 UI 断言，不再要求新版提供编辑器。状态与缺口见 [测试计划](docs/TEST_PLAN_v1.0.md)。Chromium 手机模拟不等于真 iPhone。
