# Phase 3 — 首轮评审后的安全收尾

2026-11-09；针对 `fe21176` / 草稿 PR #2 的反馈。继续现有 feature 分支。仅审计、构建保留、PR 验证和验收准备；**没有新增产品功能，没有改官方数据/路线/个人存储或 UI，没有合 main、没有部署、没有更改 Netlify 设置。**

## 地图缺口：按用途验收

已逐段核对 68 段，用户给定模式统计全部一致：24 walking 全部有几何，8 driving 有4条，32 unknown、2 rail、2 boat 都没有道路几何。现有28条保持字节不变；当前官方快照 SHA256 仍是 `af2dbb626d063926bf126dad2ae376d51738df7e34546b60b2748a2a7ef63708`。

| 40 个无几何段的类别 | 数量 | 结论 |
| --- | ---: | --- |
| 来源明确的道路需求，但当前字段待对齐 | 2 | 蒙马特 Abbesses→小丘广场→圣心堂，活动文字明确步行而 mode 为 unknown；只提出评审，不改方式或补线 |
| 同场地/不需要外部道路几何 | 7 | 奥赛2、凡尔赛同场地1、Erasmusbrug 到达候船1、Fenix 到达参观1、Markthal 到达参观1、CDG 到达航班1；保留 Stop，不画假内部线 |
| 铁路/水路 | 4 | 鹿特丹往返铁路与 Kinderdijk 往返船；不用 driving 填补，待核运营/票务 |
| 未决端点/交通/条件 | 27 | CDG航站楼、卢森堡上车点、Louvre 会合、约拍、鹿特丹码头/交通、市内及换店方式、可选活动衔接；不擅自选择 |

**需要用户评审的分组决策**：[精简决策表及完整40段清单](ROUTE_GAP_AUDIT.md)，机器校验 [JSON](route-gap-audit.json)。同 Place 不自动等于无移动：Kinderdijk 码头/游客地址和 Louvre 会合/导览仍阻塞。塞纳河游船缺少明确码头，尚未建立路段，不在68分母里，DATA-01 仍需核实。不以 68/68 道路几何为目标。

## 不可变发布保留修复

`scripts/build-site.cjs` 原本只复制 active hash，后续整站发布会使旧 hash URL 消失。本轮改为：

- 验证并复制 `trip/releases/` **全部**保留的合法 `<sha256>.json`，不自动裁剪旧版本。
- 验证文件名/字节哈希、schema/trip、发布序号唯一性、按序历史任务归档/活动退役契约、active manifest 与 bootstrap 内容一致性。未知文件、目录、symlink、损坏或不兼容快照使构建失败。
- 完整验证在清理 dist 前完成。构建输入失败时保留上一份输出；不将损坏数据“修复后算通过”。
- 新增 `check:releases` 只读检查；`--base-ref <commit>` 比较 Git 旧版本，拒绝删除、改字节或重命名已保留哈希文件。
- 回退官方内容应以**更高 releaseSequence 的新发布**承载，旧 hash 字节不变。App 的本地 previous 回退机制没有修改。

测试在独立临时目录完成三次连续构建、旧 URL 的真实本地 HTTP 下载以及序号4回退；所有旧文件均可下载并通过当前 envelope 校验。缺 active、旧文件篡改、bootstrap/manifest 不一致、非法目录/文件、序号碰撞、历史任务消失均会被拒绝。测试产物不提交为真实发布。

## 最小 PR 工作流

新增 [.github/workflows/validate.yml](../../.github/workflows/validate.yml)：pull_request 到 main，以及可选手动入口；read-only contents、固定官方 action SHA、Node22、锁定依赖。

执行：只读验证官方/历史快照 → 重建并比较生成文件是否漂移 → Node 回归 → 公开 build 输出。没有部署步骤、Netlify token、浏览器下载、外部服务或新框架；没有修改 branch protection。PR 标题中的 `[skip netlify]` 只用于阻止 Netlify 发布，未使用会跳过 GitHub 验证的 `[skip ci]`。

GitHub hosted [PR validation run 42729599021](https://github.com/jayven/Paris--traveler-note/actions/runs/42729599021) 已在 9010b2c 推送后核验 success，各检查步骤均实际完成；不能仅凭本地等价命令通过判定 hosted 成功。当前本地：**58/58 Node PASS**（含嵌套子案例），`check:releases --base-ref fe21176` PASS、`build:trip` 后 `trip/` 零差异、`build:site` PASS、`git diff --check` PASS。此轮未改 runtime，无须重复上轮全部手机浏览器回归；原八套通过证据保留在 [第一轮评审包](README.md)。

## 现有 HTTPS 预览与 iPhone

Netlify 只读 API 确认现有 production 仍是 main/0579040，PR #2 的 fe21176 预览已 ready：[现有 HTTPS 预览](https://deploy-preview-2--stirring-cheesecake-37698e.netlify.app/)。未登录访问 401，需用对应账号核实保护/登录条件；没有绕过。公开 API 未暴露后台设置，但用户随后两张截图已核实：Base `/`，Build command/Publish directory 均 **Not set**，Build status **Active**，Production branch **main**，Branch deploys **only production branch**，Deploy Previews **any PR against production/branch-deploy branches**。这证明 PR #2 具备预览范围，不代表已经使用 dist 白名单，也不解决 401 的访问条件。

没有为取得预览而新建 site、部署或修改设置。为避免本次推送自动产生新预览，已经按 [Netlify 官方 skip 规则](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/) 给现有 PR 标题加 `[skip netlify]`；解除或手动 draft 上传另需批准。

[只读核查详情、更新预览的待批方案和精简 iPhone 验收表](HTTPS_IPHONE_ACCEPTANCE.md) 覆盖 Safari、主屏幕、备注、To-do、离线、旧备份、Google Maps handoff、存储失败恢复及受控升级。真实 iPhone 结果未执行，不把 Chrome 模拟当作真机通过。

## 停止评审点

剩余用户决定：道路需求字段对齐、未决端点/交通和条件选择；核实预览登录权限；决定何时批准更新隔离预览的产物方式并执行真机表。Netlify 后台四项设置已由截图确认，不再是未核实项目。当前不申请 main 合并或生产发布。地图/真机门槛仍保留，但不再把“所有 Segment 必须有道路几何”当完成条件。
