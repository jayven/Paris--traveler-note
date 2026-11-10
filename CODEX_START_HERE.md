# Paris Pocket — 从这里继续

先读 [AGENTS](AGENTS.md)、[PRODUCT_BRIEF](PRODUCT_BRIEF.md)、[Phase 2 评审包](docs/phase-2/README.md)。

用户已批准 Phase 1 与 Phase 2 实施。本轮完成视觉、截图及回归后，**等待用户视觉批准，不开始 Phase 3**。分支继续为 feature/paris-pocket-v2-refactor，现有草稿 PR #2，不合并 main、不部署生产。

本阶段保留现有编辑/预约/笔记/备份和原 storage schema。主界面已换视觉、行程行点击真实详情后仍可编辑与排序；v4.12 和 To-do 未来设计在独立视觉预览中，不保存、不同步，不替代可用的主导航。

架构方向获认可，但 Phase 3 实施前仍需验证同步/回滚机制是否为这款两人小 App 的最简单可靠选择。不要现在迁移 localStorage、建立 IndexedDB 或接入官方同步；不要因最终 PRD 只读要求提前删除旧编辑器。

后续须先获视觉批准，再明确 Phase 3 范围。迁移方案、测试追踪及已知限制见 docs/；用户最终另批 main 合并与生产发布。
