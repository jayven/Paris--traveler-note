# Paris Pocket / 巴黎手帐

中文优先、iPhone 优先的静态 PWA。现有站点：[Paris Pocket](https://stirring-cheesecake-37698e.netlify.app/)，仓库 `jayven/Paris--traveler-note`。

## 当前开发状态

2026-11-09：Phase 1 已批准；**Phase 2 视觉已实现，等待视觉评审**。继续在 `feature/paris-pocket-v2-refactor` / 草稿 PR #2，不合并 main、不部署生产。

入口：[Phase 2 结果、四屏截图与限制](docs/phase-2/README.md)。先读 [AGENTS](AGENTS.md) 与 [产品简报](PRODUCT_BRIEF.md)；[Phase 1 审计](AUDIT.md)、[架构](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)、[迁移/回滚方案](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md) 保留为已批准方向。

现有页面采用 UI v1.1 淡色/1px 黑线/方卡/硬阴影/绿色操作；行程行只显示时间和名称，点击真实详情后仍能编辑/排序、打开关联预约与每日笔记。原四个主导航及备份继续工作。

点击页头 **「v4.12 预览」** 看八日内容样本和每日行程/活动详情/地图/To-do 四屏设计。预览是隔离的只读样本：没有保存、同步或迁移；备注 readonly、任务勾选/创建未接入。「详情预览」tab 仅为隔离评审快捷入口，不属于最终底部导航；最终从行程或地图打开详情。PHASE 2 横幅仅在隔离预览中，最终集成时移除。现有预约在主导航继续可用。预览地图使用已有景点坐标与真实底图，不画未经核验的路线。

功能依据 [PRD v1.0](docs/references/Paris_Pocket_PRD_v1.0.md)，视觉依据 [UI v1.1](docs/references/UI_STYLE_SPEC_v1.1.md)；v4.12 来源和待核差异见 [行程核对](docs/ITINERARY_v4.12_REVIEW.md)。原 trip-data.js、personal-data.js、itinerary-data.js 的数据与存储契约未改。

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
npm run test:visual
```

使用已装 Chrome 可加 `PW_CHANNEL=chrome`；自定义 server 地址用 `TEST_URL=http://localhost:4178`（browser/management）。PWA 测试自带 server 4174。当前 20 个 Node tests、三套现有浏览器脚本与新增 visual 检查已通过；截图在 docs/phase-2/screenshots，详情/缺口见本轮评审包。test-results/、node_modules/ 忽略，不放私人备份。

同 Wi-Fi 的 iPhone 可输入电脑 LAN IP:端口检查现有界面；普通 LAN HTTP 不支持 SW，离线/主屏幕验收需要 HTTPS。独立预览与生产数据分属不同 origin，通过备份迁移；不可清除生产数据排查问题。

## 当前源码结构（非未来模块已实现声明）

- trip-data.js：旧 canonical 计划、44 活动/22 地点/10 booking；后续作为兼容 fixture，最新事实来自 v4.12。
- personal-data.js：paris-pocket-personal-v1、未标版本旧格式及 schema 1/2/3、备份 marker paris-pocket-backup-v1、校验/失败保存/陈旧写保护。
- itinerary-data.js：当前编辑/移动/排序/删除恢复投影；未来仅 legacy 恢复职责。
- map-links.js：Google Maps 精确坐标查看、walking/driving、可选 Place ID；没有付费 API key。
- app.js / index.html / styles.css：日期导航、渲染、笔记、编辑、备份、Leaflet 与 PWA 更新。
- sw.js / manifest.webmanifest / assets/：完整 cache-first shell、手动更新、安装身份；尚无独立官方同步。新增 visual-preview.js 仅服务隔离设计样本。
- scripts/serve.cjs / tests/：本地 server 与基线验证；docs/：当前受控重构评审资料。

## 数据、更新与发布边界

旧 key 不清空/改写。新只读官方视图不得应用旧覆盖/删除/顺序；原个人安排、笔记和勾选仍需可查看/导出/恢复。不要直接把新 itinerary 数组套用旧 dN-N ID。新 schema/IDB/备份/回滚设计尚未运行。

当前 SW 更新仍需发布完整 shell 并改变 CACHE_VERSION；在线打开原网址，保存输入后点击「新版本已准备好」。不靠删除主屏幕图标/清站点数据更新。现行 trip-data 与代码绑定，不能宣称用户已能独立一键同步。

保留同一 GitHub 仓库和 Netlify site。GitHub main 已连接 Netlify webhook，合并可能立即发生产；本轮仅推送现有功能分支，不推送/合并 main、不改 Netlify 配置、不新建站点。Phase 2 视觉评审、Phase 3 与最终生产批准是独立门槛。后续先核实 Deploy Preview，再做 HTTPS 真机与升级/回滚验收。

仓库是公开的，当前 server 也服务根目录非隐藏文件；内部文档不等于私密目录。不要放私人订单号、管理链接、票二维码、真实用户备份或 secrets。后续发布产物白名单方案见架构文档。
