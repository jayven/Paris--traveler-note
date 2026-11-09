# Personal Data Migration & Rollback v1.0

日期：2026-11-08。**设计规范，Phase 1 不执行任何用户数据迁移。** 代码基线 main `0579040`。只使用模拟资料做后续自动化测试，不索取真实私人备份作为测试 fixture。

## 1. 已核实的旧存储契约

唯一持久化个人键：`localStorage['paris-pocket-personal-v1']`（personal-data.js:4）。没有现有 IndexedDB 数据库。未标 schemaVersion 及 schema 1/2 在内存归一为 3，schema 3 直接校验，读取不立即写回。显式 schemaVersion:0 与其他未知版本会拒绝，不能把“无版本旧格式”（概念 legacy-0）误写为支持数字 0。marker `paris-pocket-backup-v1` 不随内部 schema 变化。

| 字段 | 当前语义 | 新版必须保留的方式 |
| --- | --- | --- |
| booked | 旧 bookingId 字符串列表；没有严格引用/去重约束 | 保留原列表、旧任务内容/日期；仅审核后映射新完成目标，不能推断公共确认状态 |
| dayNotes | 按旧日期存的文本 | 可查看/复制的旧每日笔记；不分配到当天第一项活动 |
| bookingNotes | 按旧 bookingId 的文本，可能孤立 | 原 ID 与最后公共 booking 上下文，映射不确定也保留 |
| hotelNote/flightNote/miscNote | 通用旅行文本 | 旧旅行笔记区，支持查看/导出/复制，不因换 tab 消失 |
| activityOverrides | ID→time/end/detail、可选 title/date | 旧个人安排档案；完整原修改和原活动上下文，不应用于 v4.12，不自动把 detail 当新活动备注 |
| customActivities | user-UUID→id/title/date/time/end/detail/type | 保留 ID、日期和全文，可查看/导出；不自动变官方活动或本地 To-do |
| deletedActivityIds | 原/自建活动 tombstone | 保留删除记录和可恢复原内容；不让其隐藏新官方活动 |
| activityOrder | 日期→活动 ID 顺序 | 保留，包括未知合法 ID；不重排新官方顺序 |
| 未知字段/孤立 ID | 顶层扩展或不存在的引用仍可能被旧代码接受 | 原始字符串无损保留；新解码器不能只过滤当前已知 ID |

`normalize()` 仅保留顶层未知字段；重建活动覆盖和自建活动时会丢掉嵌套未知字段。因此原始字符串是保全依据，不能把 normalize 后 JSON 当作唯一备份。旧 app 若读取新 schema 4 会阻止写入，但不能利用这个副作用替代隔离。

`expectedRaw` 是比较后写入，不是跨窗口事务。现有错误保护值得复用，但新架构不可宣称它实现数据库级原子性。

## 2. 新命名空间与最小 envelope

建议 IndexedDB 数据库 `paris-pocket-local`、DB version 1：

- `officialSnapshots`：由 tripId + tripDataVersion + hash 标识的验证成功官方快照。
- `personal`：tripId→schemaVersion 4、revision、notesByActivityId、localTasks、completionByTaskId、archivedSnapshots/orphans、legacyArchive、扩展字段。
- `metadata`：active/previous 与 compatibleActiveBySchema 版本指针、回滚 pin/隔离版本、最高已见发布序号、成功同步时间、迁移 ledger、导入前 checkpoint 元信息。checkpoint 个人快照可用 personal store 的独立 key 保存。

三个 store 是逻辑建议，不必拆成更多表。通过 IDB 事务提交关联变更；异步网络、哈希和纯校验在事务外完成。`paris-pocket-personal-v1` **保持原字符串、不删除、不升级写回**。新版只写新命名空间，不双写回旧键，避免失真降级和旧标签页互相覆盖。

legacyArchive 至少有 sourceKey、sourceRaw（含 unknown nested 字段）、sourceHash、sourceSchemaVersion、sourceTripVersion（如有）、migrationVersion、旧公共 itinerary snapshot ID/hash、迁移时间、审核映射/未解决关联。原 public canonical 冻结成测试/兼容 fixture，供读取 dN-N 的原始活动名/日期/预约关系。该 fixture 来自 main，不含任何私人记录。

## 3. 首次迁移状态机

| 状态 | 允许动作 | 提交/失败规则 |
| --- | --- | --- |
| 未检查 | 读取原键、检测新 DB 已完成状态、获取旧 canonical 上下文 | 存储读取失败即提示，不能当成空资料 |
| 已读取 | 在内存保存原始字符串与 SHA-256；缺 key 用 null 明确表示无旧资料 | 不创建空旧键；损坏/未知未来 schema 不强行 normalize |
| 候选有效 | 解码已知旧格式，统计字段/旧活动/孤立关联，生成 legacyArchive 与新空个人容器 | 展示保留/映射范围；自动迁移不自动把旧修改套入新官方数据 |
| 待提交 | 读回旧键比对 sourceRaw，IDB 事务检查 ledger/revision，写 archive、个人候选、migration checkpoint | 幂等键 migrationVersion+sourceHash+tripId；重复启动不得复制资料 |
| 已提交待校验 | transaction complete 后读回，校验原 raw/hash、字段与新 schema；再次读取旧键 | 验证成功才将 ledger 置 ready；读回失败保持 recoverable，不启动依赖迁移完成的写入 |
| ready | 打开新版视图，旧资料入口与新备份可用 | 旧键仍不动；新写入按 revision 事务保护 |
| blocked/recovery | 原始资料导出、说明、重试；原数据与已有新数据保留 | 不清缓存、不初始化覆盖、不记为成功；不要把错误写入原键 |

首次检查点与可见 ready 标记采用可恢复的两步状态；重启读到未 ready 的 checkpoint 必须重新验证，不重复生成 records。任何 quota/中断都不删除旧键。存储不可写时可继续读取已有快照/资料并保留输入供导出，不能显示「已保存」。

localStorage 与 IDB 之间无法组成一个事务。前后 sourceRaw 比对只能检测常见并发，不能承诺零竞态。因此：迁移 ledger 固定原 hash；前台恢复、storage 事件和后续保存前检查旧键变化。发现旧 app 后续写入，保存为**独立恢复候选**并提示核对；不再次自动迁移覆盖新版个人记录。若无法持久保存恢复候选，保留旧键并显示阻塞/导出提示。新版多标签页写入本身使用 IDB revision compare/update 同一事务，旧视图更新需刷新或明确冲突处理。

## 4. 身份与状态映射规则

首次 v4.12 发布维护显式 registry：legacyActivityId、legacyBookingId、new activityId/taskId、映射关系（same-target / changed-target / retired / unresolved）、理由、来源、审核人/日期。阶段 1 仅定义规则，不伪造完整映射已审核。

- `dN-N` 是旧身份，即使拼写像顺序也不得按新行程位置重用。新官方活动采用独立持久 ID，以后改名/改日不变。
- 活动映射与预订目标映射分别审核；关联同一博物馆不够。旧英文小团 12/9 的 `booked:['louvre']` **不能**完成新周五中文私人导览任务。
- 原 hotel 勾选与旧候选笔记保留；PDF 的五家酒店确认是官方旅行来源，不可由旧勾选推断、也不反向勾选用户本机任务。
- Sainte/Orsay/Versailles 等改日期可能涉及不同票，默认 unresolved；只有确认「完成目标相同」才复制完成状态，同时保留 legacy 原记录和映射 provenance。
- 旧 arc 登顶、Eiffel 登塔等与新外观/约拍不同；作为旧目标归档，不让新任务继承。旧 boat 运营商亦与 v4.12 冲突。
- 旧未知 ID/自建活动永远有保留区；按标题模糊匹配、日期推断、数组位置匹配均禁止。
- 迁移后新活动备注按新稳定 activityId 保存；官方活动退役时成为可恢复 orphan，重新出现时按相同 ID 恢复关联。

## 5. 旧资料必须可达

最终新版提供明确「旧资料与恢复」入口，查看原每日/预约/通用笔记、原勾选、自建/改动/删除/排序后的旧个人安排，以及无法确认的关联。可复制文本、下载原始备份或完整新版备份；档案不是仅存数据库但界面永远不可见。

新版默认官方视图不受旧覆盖层、删除或排序影响。若用户选择复制旧描述到活动备注，应是明确的单项操作、预览目标、不改变官方正文。新架构不恢复整套旧编辑器为未来产品功能。

## 6. 备份、导入与撤销

### 兼容边界

- 继续识别 `paris-pocket-backup-v1` 的 未标版本旧格式及 schema 1/2/3；旧行为中的低版本合并/3 全替换仅属于 legacy 恢复语义，不拿它覆盖新备注/任务。
- v1 导入显示「导入旧资料」预览，保留全部原 payload 和版本元信息；不直接套用到 v4.12。按 sourceHash 去重；已有新备注/任务不变。审核映射可另行确认。
- 建议新导出 marker `paris-pocket-backup-v2`、schemaVersion 4：tripId、appVersion、tripDataVersion、个人 envelope、legacy 原档案与 orphan、导出时间和完整性摘要；不包含 credentials，不上传。官方快照如包含仅作恢复上下文，不能绕过官方同步校验成为发布来源。
- 旧 app 不能完整读取新备份；不得把新格式冒充 v1 保证「双向兼容」。旧 key/原始 v1 导出用于旧版本回退，新 v2 用于新版完整恢复。

### 导入协议

1. 读取有大小上限的文件，在内存完整校验 marker/schema/tripId/类型/ID/URL/长度；未知未来 schema 明确拒绝但允许原文件保留。HTML 文本转义，拒绝可执行 URL 和原型污染字段。
2. 显示来源版本、各类数量、替换/合并/归档范围及冲突；明确私人资料仅本机，建议保管备份。取消不写任何数据。
3. 创建当前个人状态的 pre-import checkpoint；事务检查 revision 后同时写 checkpoint 与候选、递增 revision。不能先覆盖再尝试备份。
4. transaction complete 与读回验证后才成功，失败保留原数据和文件。恢复 checkpoint 时同样先保留当前状态。
5. 「撤销导入」只在 revision 未发生后续编辑时直接恢复；如有新编辑需差异预览/显式恢复，避免撤销顺带丢掉后来的备注。恢复也不删除旧 key。

损坏旧 JSON 的原始下载必须直接读取 raw 字符串，不走 normalize。当前 app 导出在 storageBlocked 时被禁止，这一缺口应补为恢复入口；原始下载不能标成已校验可导入的普通备份。

## 7. 三种回滚及边界

| 回滚类型 | 步骤 | 保留与限制 |
| --- | --- | --- |
| 官方数据 | 选 previous 已验证快照并事务设置 rollback pin/隔离坏版本 hash，或更高发布序号的明确回退 manifest；事务更新 active 和版本状态 | 不回滚个人备注/完成状态；活动关联按 ID，orphan 仍保留。pin 下自动/普通手动同步不得装回已隔离版本，明确重试或更高修复序号才解除 |
| 应用代码 | 出故障时按批准流程在原 Netlify 站点恢复已知稳定代码；SW 验证完整缓存后切换；不改安装身份 | 旧 app 读原 key；看不到新备注/任务不等于数据被删除。新 DB 与新备份保留，重新升新版恢复访问 |
| 导入/迁移 | 读取 validated checkpoint，事务检查 revision、保留现状后恢复；失败保持原状态 | 不能用清空 localStorage/IDB/cache 代替回滚；旧 key 仍不动 |

代码回滚不会把新数据「自动转回」旧 schema；若旧 app 在回滚期间编辑旧键，再升级必须呈现独立旧资料候选，不能覆盖既有新个人记录。新 DB 结构升级遇旧标签页 versionchange/blocked 要提示关闭旧页，不强删数据库。

发布前用户在旧 app 自行导出备份并妥善保存；维护者不需要拿到其中私人确认号。真机或隔离 origin 演练旧→新→旧→新，包含新旧标签页同时打开、安装中断、重启、容量不足、无网络。只有测试和人工评审通过后再申请生产发布。

## 8. 完成判据（尚未实现）

全字段归档/原 raw 不变、幂等、失败阶段恢复、显式身份映射、可达档案、导入检查点与撤销、旧键后续变化、活动变更 orphan、任务归档、四段回滚、真实 iPhone 均通过。测试矩阵见 [TEST_PLAN](TEST_PLAN_v1.0.md)。Phase 1 不得把这些计划写为已通过。
