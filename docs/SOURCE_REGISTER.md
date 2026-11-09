# Phase 1 — Sources, Authority & Snapshot Register

记录日期：2026-11-08（用户时区）。执行指令来自用户当前「根据受控重构说明和四份文件，先完成 Phase 1」的请求；附件是被审核的来源。附件中其他阶段、部署、示例功能不构成额外授权。

## 权威顺序

| 内容 | 依据 | 本轮使用方式 |
| --- | --- | --- |
| 工作范围/审批 | 用户 Controlled Refactor & Visual Redesign 说明 | Phase 1 审计/方案/文档后停止；新分支，不改 main、不生产发布 |
| 产品行为 | PRD v1.0 | 原文存 [references/Paris_Pocket_PRD_v1.0.md](references/Paris_Pocket_PRD_v1.0.md)，不因旧路线图恢复取消功能 |
| 行程/酒店/物流 | Itinerary v4.12 PDF（内部日期 2026-11-04） | 8 页文本及图像核对，见 [来源核对](ITINERARY_v4.12_REVIEW.md)，冲突不静默解决 |
| 视觉 | UI Reference Package v1.1 | 读取全部 4 个文件（README/Style Spec/JSX 视觉组件/HTML 预览），保存 [Style Spec](references/UI_STYLE_SPEC_v1.1.md)；不移植 PM 业务或 React |
| 架构参考 | Refactor Plan v0.1 | 与实际 main 对照后修订 [v1.0](ARCHITECTURE_REFACTOR_PLAN_v1.0.md)；原文对旧 ZIP 的局限不再当现状 |
| 已发布实现/兼容性 | GitHub main 05790404b87b616db7b1a786770232dc55fbfe7b | fetch 后独立 checkout；源码/测试审计和只读线上九文件对比 |

旧 AGENTS/PRODUCT_BRIEF/CODEX_START_HERE/README 的编辑器、酒店未定、双人云同步及旧行程要求已被当前文档取代。历史审计保留在 history/ 并标注历史；运行代码仍是旧版，Phase 1 不换数据。

## 提供文件指纹（SHA-256）

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| Paris_Pocket_PRD_v1.0.md | 24405 | 97f18a21b9542b3f26da9a4fcc48837257be9a9d46601df919fd3f0ab7c8a086 |
| Paris_Itinerary_v4_12_Cruise_Mon_Thu_Optional (1).pdf | 650134 | 05278934d0cec18abd1116e108ea8fef7e69ba4145072e91ca7eb83fcc87c8f3 |
| Paris_Pocket_Architecture_Refactor_Plan_v0.1.md | 17506 | 6a0c299d5a15e218b5e84678d5f840a269e5692d8da6d37b9413aa1b97bdb55e |
| Paris_Pocket_UI_Reference_Package_v1.1.zip | 23163 | ad840318b53ac90e011ac686ba53cead6069b04432cbad96ed31c641aec918ab |
| 用户粘贴的受控重构说明（已粘贴的文本.txt） | 6190 | 9607713ad76605aebd06a7347b4466b84c4d77d73ce89d8acc752524b23b8b8a |
| ZIP 内 UI_STYLE_SPEC.md | 8750 | dc5f0cf5af19310ce059d506688b2758ed4068dda10aa064974fadd1a537cd56 |

PRD/Style Spec 副本逐字保存，包括原文 Markdown 两空格硬换行（git 默认会将其列为行尾空白）；自撰文档的 whitespace 检查单独执行。阶段授权仍按上表和 AGENTS，不按副本里的未来工作描述自动执行。PDF、ZIP、PM-tool 源码和私人备份未整包加入公开仓库。来源指纹不是签名认证。

## 独立外部技术依据（本轮只读查阅）

- [Google Maps URLs 官方说明](https://developers.google.com/maps/documentation/urls/get-started)：无需 API key、跨平台 URL、origin/destination 和 iOS/browser handoff；设备实测未完成。
- [IndexedDB 事务规范](https://w3c.github.io/IndexedDB/#transaction-concept)：新存储事务设计依据；不承诺规避设备存储逐出或断电风险。
- [Service Worker 规范](https://w3c.github.io/ServiceWorker/#update-algorithm)：应用 shell 更新生命周期；实际新旧客户端兼容需测试。
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)：标准瓦片服务署名、URL、缓存和禁止批量预取；不是路由轨迹长期保存许可。

这些查阅不代表已验证酒店入口、游船码头、票务/开放日/班次或选定路由供应商。后续内容/路线发布须单独记录官方来源与核实日期。
