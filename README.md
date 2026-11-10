# Paris Pocket / 巴黎手帐

中文优先、iPhone 优先的原生 JavaScript PWA。继续使用 [现有 Netlify 站点](https://stirring-cheesecake-37698e.netlify.app/) 和 `jayven/Paris--traveler-note`。

当前 `feature/paris-pocket-v2-refactor` 为 **Phase 3 功能评审候选**，尚未合并或部署。用户已批准 Phase 3，生产发布另需批准。先读 [AGENTS](AGENTS.md)、[PRODUCT_BRIEF](PRODUCT_BRIEF.md)。

[本轮安全收尾评审](docs/phase-3/REVIEW_FOLLOWUP.md) · [地图缺口决策](docs/phase-3/ROUTE_GAP_AUDIT.md) · [HTTPS/iPhone 验收](docs/phase-3/HTTPS_IPHONE_ACCEPTANCE.md) · [Phase 3 结果与截图](docs/phase-3/README.md) · [架构与维护](docs/phase-3/IMPLEMENTATION.md) · [地图来源及缺口](docs/phase-3/MAP_SOURCES.md) · [PRD](docs/references/Paris_Pocket_PRD_v1.0.md)

主界面：v4.12 官方只读行程 → 活动详情/本机备注 → 每日地图/Google Maps → 官方与本地 To-do。旅行卡片提供概览、酒店、官方同步/回退、本机备份和旧资料恢复。保留 Phase 2 淡色 Neo-Brutalist 设计、横线时间列表与四个底部导航，详情不占独立 tab。

原编辑器、预约、笔记及备份继续在 [legacy.html](legacy.html) 使用。新版从不写旧 localStorage，旧修改不套到新的官方行程，原始数据保存在独立 IDB 档案，可查看/导出。两台手机只共享维护者发布的官方内容，个人备注/任务/勾选各自独立。

## 本地运行与测试

Node 22+。应用无运行时 npm 依赖，无框架。

```sh
npm ci
npx playwright install chromium
PORT=4178 npm start
```

打开 http://localhost:4178 。在另一终端：

```sh
npm test
npm run check:releases
TEST_URL=http://localhost:4178 npm run test:browser
TEST_URL=http://localhost:4178 npm run test:management
TEST_URL=http://localhost:4178 npm run test:visual
TEST_URL=http://localhost:4178 npm run test:integrated
TEST_URL=http://localhost:4178 npm run test:concurrency
TEST_URL=http://localhost:4178 npm run test:failure
npm run test:store
npm run test:pwa
npm run build:site
```

使用已装 Chrome 可加 `PW_CHANNEL=chrome`。store 与 PWA 测试自带隔离 server；PWA 从 Git `0579040` 读取真正旧 bundle，测试旧→新→旧→新。历史 browser/management/visual 指向 legacy.html；integrated 验证新版并生成四屏截图。测试只用合成资料，不读取生产记录。

`npm run build:trip` 校验并生成一个官方快照/manifest/bootstrap；修改稳定 ID/版本的规则见实施决策。`npm run build:site` 准备 dist/ 公开文件白名单，保留全部已存在的合法不可变快照，先验证整套输入再替换构建输出。PR workflow 检查官方数据、历史保留、生成一致性、Node 回归和公开产物，不部署。当前 PR 标题使用 `[skip netlify]` 防止更新自动触发预览；Netlify 设置未更改。

## 限制与真机验收

地图有 28 条已核验道路路径。40 个未绘制段按用途分类：2 个来源步行字段对齐候选、7 个同场地/无需道路、4 个铁路/水路、27 个未决位置/交通；不以 68/68 为目标。具体决策和全部 ID 见缺口审计。船产品/码头、卢浮宫时间/集合点、鹿特丹车船、约拍、CDG 航站楼等仍待核。未确认的预订继续标注待确认。

本机文字、任务和备注支持离线。完整底图与外部导航需要网络。真实 iPhone 必须使用独立 **HTTPS** 预览；普通 LAN HTTP 无法支持 WebCrypto 校验和 SW，不能作为功能验收。Safari/主屏幕、键盘、VoiceOver、Google Maps 已装/未装和真实旧安装升级仍需人工验证。

不要清除生产网站资料排查。私人备份由用户保存，不提交仓库；同网址图标继续保留。main 合并与生产部署需要用户另行批准。
