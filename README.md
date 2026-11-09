# Paris Pocket / 巴黎手帐

中文优先、iPhone 优先的静态 PWA。现有站点：[Paris Pocket](https://stirring-cheesecake-37698e.netlify.app/)，仓库 `jayven/Paris--traveler-note`。

## 当前开发状态

2026-11-08：Controlled Refactor & Visual Redesign **Phase 1 审计/方案完成，等待评审**。分支 `feature/paris-pocket-v2-refactor` 基于最新 main `0579040`；本轮只更新文档，不改 UI、行程、存储或 Service Worker，不生产发布。

先读 [AGENTS](AGENTS.md)、[产品简报](PRODUCT_BRIEF.md)、[评审包](docs/PHASE_1_REVIEW.md)。完整方案：[审计](AUDIT.md)、[架构 v1.0](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)、[迁移/回滚](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md)、[测试计划](docs/TEST_PLAN_v1.0.md)。

当前运行版本 V1.1.1 仍有本机活动编辑、旧每日/预约笔记、备份、Google Maps、Leaflet 图钉和离线 shell。新产品取消官方行程编辑，改为只读行程/活动备注/官方+本地 To-do/单向官方同步；旧编辑数据要完整归档。**新版功能尚未实现**，运行中的 trip-data.js 仍旧，不是最新旅行依据。

功能依据 [PRD v1.0](docs/references/Paris_Pocket_PRD_v1.0.md)，旅行依据用户 PDF v4.12，视觉依据 [Style Spec v1.1](docs/references/UI_STYLE_SPEC_v1.1.md)。五家酒店已确认、周五 Louvre、周三奥赛、周日鹿特丹等见 [行程核对](docs/ITINERARY_v4.12_REVIEW.md)，未决信息保持待核。旧编辑器/复杂预订/双人个人云同步路线图不再继续。

## 本地开发与基线测试

Node.js 22+；应用无 npm runtime 依赖、无构建步骤。

```sh
npm start
```

打开 http://localhost:4173 。若端口已占用可 `PORT=4178 npm start`。测试：

```sh
npm test
npm ci
npx playwright install chromium
# app server 运行时，在另一个终端执行
npm run test:browser
npm run test:management
npm run test:pwa
```

使用已装 Chrome 可加 `PW_CHANNEL=chrome`；自定义 server 地址用 `TEST_URL=http://localhost:4178`（browser/management）。PWA 测试自带 server 4174。当前 20 个 Node tests 和三套浏览器脚本已通过，详情/缺口见测试计划。test-results/、node_modules/ 忽略，不放私人备份。

同 Wi-Fi 的 iPhone 可输入电脑 LAN IP:端口检查现有界面；普通 LAN HTTP 不支持 SW，离线/主屏幕验收需要 HTTPS。独立预览与生产数据分属不同 origin，通过备份迁移；不可清除生产数据排查问题。

## 当前源码结构（非未来模块已实现声明）

- trip-data.js：旧 canonical 计划、44 活动/22 地点/10 booking；后续作为兼容 fixture，最新事实来自 v4.12。
- personal-data.js：paris-pocket-personal-v1、未标版本旧格式及 schema 1/2/3、备份 marker paris-pocket-backup-v1、校验/失败保存/陈旧写保护。
- itinerary-data.js：当前编辑/移动/排序/删除恢复投影；未来仅 legacy 恢复职责。
- map-links.js：Google Maps 精确坐标查看、walking/driving、可选 Place ID；没有付费 API key。
- app.js / index.html / styles.css：日期导航、渲染、笔记、编辑、备份、Leaflet 与 PWA 更新。
- sw.js / manifest.webmanifest / assets/：完整 cache-first shell、手动更新、安装身份；尚无独立官方同步。
- scripts/serve.cjs / tests/：本地 server 与基线验证；docs/：当前受控重构评审资料。

## 数据、更新与发布边界

旧 key 不清空/改写。新只读官方视图不得应用旧覆盖/删除/顺序；原个人安排、笔记和勾选仍需可查看/导出/恢复。不要直接把新 itinerary 数组套用旧 dN-N ID。新 schema/IDB/备份/回滚设计尚未运行。

当前 SW 更新仍需发布完整 shell 并改变 CACHE_VERSION；在线打开原网址，保存输入后点击「新版本已准备好」。不靠删除主屏幕图标/清站点数据更新。现行 trip-data 与代码绑定，不能宣称用户已能独立一键同步。

保留同一 GitHub 仓库和 Netlify site。GitHub main 已连接 Netlify webhook，合并可能立即发生产；本轮不推送/合并 main、不改 Netlify 配置、不新建站点。Phase 2、UI 评审、Phase 3 与最终生产批准是独立门槛。后续先核实 Deploy Preview，再做 HTTPS 真机与升级/回滚验收。

仓库是公开的，当前 server 也服务根目录非隐藏文件；内部文档不等于私密目录。不要放私人订单号、管理链接、票二维码、真实用户备份或 secrets。后续发布产物白名单方案见架构文档。
