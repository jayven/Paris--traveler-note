# Paris Pocket — 从这里继续

先读 [AGENTS.md](AGENTS.md)、[PRODUCT_BRIEF.md](PRODUCT_BRIEF.md)、[Phase 1 评审包](docs/PHASE_1_REVIEW.md)。

当前开发分支 `feature/paris-pocket-v2-refactor` 基于 `main` 的 `05790404b87b616db7b1a786770232dc55fbfe7b`。Phase 1 已完成当前代码审计和方案，**等用户评审后再开始 Phase 2**。不要把本轮 Phase 1 理解为实施旧架构草案里的数据迁移阶段。

最新方向是只读官方行程、活动本机备注、官方+本地 To-do、可信每日地图和单向官方同步。旧编辑器退出未来范围，但所有旧编辑数据必须保留。最新行程来自 v4.12，不是尚未切换的 `trip-data.js`；五家酒店已确认。

后续顺序：Phase 2 视觉与必要支撑重构 → 行程/详情/地图/To-do 四张手机截图评审 → Phase 3 数据/迁移/同步/地图集成 → 回归和真机验收 → 用户另行批准合并及生产发布。

继续时使用 [架构](docs/ARCHITECTURE_REFACTOR_PLAN_v1.0.md)、[迁移回滚](docs/DATA_MIGRATION_AND_ROLLBACK_v1.0.md)、[测试计划](docs/TEST_PLAN_v1.0.md)。保持原仓库、原 Netlify 网站和旧存储键，不直接修改 main。
