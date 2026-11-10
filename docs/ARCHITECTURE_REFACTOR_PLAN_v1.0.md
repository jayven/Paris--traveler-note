# Paris Pocket — Architecture Refactor Plan v1.0

> 历史 Phase 1 方案/基线保留供追溯；当前 Phase 3 实现与实际测试见 [评审包](phase-3/README.md) 和 [实施决策](phase-3/IMPLEMENTATION.md)。未实施的未来门槛不得视为已经通过。

日期：2026-11-08。状态：**Phase 1 评审方案，尚未实现**。审查基线 `05790404b87b616db7b1a786770232dc55fbfe7b`；替代仅审过旧 ZIP 的 v0.1。执行范围以用户 Controlled Refactor 请求为准，不采用 v0.1 的内部阶段编号推进开发。

## 1. 基于实际代码的决策

保留原生 JavaScript、静态 Netlify 与现有 PWA 安装身份，不引入 React/Next/TypeScript 或运行时后端。已有纯 personal-data、itinerary-data、map-links 模块及 Node/浏览器测试，说明可在现有结构上渐进拆分。

v0.1 现状需纠正：活动编辑已完整实现，个人数据已到 schema 3，Google Maps 已替代 Apple，SW 已实现完整 cache-first shell 和等待激活。这些安全机制可复用；未来官方只读方向要求隔离编辑器，而非继续扩展。详细事实见 [审计](../AUDIT.md)。

本轮只修改文档，以下均是下一阶段建议。功能依据 [PRD](references/Paris_Pocket_PRD_v1.0.md)，真实行程依据 [v4.12 核对](ITINERARY_v4.12_REVIEW.md)，外观依据 [UI v1.1](references/UI_STYLE_SPEC_v1.1.md)。

## 2. 模块边界与最小改动

```text
index.html / styles.css / app.js（薄入口、日期与底部导航）
  ├─ views：overview / daily / detail / todo / map（渐进提取，无新路由框架）
  ├─ official-data.js：官方快照纯校验、引用与版本契约
  ├─ official-store.js：IndexedDB 事务、active/previous 快照、读取
  ├─ personal-store.js：新个人 envelope、revision、事务保存
  ├─ migration.js：未标版本旧格式及 schema 1/2/3 解码、保留区与审核映射
  ├─ sync.js：请求、完整性检查、提交、状态与重试
  ├─ map.js + map-links.js：Stop/Segment 显示和 Google URL
  └─ legacy：当前 personal-data.js / itinerary-data.js 只服务恢复与旧备份

trip/manifest.json → trip/releases/<content-hash>.json
   （单个自包含官方快照：Trip/Days/Activities/Places/Stops/Segments/Tasks）
local IndexedDB：officialSnapshots | personal | metadata
legacy localStorage：paris-pocket-personal-v1（保留，停止新版写入）
```

文件名是建议，逻辑职责为契约；先沿用当前小模块输出方式，避免同时改成全新框架和存储。只在可独立验证时抽出 view。公共资源位于实际站点根下的 `trip/`，不假定仓库 `public/` 会自动变成发布根。

建议新本机数据与官方快照都用原生 IndexedDB，分别存入 object store：相同数据库支持快照指针/迁移检查点/个人记录需要时的原子提交，避免两套新存储重复写入。旧 localStorage 仍保留。此为架构选择，iOS 存储失败/升级阻塞必须测试，不承诺永久保存；不因失败自动创建另一套活跃 localStorage 数据源。[IndexedDB 事务规范](https://w3c.github.io/IndexedDB/#transaction-concept)。

## 3. 官方数据契约（schema 1 建议）

一个 JSON 快照包含下表；Geometry 初版内联到 Segment，同步只需 manifest + 一个文件。体量需要拆分时再增加分文件哈希列表和全量 staging，不预先增加请求数。

| 对象 | 关键字段与不变量 |
| --- | --- |
| Manifest | schemaVersion、tripId、tripDataVersion、releaseSequence、snapshotUrl、sha256、byteLength、兼容 app/data schema 范围；同源固定允许目录，版本发布后内容不可改 |
| Trip / Day | tripId、tripDataVersion、timezone、起止日期；8 个唯一日期、显式 dayId；住宿列表、来源版本 |
| Activity | 稳定 activityId、dayId、order、title、timeLabel、detail/执行说明、status、placeId?；order 唯一且显式，不能按时间排序 |
| 时间/状态 | timeLabel 支持精确/范围/上午/待定；可选 ISO 本地日期时间用于校验。planningStatus（已确定安排/待核/可选/后备）与 reservationStatus 分开；不能由时间推导已订 |
| Place | 稳定 placeId、名称、地址、locationType、verifiedLocation?、navigationTarget?、source/page/url/checkedAt/核验状态；中心不自动当入口 |
| Stop | 稳定 stopId、activityId、placeId、dayId、order；一个 Place 可多次到访，重复坐标保留身份与顺序；活动可多 Stop |
| Segment | segmentId、fromStopId、toStopId、dayId、order、mode、verifiedStatus、geometry?、routeDataVersion、provider/生成及审核来源；模式 walking/driving/rail/boat/unknown |
| Official Task | taskId、title、priority、dueDate?、links/notes?、dayId?/activityId?、status active/archived、archiveReason?、lastContent；新目标新 ID |
| 条件活动 | conditionGroupId 与公开条件描述表示周一首选/周四后备；最多一次实际游船，不另造用户 Plan A/B 编辑器 |
| 变更/归档 | 官方任务消失不代表取消：必须保留显式 archived 记录；活动显式 retirement 保留历史身份，供个人备注恢复 |

首次 v4.12 导入创建独立、持久的 ID registry；按人工核实的语义对照旧 IDs，不按日期/位置/标题重算 ID。以后同活动换日/改时/改名仍用同 ID。同景点不代表同预订目标。

校验器拒绝：未知 schema、错误 trip/date/timezone、重复 ID/order、悬空引用、错误状态、错误坐标范围、未核验目标被标为已核验、Segment 端点/日序/版本不匹配、非法 GeoJSON、非有限数值、把 rail/boat 标为 driving 验证路径、非法 URL 协议/资源越界、超出大小限制等。GeoJSON 坐标序为 [lng,lat]；与 Leaflet [lat,lng] 明确转换。业务检查不能仅靠 JSON shape：检查酒店取包闭环、周三无 Louvre、一次游船规则等。

## 4. 个人数据与 legacy 隔离

新个人 envelope 建议 schemaVersion 4，但保存在新 IndexedDB 命名空间，不写回旧 schema 3 键：

- notesByActivityId、localTasks（local-UUID）、completionByTaskId；本机任务与 official task ID 分 namespace。
- archivedSnapshots / orphan records：保留已移除活动的备注和正式归档任务的最后内容、历史完成状态。
- legacyArchive：原始字符串/hash、旧数据版本与公共 canonical 上下文、全部旧字段、审核映射及迁移版本。旧编辑、删除、顺序不影响新官方视图。
- revision、migration 状态、导入前检查点、未知扩展字段；不存公开 JSON、不传回服务器。

旧每日备注/booking 备注/通用备注进入可查看与导出的「旧资料」；旧自建活动和描述修改保留为个人旧安排，不自动转成官方活动、活动备注或 To-do。完整步骤及 rollback 见 [迁移规范](DATA_MIGRATION_AND_ROLLBACK_v1.0.md)。

## 5. 原子同步与缓存分离

1. 先读取当前 appVersion 与兼容数据 schema，再从 metadata.compatibleActiveBySchema 选择该 app 可读的最近成功快照；全局 active 不兼容时不可强读。离线从 IndexedDB 读取，不依赖新网络成功才能呈现。
2. 打开时检查 manifest；用户可手动同步。请求网络，manifest 与版本快照均不进入 SW shell cache-first 分支；设置合适的 HTTP 缓存策略，不能只加 fetch cache:no-store 却仍被 SW 返回旧内容。
3. 下载候选快照，在事务外完成大小、SHA-256、schema、ID/关联、时间/业务/路线验证。checksum 检测不完整与混版，不等同签名认证。
4. 检查当前请求 generation、releaseSequence 与最新 active；旧并发响应不得覆盖新版本。发布内容回退用更高 releaseSequence 的明确回退 manifest，不能重用旧版本号改内容。
5. 单个 IDB readwrite 事务写入已验证快照、previous/active 指针与成功同步时间；如需记录显式归档快照，与个人 archive 在同事务提交，不触碰个人备注与完成状态。只在 transaction complete 后报告成功；不能把某个 put 的 success 当整体成功。
6. 缺失任务若未显式 archived，按不完整发布拒绝；活动 retirement 的孤立备注保留。首次导入旧 booked 不用于推断官方确认状态。
7. 下载、哈希、验证、quota、中断、兼容性或事务失败：active/previous/个人数据不变。lastCheckedAt/失败原因与 lastSuccessfulSyncAt 分开；无变化检查不假装装入新版本。
8. 保留 active/previous 及每个受支持 data schema 最近的兼容快照指针（compatibleActiveBySchema）；不能因连续两次新 schema 同步删掉旧客户端唯一可读版本。所有被兼容/回滚指针引用的快照禁止清理；超出支持范围的旧 app 用其兼容 bootstrap 只读降级或提示升级，不读写未知结构。清理候选仅在成功提交后，个人数据绝不随快照清理。

本地选择 previous 回滚时，在 metadata 固定 rollback pin 与 quarantined release/hash，并单独保留 highestObservedSequence，避免下次自动/手动同步重新装入已隔离坏版本。普通同步保持 pin 并显示原因；只有用户明确重试该版本，或更高序号的修复/授权回退发布经验证后才解除。

启动无已存兼容快照时，用该 app 随发布的、经校验的 bootstrap 快照初始化。其真实 tripDataVersion 明示；初始化成功后才成为 active。首次离线且从未完整安装时不承诺可用。

旧 cache-first v4 worker 只拦截 CORE 和导航；新 `trip/` 数据请求须确认控制当前页的 worker 与 schema 兼容。先切换兼容 shell，再启用新同步；新数据 path 不能被当成 HTML fallback。`sw.js` URL、scope、manifest id/start_url 保持。应用外壳只缓存代码、图标、合法 Leaflet 静态资源及明确 bootstrap，更新时仍等待用户并保护备注/本地任务/备份草稿。跨窗口旧客户端与旧缓存清理须验收，不能强制所有页面无条件刷新。[Service Worker 规范](https://w3c.github.io/ServiceWorker/#update-algorithm)。

## 6. 地图、定位与供应商门槛

保留 Leaflet、异步 generation 防护与文字列表。按 Stop 渲染，编号来自官方 order；同坐标用可点的访问列表/聚合标记区分早存晚取，不移动坐标来「避重叠」。地图与时间线共用 activityId/stopId 详情。过滤/隐藏路线只改变可见性，不重排或重算官方动线；初版默认所选旅行日。

Google Maps URL helper 继续使用坐标/经核实地址/Place ID，增加可选明确 origin。当前位置导航省略 origin，单段路线传审核后的起终点；不猜测 Place ID。标准 URL 无需 API key，iPhone app/browser 实际 handoff 仍需真机验证。[Google 官方 URL 文档](https://developers.google.com/maps/documentation/urls/get-started)。

道路轨迹发布前生成并审核，记录供应商/条款/署名/生成与核验日期；本轮不选择或调用付费路由。若条款尚未确认或位置不确定，该段保留端点与未核验提示，不发布 geometry。铁路/水路不能借驾车轨迹替代。全部定位/路线 P0 未通过前，不把单纯图钉版称为最终可用版本。

现用 OSM 标准瓦片服务是尽力提供，禁止批量预取/离线下载，需遵守缓存头、正确 URL 和可见署名；底图与路线许可分别核实，不以开源底图推断路线可永久保存。后续修正现有 `{s}.tile...` 为政策要求的地址并验证 Referrer/缓存行为；Phase 1 不改 runtime。[OSM Tile Policy](https://operations.osmfoundation.org/policies/tiles/)。

## 7. 视觉与信息架构边界

只取 UI v1.1 的 token/字重/边框/阴影：#0D0D0D、#FAFAFA、淡桃/粉/蓝/薄荷、#57B886，1px 黑线，2px 硬阴影。列表时间与名称之间无竖线；仅时间+名称，不加详情/标签；详情放统一 sheet/dialog。

保留现有手机日期切换与底部导航，按 PRD 调整预约→To-do、提供只读概览与详情，不照搬参考 HTML 的三 tab 或 JSX 桌面侧栏。旅行信息/备份/旧资料仍须可达。触控≥44px、输入≥16px、safe-area、键盘滚动/焦点/屏幕阅读器优先于像素照搬；参考预览的小按钮不足 44px 不继承。

Phase 2 可用明确标记的 mock/view-model 呈现尚未实现的页面，不能把演示勾选/同步按钮当持久化功能。真实旧记录保持可访问；不在视觉阶段执行数据迁移或删除编辑字段。

## 8. 实施顺序与审批门

| 用户阶段 | 小批次实现 | 退出条件 |
| --- | --- | --- |
| Phase 1（本轮） | 当前审计、产品文档、架构、迁移/回滚与测试计划 | 本包可审阅；**停止，等用户批准 Phase 2** |
| Phase 2-A | CSS token、页面壳/日期/导航样式与必要 view 分离 | 保留当前数据及回归；无主要产品功能扩展 |
| Phase 2-B | 最简时间线/统一详情/地图外围/To-do 视觉，必要 mock 明示 | 390px 四屏截图、320/375/430px 检查；用户 UI 评审 |
| Phase 3-A | 官方 schema/ID registry、旧 canonical fixture、legacy 归档/导入检查点、IDB stores | 迁移/回滚失败测试先通过，再允许真实存储写入 |
| Phase 3-B | v4.12 逐日数据与状态、只读详情、备注和本地/官方任务 | 新旧记录均可达；稳定 ID/排序/归档符合 PRD |
| Phase 3-C | manifest/同步/兼容 shell、事务提交、离线回退 | 404/损坏/并发/中断/新旧 worker 及数据版本测试通过 |
| Phase 3-D | 核实 Places/Stops、许可审核的预计算路径、单段导航/过滤/降级 | 重访/行李闭环/混合交通与路径 P0 全覆盖 |
| 最终发布门 | 隔离 HTTPS 预览、真实 iPhone、旧→新→旧→新演练 | 用户分别批准 main 合并及生产发布；同一站点 |

可交叉开发纯模型，但任何个人数据写入先过迁移门；任何正式路线发布先过供应商和定位审核。无需把 v0.1 的内部「阶段 1–5」当成用户阶段或绕过 UI 评审。

## 9. 风险与待决策

架构建议由本次评审确认：原生 JS + 单快照 + 新 IDB 命名空间、旧编辑完整归档。Phase 2 开始必须等用户批准；无其他决策阻塞 Phase 1 完成。

行程 DATA-01/02/03 的船、Louvre、车船班次需要用户/后续行程定稿；可保持待核进行架构与视觉，不能阻碍到假造时间。定位来源、路由生成/存储许可、Netlify Preview 与未来发布目录设置、真实 iPhone 存储与 handoff 是后续门槛，不是假称已核实。

详细验收与回滚分别见 [测试计划](TEST_PLAN_v1.0.md)、[迁移规范](DATA_MIGRATION_AND_ROLLBACK_v1.0.md)。
