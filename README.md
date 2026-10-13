# Paris Pocket / 巴黎手帐

两个人的巴黎旅行手帐，2026 年 12 月 7–14 日。中文优先的静态 PWA，保留现有生产地址：
https://stirring-cheesecake-37698e.netlify.app/

## 本地开发

需要 Node.js 22 或更新版本。应用运行本身没有第三方 npm 依赖，也没有构建步骤。

```sh
npm start
```

打开 `http://localhost:4173`。修改文件后刷新页面。若此前启用了离线缓存，新版本会继续使用完整缓存：修改 `sw.js` 的 `CACHE_VERSION`，刷新后点击「新版本已准备好」。也可以在专用测试浏览器中注销 localhost 的 service worker；**不要清除生产网站数据**。

iPhone 与电脑连接同一 Wi-Fi 后，在 Safari 输入 `http://电脑局域网IP:4173`。这能验证编辑与排版，但普通局域网 HTTP 不支持 service worker，因此不能验证离线安装。离线 / 主屏幕验收需要 HTTPS 的独立预览地址或安全的本地 HTTPS 环境。预览网站与生产网站的数据分别保存；需要时通过备份传递。

## 测试

```sh
npm test
npm ci
npx playwright install chromium
npm start
# 另一个终端
npm run test:browser
npm run test:management
npm run test:pwa
```

`npm test` 不需要安装依赖。浏览器测试使用开发依赖 Playwright；只作用于本地测试 origin，不会接触生产数据。已有 Chrome 时可用 `PW_CHANNEL=chrome npm run test:browser` 、`PW_CHANNEL=chrome npm run test:management` 和 `PW_CHANNEL=chrome npm run test:pwa`。PWA 测试自行启动端口 4174；界面测试需要端口 4173。`test-results/` 为本地截图，不进入 Git。

首次开发验收记录与后续优先级见 [AUDIT.md](AUDIT.md)。浏览器的 iPhone 尺寸模拟不能替代真实 iPhone Safari、键盘、VoiceOver 或主屏幕安装测试。

## 结构

- `trip-data.js`：原始行程、地点、预约清单。所有时间为 Europe/Paris，保留稳定活动 ID。
- `app.js`：渲染、导航、编辑对话框、地图、个人笔记与备份交互。
- `personal-data.js`：个人数据校验、兼容读取、写入、备份及旧窗口写入检查。
- `map-links.js`：Google Maps 查看位置及步行/驾车 URL，使用经纬度和可选的已核对 Place ID。
- `itinerary-data.js`：稳定 ID 的活动投影、新增、修改、日期移动、删除/恢复和排序；不改写原始行程。
- `index.html` / `styles.css`：中文界面、原生 dialog、响应式样式。
- `sw.js` / `manifest.webmanifest` / `assets/`：完整离线应用与主屏幕图标。
- `scripts/serve.cjs` / `tests/`：本地开发服务与回归检查。

## 编辑与备份约定

每天的「添加活动」可创建新的计划；活动的「编辑」可修改名称、日期、开始/结束时间和描述。活动日期在本次 12/7–12/14 旅行范围内选择，移动后排在目标日末尾。时间允许 `09:30`、`晚上`、`约19:00`；结束时间可留空。通过「上移/下移」调整顺序，修改时间不会自动重排，也不会修改真实预约或旅行卡片中的航班资料。

「删除」需要确认；它隐藏活动，并保留数据与预约关联，可在对应日期的「已删除的安排」中恢复。删除不代表取消门票订单。原始活动可单独恢复名称、日期、时间和描述；新建活动没有原始模板。新建活动不会自动生成坐标或虚构预约，地点/预约管理留待后续版本。

保持 `paris-pocket-personal-v1` key，兼容原始和此前 `schemaVersion: 2` 数据。当前 schema 3 增加 `customActivities`、`deletedActivityIds` 和 `activityOrder`；`activityOverrides` 支持名称、日期和时间/描述。稳定 ID 在移动、排序和删除/恢复后不变；每日笔记仍属于原日期，关联的预约备注仍属于原 booking ID。升级不重置笔记、不删除原 key，也不改写 `trip-data.js`。

「旅行卡片 → 导出个人备份」包含完整个人行程和笔记/预约状态。继续使用 `_format: paris-pocket-backup-v1`，格式由 `schemaVersion` 区分。schema 3 备份导入会完整替换个人行程，包括新增、删除、日期和顺序。原始/时间编辑版本的旧备份会替换笔记与预约状态，并合并它能表示的活动修改，保留当前日期移动、新增、删除和顺序；确认框明确说明。旧版本 app 无法完整恢复新版备份，先更新再导入。

导入前校验类型、日期、ID 和顺序，并要求确认替换。失败保存不会提交活动/导入状态或显示成功，编辑输入保持在对话框中。原有数据无法读取时暂停写入，避免用默认数据覆盖旧笔记；不要清除生产网站数据来处理警告。

每次写入前比对读取时的 storage 快照，另一个窗口保存后，旧窗口会拒绝覆盖并提示先导出/复制输入，再重新载入最新状态。此检查是本机旧窗口保护，不是云同步或跨设备事务。备份只在当前设备、浏览器与 origin 保存；关闭编辑窗口前需保存，未保存草稿不持久化。私人备份请不要提交到 GitHub。

## PWA 发布与更新

每次发布任何离线核心文件时，修改 `sw.js` 的 `CACHE_VERSION`，发布完整目录。核心资源安装全部成功后才有新版本可用；内容使用当前版本的完整缓存，避免 HTML / JS 混用。新 worker 等待用户点击更新；首次安装不触发自动刷新，正在编辑时禁止主动更新。缓存清理仅针对 `paris-pocket-` 前缀，不触碰 localStorage。地图引擎与地图瓦片仍需要网络；地点列表反映编辑后的日期与删除状态。默认外部链接现为 Google Maps HTTPS URLs：查看位置、步行、驾车。URL 使用已有地点坐标，保留嵌入式 Leaflet 地图；无 API key 或付费集成。iPhone 的 app/browser handoff 由系统和安装情况决定，仍需真机验收。

首次从原型升级：在线打开原网址并刷新，让原来的 network-first worker 获取新界面；若出现「新版本已准备好」，保存当前输入后点击。不要删除主屏幕图标或清除站点数据来更新。后续更新按同样方式操作。后台挂起、跨窗口更新与实际 iOS 行为仍需手机验收。

## GitHub → 现有 Netlify 网站

现有 Git remote 是 `https://github.com/jayven/Paris--traveler-note.git`。现有仓库通过 Netlify webhook 自动部署；本次 V1.1.1 发布已获用户授权，发布结果以 PR 检查和原站点验证为准。

1. 在功能分支审阅 diff、测试与备份兼容性。不要将私人备份、真实确认号或 secrets 放进仓库。
2. 经授权后推送功能分支并创建 PR；若现有 Netlify 已配置 Deploy Preview，用它在手机验收。只有确认关联后才能依赖该预览，不假定它已配置。
3. 在 Netlify **现有** `stirring-cheesecake-37698e` 项目核对 GitHub 仓库、生产分支及 publish directory。静态应用无 build command，publish directory 为仓库根目录 `.`；连接/调整设置需用户授权。不要创建替代网站。
4. 主分支合并可能立即触发生产发布，因此只有用户明确批准本次发布后才能合并或推送生产分支。
5. 发布后在原 HTTPS 地址与已安装的主屏幕 app 验证版本提示、备份、笔记、离线读取。回滚到本次改动前的 app 会忽略新增覆盖字段，所以回滚前导出新版备份并保留它；不要尝试用旧 app 恢复编辑。

## iPhone 手动验收

1. 在现有生产 app 的「旅行卡片」导出备份。对新代码使用局域网预览验证界面；离线验证需要独立 HTTPS 预览，经授权后再准备。
2. 添加一个活动并改名，移动到另一天、上移/下移、删除并从「已删除的安排」恢复；刷新确认全部保留。编辑午餐活动为 `12:15–14:15`，写两行描述并保存。切换日期/标签，刷新、关闭再打开，确认修改仍在。
3. 导出新版备份，恢复该活动原始安排，再导入新版备份，确认修改恢复且笔记/预约勾选没有变化。取消编辑应保持当前保存内容。
4. 输入 `25:00` 或早于开始时间的结束时间，确认有错误提示且没有保存。验证 `晚上` 和结束时间留空。
5. HTTPS 预览在线完整打开一次后，添加主屏幕；进入飞行模式，重新打开、编辑、刷新，并检查地图离线提示和地点列表。
6. 检查真实键盘打开后可滚动到保存/取消；用 VoiceOver 读取标签、错误和日期选择。准备新版本后，应保持未保存输入，直到手动保存/取消并更新。

已实现 V1.1 的活动新增、编辑、日期移动、删除/恢复、排序和本机持久化。V1.2 为 Google Maps 外部导航与嵌入式地图改进；V1.3 为酒店、餐厅和预约管理；V2.0 为跨设备和两人同步。视觉设计与动画另外讨论，当前保留原有视觉风格。

Google Maps URL 参数依据 [Google 官方文档](https://developers.google.com/maps/documentation/urls/get-started)。点击前核对目的地；已有坐标通常为景点中心，不能当作已核实的入口、集合点或上车点。真机验收应分别测试已安装/未安装 Google Maps 的情况。
