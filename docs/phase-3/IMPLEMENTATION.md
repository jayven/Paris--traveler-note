# Phase 3 — 实施决策与维护契约

2026-11-09。用户已授权 Phase 3；保持功能分支，不合并 main 或部署生产。本文件记录对 Phase 1 方案的实施复核，取代其中尚未运行的建议模块名和额外机制，不改动 PRD 的产品目标。

## 选择最小可靠方案

这是一个两人、八天、无登录的静态 App。无需后端、框架、多数据库、多文件 staging、实时个人云同步或可扩展 schema 管理框架。

- `official-data.js`：无 DOM/存储的官方 schema、ID、引用、日期、状态、任务排序、路线校验。
- `trip/source-v4.12.json`：可读维护源，稳定的语义 ID；`location-verification.json` / `route-overrides.json` 是维护输入，构建为 **一个**官方 JSON 快照。
- `trip/manifest.json`：schema 1、tripId、tripDataVersion、releaseSequence、同源哈希路径、SHA256 与字节数。
- `trip/releases/<sha256>.json`：不可变快照；`trip/bootstrap.js` 与它内容一致，随完整 shell 缓存，用于空 IDB 的首次离线初始化。
- `local-store.js`：单个 `paris-pocket-local` IDB，DB version 1、单个 `records` object store；`personal`、`current`、`previous`、`importPrevious` 分开的 key。个人 schema 4。原生事务完成后再报告成功。
- `views.js`：无状态 HTML 组件；`app.js`：四个导航、表单、自动保存、同步及 Leaflet；沿用 `styles.css` 的已批准视觉。
- `legacy.html` / `legacy-app.js`：Phase 2 原功能完整保留，仍使用未改的 `personal-data.js` / `itinerary-data.js` / `trip-data.js`。隔离历史设计预览不进入新版主界面。

一个 IDB 事务可以提交 current/previous 与必要归档，避免两套新存储。只有一个 previous 官方版本和一个导入检查点；不承诺任意历史时间旅行。

## 个人资料与恢复

新版不写旧 localStorage。初始化先保存原字符串/SHA256、解析前的字段、旧公共 canonical 上下文，再在独立读回后标记 ready；未标版本及 1/2/3 接受，字面 0、未来版本、非法资料进入原文恢复档案并暂停新个人写入。读取失败不等于没有资料，不能初始化空记录。

旧 dN-N 修改、删除、排序、booking 勾选、自建活动、每日/预约/通用笔记和未知嵌套字段完整保留；不自动转换为新活动备注/任务完成或官方预订确认。旧窗口后续修改按原文 hash 去重并另存恢复候选。旧编辑器仍能使用该旧键；迁移后不清空或重写它。

备注按稳定 activityId 保存，官方退役活动保留最后官方活动快照和孤立备注。个人任务为 local-UUID，名称必填、默认中优先级，截止日期不从参观日期推导。官方任务不因缺 ID 自动取消，须显式 archived；归档和完成独立。

所有保存用 IDB 同事务 revision CAS。UI 记录打开备注/任务表单时的版本，后台刷新不能替陈旧表单取得新 revision。失败保留输入；同活动已被另一窗口修改时，明确重试会先询问是否覆盖。

完整备份 marker `paris-pocket-backup-v2` / personal schema 4，含新版个人资料及所有旧档案/上下文。导入纯预检 → 范围/数量预览 → 确认 → 原子检查点与替换。v1 导入只进入旧恢复区，不覆盖新版备注或任务。撤销只允许导入后未有新修改；旧档案始终合并保留。有未保存草稿时，完整导入/导出暂停，可单独导出草稿。IDB 不可用时仍可尝试导出当前旧存储原文。

## 官方发布与回退

打开检查及手动同步使用同源 manifest + 一个快照请求。下载在事务外校验：大小、SHA256、schema、版本、ID/order/引用/日期/URL/路线；然后事务检查 current 未被其他请求或回退改变，再一次提交。失败继续用最近成功内容，不把检查时间冒充成功更新时间；无变更只更新 checkedAt。

回退只改变官方快照，保留个人内容，固定已隔离 hash 与最高已见发布序号。普通检查不能装回隔离版本；更高序号修复或用户明确重试且再次通过校验后才解除。内容修正必须提高 releaseSequence，不能复用同一序号换字节。

**当前只接受 data schema 1。** 未知 schema 整包拒绝，不修改 current/previous，也不读写不认识的个人 schema；必要时只读使用同 shell 的校验 bootstrap。没有未来 schema 2 写入器，因此不引入 speculative compatibleActiveBySchema 表。未来升级 data schema/DB version 前，必须另外设计保留每个仍支持旧客户端的兼容快照，新增连续两次新 schema 发布与旧客户端离线恢复测试，不能直接复用本实现覆盖唯一兼容版本。

AppVersion 与 tripDataVersion 分开。SW 的 scope、URL 和 manifest id/start_url 未改；只缓存完整代码/bootstrap/图标。独立官方 manifest/releases 绕过 shell cache。等待用户点击更新，保护备注和表单，失败安装保留旧完整 shell。地图底图/CDN 不批量缓存。

## 维护与发布准备

1. 修改公开 `trip/source-v4.12.json`，保留同目标 ID；不同预订目标用新 ID。删除任务改 explicit archive，删除活动记录 retiredActivityIds。
2. 核实事实、地点语义和供应商许可；未核实的路线保持 null。路线准备默认离线报告，`--fetch` 仅维护者手动低频调用，见 [地图来源](MAP_SOURCES.md)。
3. 修改版本时同时调整 tripDataVersion、releaseSequence 和 routeDataVersion，然后 `npm run build:trip`、运行测试。构建器不做网络地理编码，不产生私人资料。
4. **保留已经发布的 hash 文件。** 此轮仅删除未公开的中间开发快照，仓库保留当前首个发布候选。构建会验证并复制 `trip/releases/` 全部保留的合法 hash 文件，不能只复制 active；当前无自动裁剪策略。PR 检查相对 base commit 拒绝删除/修改既有文件。后续不得替换已发布 hash 的内容。
5. `npm run build:site` 生成 `dist/` 明确公开白名单：完整运行 shell、图标、manifest/bootstrap、全部保留的合法 hash 快照及缓存 headers；排除 docs/tests/scripts、来源 PDF/ZIP、私人备份、dotfiles。构建不是部署。
6. 此轮没有修改 Netlify 设置。现有 PR #2 preview 的 fe21176 已由 Netlify 只读部署记录核实；后台 build/publish 设置未暴露、未登录访问 401，详见 [预览核查](HTTPS_IPHONE_ACCEPTANCE.md)。当前 PR 标题 `[skip netlify]` 防止评审更新自动部署；解除或手动 draft 均须另批。未来获批准时，先核对 existing site 的发布目录，使用 dist 完整产物，做独立 HTTPS 真机检查。只推 feature 不合 main；main 的既有 webhook 可能立即生产发布。
7. App 代码发布需同步 appVersion/package 及 SW CACHE_VERSION；纯官方内容更新可保持 shell，但仍须验证 schema 兼容和不可变版本契约。

本实现不保证浏览器永不清理存储。Safari/主屏幕/不同 origin 的个人记录并不自动共享；需要导出备份。未保存草稿只在当前内存中，页面被系统强制关闭可能丢失；失败时及时复制或导出。
