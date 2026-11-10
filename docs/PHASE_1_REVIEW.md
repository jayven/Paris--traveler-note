# Paris Pocket — Phase 1 Review

2026-11-08。**Phase 1 完成，等待用户评审；未开始 Phase 2。**

## 交付物

| 用户要求 | 交付位置 |
| --- | --- |
| 当前代码审计、可复用/过时功能、风险与 PRD 差距 | [AUDIT.md](../AUDIT.md) |
| 更新失效产品要求/后续开发入口 | [AGENTS](../AGENTS.md)、[PRODUCT_BRIEF](../PRODUCT_BRIEF.md)、[CODEX_START_HERE](../CODEX_START_HERE.md)、[README](../README.md)、[中文说明](../readme-开始使用.txt) |
| Architecture Refactor Plan v1.0 | [架构方案](ARCHITECTURE_REFACTOR_PLAN_v1.0.md) |
| 明确数据迁移与回滚 | [迁移/回滚规范](DATA_MIGRATION_AND_ROLLBACK_v1.0.md) |
| 测试现状、扩展矩阵与实施门槛 | [测试计划](TEST_PLAN_v1.0.md) |
| 四份来源、旅行覆盖/冲突与可信性边界 | [来源登记](SOURCE_REGISTER.md)、[行程核对](ITINERARY_v4.12_REVIEW.md)、references/ |

开发分支 `feature/paris-pocket-v2-refactor`，从最新 GitHub main `05790404b87b616db7b1a786770232dc55fbfe7b` 创建。只改文档，不改 runtime、trip-data、localStorage、SW、Netlify 或 main。原工作目录未提交视觉文件保持原状。

## 审计结论与建议

1. 当前 V1.1.1 已有编辑器、schema 3 备份兼容、Google Maps 和等待激活的离线 shell；v0.1 对「仍是 Apple/原始存储」的描述已过时。这些纯模块、安全保存和地图降级可复用，无框架重建必要。
2. 产品改为官方只读，不直接复用旧编辑覆盖。所有笔记、booked、自建活动、修改、移动/删除/排序、未知字段保留在可达的旧资料区；新命名空间与原始旧键分开。
3. 建议原生 JS + 单个版本化官方 JSON 快照 + IDB 原子事务。官方/个人数据分层，同步失败继续旧快照；旧活动和预订 ID 通过人工语义审核，禁止位置/同名自动匹配。
4. 当前地图只有去重图钉，缺 Stop/真实路段；当前 trip-data 与 SW 缓存耦合。需分别补官方数据同步边界、重复访问和经核验路线，不能把图钉版当完成 P0。
5. UI v1.1 保留手机导航，采用淡色、1px 黑线、方卡和绿色操作。每日时间/名称无竖线。Phase 2 只做视觉和必要支撑，截图评审后 Phase 3 集成。

## 验证结果与限制

重新执行 main 的 20/20 Node 测试以及 browser、management、PWA 三套脚本均通过；生产九项源文件与 main 相符。测试在本地隔离 profile，无真实个人资料、无生产写入。

现有 PWA 套件仅旧 worker fixture，不是真旧 app bundle 的数据升级测试；Chrome 手机参数不等于真 iPhone。未来迁移、IDB、官方同步、To-do、Stop/GeoJSON 和真实四段回滚尚未实施或验收。

## 待评审与后续门槛

本轮完成无阻塞。下一步需用户评审此包并批准 **Phase 2**，建议确认「保留原生 JS、完整旧资料归档、新 IDB/单快照」方向，再开展四屏视觉实现；该批准不等于生产部署授权。

行程定稿待核：DATA-01 游船产品/时间/码头；DATA-02 Louvre 时段；DATA-03 鹿特丹班次/票务；约拍与午餐状态保持待核。无需为此阻塞纯视觉，但后续正式数据不得伪造答案。

路线生成/存储许可、地点语义核实、Netlify Preview/发布目录设置、真实 iPhone 迁移与 Google Maps handoff 是后续集成/发布门槛。本轮不选付费供应商或改变部署配置。

Phase 2 批准后，先 token/壳/必要 view 分离，再四屏截图；UI 评审后，Phase 3 按校验/迁移 → v4.12/备注/To-do → 原子同步/PWA → Stop/真实路段 → 真机/回滚执行。最终合并 main 和生产发布另批。
