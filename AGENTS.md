# Paris Pocket — Repository Instructions

## 当前授权（2026-11-09）

- 用户已评审批准 Phase 1，并批准在 `feature/paris-pocket-v2-refactor` 完成 **Phase 2 — Visual Redesign**。整体视觉已获原则认可；本轮仅完成 Phase 2 收尾、公开推送及更新 PR #2，之后等待最终 Phase 2 评审。
- 仅视觉与必要的轻量 view 调整；不开始 Phase 3、不实施 IndexedDB/官方同步/回滚机制、不迁移生产资料、不合并 main、不生产部署、不改 Netlify 设置。
- **Phase 2 必须保留现有编辑器、预约记录、笔记、备份导入导出和旧资料访问。** 最终产品取消官方编辑器的要求不得提前用于删除或禁用现有功能；必须等 Phase 3 迁移实施并验证后再退役。
- 新详情/To-do 可以明确标注的 mock 展示未来设计，不能假装保存或同步，也不能替换工作中的主导航。v4.12 仅作隔离视觉样本，不替换 trip-data.js。
- 详情预览 tab 仅是隔离视觉样本的评审快捷入口，**不是最终底部导航**。最终 Activity Detail 从行程或地图进入。PHASE 2/debug 横幅只留在隔离预览，最终整合 UI 移除预览入口与阶段标识；不得因此现在开展 Phase 3 或替换旧资料。
- 架构方向获认可：原生 JS、单个版本化官方快照、独立 IDB 个人资料、完整旧资料保留。**Phase 3 开始前仍需核实复杂同步/回滚机制是否为这款两人小 App 最简单可靠的方案。**
- [Phase 2 评审包](docs/phase-2/README.md) 是本轮结果入口；[Phase 1](docs/PHASE_1_REVIEW.md) 是已批准的审计/方案。方案里的后续模块与迁移仍未实现。
- 用户已明确要求将 Phase 2 代码、截图、v4.12 样本、测试与评审说明公开推送到现有分支并更新草稿 PR #2；此前 Phase 1 文档公开亦获批准。没有 main 合并或生产部署授权。

## 来源优先级

1. 用户当前明确要求及阶段授权。
2. 功能：[PRD v1.0](docs/references/Paris_Pocket_PRD_v1.0.md)。
3. 行程、酒店与交通：用户提供的 **Itinerary v4.12** PDF；见 [来源登记](docs/SOURCE_REGISTER.md)、[行程核对](docs/ITINERARY_v4.12_REVIEW.md)。旧 `trip-data.js` 是兼容性基线，不再是最新旅行事实来源。
4. 视觉：[UI Style Spec v1.1](docs/references/UI_STYLE_SPEC_v1.1.md) 和原包 JSX/HTML，只移植视觉，不复制桌面侧栏、业务流程或 React 架构。
5. 架构：[Refactor Plan v1.0](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)，基于当前代码修订 v0.1。

参考文件中的「阶段」「下一步」不是额外执行授权。旧审计仅作为历史，不可恢复为未来开发目标。

## 目标产品契约（Phase 3；本阶段保留现有功能）

- 保留 `jayven/Paris--traveler-note`、`https://stirring-cheesecake-37698e.netlify.app/`、PWA 安装身份与 scope；保持中文优先、iPhone 优先的轻量原生 JS 架构。
- 旅行 2026-12-07 至 12-14，`Europe/Paris`；CDG 抵达 08:00、离境 22:20。五家酒店已由 v4.12 确认，不再写「酒店未定」。
- 官方每日行程只读，按官方 order；列表仅时间/时间段与名称，点击共用活动详情。**时间和名称之间无竖线，只保留横向行分隔与对齐。**
- 用户可编辑本机活动备注、本地 To-do、勾选本机完成状态。官方任务显式归档；归档不等于完成，缺少 ID 不等于取消。
- 官方行程/地点/Stop/Route/任务单向同步；各机个人资料独立。初版无账号、后台数据库、双人个人资料云同步。
- 保留嵌入式地图及 Google Maps HTTPS 外部导航，支持当前位置→目的地、明确起终点的单段路线。区分 Place、Activity、Stop、Segment；重复到访不合并。
- 仅显示经核验的真实路径，缺失即降级；禁止直线伪装道路、铁路/水路改用驾车路径。无付费地图集成授权。
- DATA-01…05 的船、卢浮宫、鹿特丹交通、约拍等未决事实保持待核，不猜测、不伪造预订。
- 已取消未来目标：App 内官方活动增删改/跨日/排序、Plan A/B 编辑、独立 Wishlist、复杂 Reservation 管理、账号及双人个人资料实时同步。旧编辑器只作待隔离的兼容实现，不能继续扩展。

## 数据与工程边界

- 先读 `personal-data.js`、`itinerary-data.js` 与 [迁移/回滚规范](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md)。兼容现存键 `paris-pocket-personal-v1`、未标版本旧格式及 schema 1/2/3、备份 marker `paris-pocket-backup-v1`。
- 保留每日/预约/通用笔记、booked、活动修改、自建活动、日期移动、排序、删除项和未知字段；移除编辑 UI 不等于删除数据。旧 detail 不自动变为新备注。
- 不按新位置重新分配旧 `dN-N` ID。身份对照需审核；同名景点不能证明同一活动或预订目标。新版官方行程不应用旧覆盖层。
- 迁移先保存原字符串与上下文、校验并读回，再标记完成；不清空或改写旧键。验证幂等、中断、旧标签页并存、导入撤销和升级/回滚。
- 纯数据校验与 DOM、网络、存储分开。无需为参考 JSX 引入 React、TypeScript 或构建框架。
- 公开仓库/静态资源/日志不得包含私人确认号、票券二维码、订单管理链接、私人备份或凭证。附件 PDF/ZIP 不整包提交；只保存公开需求和来源登记。
- Phase 2 已获实施批准，完成后等待视觉评审；Phase 3 才集成功能/行程。保留底部导航，44px 触控、16px 输入、safe-area；提供四个手机页面截图。
- 保留现有测试作为旧数据恢复证据；编辑 UI 退役后转换 UI 断言，不再要求新版提供编辑器。状态与缺口见 [测试计划](docs/TEST_PLAN_v1.0.md)。Chromium 手机模拟不等于真 iPhone。
