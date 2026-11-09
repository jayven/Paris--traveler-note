# Paris Pocket — Test & Acceptance Plan v1.0

> 历史 Phase 1 方案/基线保留供追溯；当前 Phase 3 实现与实际测试见 [评审包](phase-3/README.md) 和 [实施决策](phase-3/IMPLEMENTATION.md)。未实施的未来门槛不得视为已经通过。

日期：2026-11-08。分清「本轮已重跑的旧版基线」与「后续必须新建的测试」。所有自动化只用模拟资料和隔离 profile/origin，不读取真实用户 localStorage、不提交私人备份。

## 1. 本轮基线结果

main `0579040`，runtime 未修改。2026-11-08 重新执行：

| 命令 | 结果/实际覆盖 |
| --- | --- |
| npm test | 20/20；personal-data 7、itinerary 9、map-links 4 |
| tests/browser.cjs | PASS；旧编辑/转义/reload/导入导出/验证/quota/损坏存储/320–1024px/离线/Google URL/主要 tab |
| tests/management.cjs | PASS；schema 2、增删改/跨日/排序/恢复/稳定 ID、预约备注保留、备份/离线/旧窗口冲突 |
| tests/pwa.cjs | PASS；旧 worker→新 worker 等待激活、草稿/原 storage 保留、自家缓存清理、完整离线 shell、缺核心文件安装失败时旧 shell 可用 |

本地 server 4178；PWA 模拟自带 server 4174；Chrome headless + iPhone 13 参数，未捕获页面错误为零。Playwright 来自已安装 bundled runtime（NODE_PATH），未改 lockfile 或安装新依赖。

常规复现：Node 22+，npm ci，安装 Playwright Chromium 或使用已装 Chrome。`PORT=4178 npm start` 后在另一终端：

```sh
npm test
TEST_URL=http://localhost:4178 PW_CHANNEL=chrome npm run test:browser
TEST_URL=http://localhost:4178 PW_CHANNEL=chrome npm run test:management
PW_CHANNEL=chrome npm run test:pwa
```

test:pwa 自行使用端口 4174。截图 test-results/ 是临时忽略输出。

限制：现有 tests/pwa.cjs:12–14 只换旧 SW fixture，HTML/JS 仍为当前版；它不代表真实旧安装包与新存储/schema 兼容。Chromium 手机模拟不等于 Safari、真实键盘、VoiceOver 或主屏幕 PWA。现有通过不证明未来迁移/同步/路线通过。

## 2. 保留与退役策略

保留所有当前纯数据/URL 测试，作为 legacy 解码与恢复回归。旧编辑 UI 在 Phase 3 退役后，把 browser/management 的编辑断言移到 legacy 恢复 fixture；新产品测试应断言官方正文不可编辑、旧修改可查看/导出。不能为让新 UI 通过而删除旧数据往返证据，也不能反过来为保测试恢复新官方编辑器。

## 3. 后续自动化矩阵（均尚未实施）

| ID | 层/场景 | 必须断言 |
| --- | --- | --- |
| MIG-01 | 未标版本旧格式及 schema 1/2/3 全字段模拟资料 | 每种 notes/booked/override/custom/date/order/delete 均保留，原 key 原字符串逐字不变；显式 schemaVersion:0 仍拒绝并原始保留 |
| MIG-02 | unknown 顶层/嵌套、孤立 ID、重复 booked | raw 与上下文完整，不能被 normalize 或当前 ID 过滤丢弃 |
| MIG-03 | 重复启动/导入、每个提交前后中断 | 幂等、不重复记录，checkpoint 未 ready 重验；无半完成成功标记 |
| MIG-04 | quota/read failure/损坏 JSON/未来 schema/DB blocked | 不初始化覆盖、不报告成功；raw 恢复导出可用，已有新个人状态不变 |
| MIG-05 | 新旧标签页/新版本 revision 并发 | 旧 key 后续变化作为恢复候选，不重迁移覆盖；新 store 事务防陈旧写入 |
| ID-01 | dN-N 与新官方数组顺序改变 | 不因位置重用而附错旧修改/tombstone；显式审核映射决定关联 |
| ID-02 | 同景点不同预订目标 | 旧英文 Louvre/新中文私人导览不继承完成；改日期票务默认待核 |
| NOTE-01 | 自动保存/离线重载/失败输入 | 同 activityId 改名改日仍保留；保存失败保留草稿/错误，不能声称已保存 |
| NOTE-02 | 官方退休/恢复活动 | orphan 可查看/导出/恢复，不删除备注 |
| TODO-01 | 官方+本地、名称必填/默认中/可选字段 | 官方正文只读，本地可增删改，各设备状态独立 |
| TODO-02 | 逾期/优先级/截止日/无日期/时区 | 精确 PRD 排序，dueDate 不自动等于 visitDate；用 Europe/Paris 固定时钟测试 |
| TODO-03 | 同目标改标题、新目标新 ID、显式 archived、缺 ID | 同目标保留完成，新目标不继承，归档不等于完成，缺 ID 拒绝/显示发布问题 |
| BAK-01 | v1 未标版本/1/2/3 与 v2 新备份 roundtrip | 预览明确范围，旧导入保留新版 notes/tasks，raw/legacy/orphan 完整 |
| BAK-02 | 取消、非法、错误 tripId、超限、未来版本 | 零写入；不执行危险 URL/HTML/原型字段 |
| BAK-03 | 导入 checkpoint/事务中断/撤销/后续编辑 | 原状态不丢，撤销有 revision 门槛，不静默丢掉后续输入 |
| SYN-01 | manifest+快照正常/无变更 | 验证后一次提交；版本/最后成功时间来自 commit，不把检查时间冒充同步时间 |
| SYN-02 | 404/500/超时/断网/损坏/缺文件/错误 hash | active/previous/个人状态不变，旧版文字继续可用 |
| SYN-03 | ID/order/引用/日期/URL/GeoJSON/路线版本异常 | 整包拒绝，无部分渲染/误归档 |
| SYN-04 | 并发响应逆序、schema 不兼容、回退发布序号 | 旧响应不覆盖新 active；连续两个新 schema 更新后旧 app 仍保留兼容快照/只读 bootstrap；显式回退可追溯 |
| SYN-05 | IDB 事务失败/容量/中途重启 | 没有半快照或假成功；唯一可用版本不被先删 |
| MAP-01 | GHPR 同地两访、酒店行李闭环 | 两个 stopId/顺序/详情可达，不移动坐标假避重叠 |
| MAP-02 | 类型筛选、隐藏路线、点击/详情定位 | 仅显示改变，官方顺序不变；跨 view 同一 activity/stop |
| MAP-03 | GeoJSON [lng,lat]、端点/版本/模式/未核验路径 | 无效不画，缺段清楚提示；铁路/水路无驾车冒充、无直线冒充道路 |
| MAP-04 | Google 地址/坐标/Place ID/明确起终点/当前位置 | 参数精确编码，非导航目标不显示链接，来源语义真实 |
| MAP-05 | Leaflet CDN失败、瓦片单独失败、离线/快速切日 | 列表/链接保留，旧异步结果不覆盖新视图，不依赖 tile 成功才能读文字 |
| PWA-01 | 真实 main bundle+v4 worker→新 bundle+schema | 首次与等待更新、保存草稿、安装失败、不混 JS/data，旧 key 不变 |
| PWA-02 | 多个新旧客户端、SW 激活/缓存清理 | 旧客户端不崩溃/不写错结构；同 scope/id 不需重装 |
| PWA-03 | 独立官方同步、离线重启、shell/data schema 不兼容 | 数据请求不会被 shell 永久锁旧，最近成功兼容快照可用；连续两次新版同步后旧 tab 离线恢复不丢唯一兼容副本 |
| PWA-04 | 新 shell 完整安装、空新 IDB、立即断网冷启动 | 校验缓存 bootstrap 后初始化；缺失/损坏/不兼容 bootstrap 不成为 active，不改个人记录 |
| RBK-01 | 旧→新→旧→新四段 + 旧键后续写入 | 新旧资料都保留、恢复候选可见，不要求旧 app 识别新版数据 |
| RBK-02 | 官方快照/代码/导入分别回滚 | 只回滚指定层，个人资料不因数据回滚删除；重开/普通手动同步不自动装回隔离坏版本 |
| PUB-01 | 生成官方 JSON/发布产物 allowlist | 无私人确认号、二维码、管理链接、私人备份/凭证；文档/fixture 不误作私密文件 |

纯模型用 Node test；IDB/事务和 SW 用真实浏览器上下文，不仅 mock。定时/离线/错误请求通过隔离服务器可复现注入；长草稿、emoji、多行中文、无地点活动、未知字段、混合交通都需 fixture。

## 4. PRD AC 追踪

| PRD 验收 | 对应测试及人工检查 |
| --- | --- |
| AC-01…04 | v4.12 八日覆盖 fixture：周三无 Louvre、周五待核、周一/周四一次游船；人工对照 PDF 页 1–6 |
| AC-05 | ID-01、NOTE-01/02 |
| AC-06…09 | TODO-01…03、SYN-01…04，两台独立 context |
| AC-10…12 | MAP-01…05、坐标/路径人工来源审核 |
| AC-13…14 | SYN-02/05、PWA-01…04 |
| AC-15 | MIG-01…05、BAK-01…03、RBK-01/02 |
| AC-16 | 真 iPhone 安装身份、手动更新/独立同步/重启验收 |
| AC-17 | PUB-01 与人工公开内容审查 |

位置和路线许可不能只由单元测试证明；须保留来源、核实日期、交通方式与审核记录。数据测试包含酒店早存晚取、转店和机场缓冲；不核实的真实开放时间不得被写成测试既定事实。

## 5. Phase 2 视觉与真机门槛

视觉：390px 行程、活动详情、每日地图、To-do 四张截图；320/375/430px 无水平溢出，日期条可滚；时间列无竖线、列表只有时间/名称；黑细框/淡色/绿色操作符合 v1.1。字体未加载时中文系统 fallback 可读，触控≥44px、输入≥16px、safe-area。

最终在 HTTPS 隔离预览和真实 iPhone：Safari 与主屏幕、已装/未装 Google Maps、当前位置授权/拒绝、键盘遮挡/滚动、VoiceOver/焦点返回、飞行模式冷启动、后台恢复、低容量、两台设备独立状态、真实旧安装升级及回滚。不要清除正式站点数据；备份由用户自行保管。

Phase 2 截图不是 Phase 3 功能验收。完整 P0 与真机/迁移/路径门槛未过，不申请最终生产发布。Netlify Preview 可用性需核验；不新建替代生产站点。
