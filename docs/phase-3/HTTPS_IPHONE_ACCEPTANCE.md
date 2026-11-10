# HTTPS 预览与 iPhone 验收

2026-11-09；本轮只读核查和准备，未更改 Netlify 项目设置，未启动任何部署。现有 PR 标题使用 `[skip netlify]`，以免更新评审代码时自动发布新的 Deploy Preview。

## 已确认的现有项目

通过 Netlify 官方公开只读 API 核对现有 project 及实际部署记录，并根据用户随后提供的 Build settings、Branches and deploy contexts 两张截图核实后台选项；没有读取令牌、环境变量或生产浏览器资料。

| 项目 | 核查结果 |
| --- | --- |
| 项目 | `stirring-cheesecake-37698e`，Project ID `7998275f-56b4-4599-80ef-d05a772a00e1` |
| 仓库 | `https://github.com/jayven/Paris--traveler-note` |
| 当前 production | ready，branch `main`，commit `05790404b87b616db7b1a786770232dc55fbfe7b` |
| 已有 PR #2 preview | ready，context `deploy-preview`，branch `feature/paris-pocket-v2-refactor`，commit `fe21176a0947078bf53372c35f80ab8984bbaf70` |
| HTTPS 预览 URL | [现有 PR #2 预览](https://deploy-preview-2--stirring-cheesecake-37698e.netlify.app/) |
| 未登录 HTTP 检查 | 返回 **401**，无法直接读取页面或验证其实际资源；不尝试绕过访问限制 |
| GitHub deployment/status | GitHub API 未列出 deployment/status；这**不能证明 Netlify 没有预览**，Netlify 部署记录已确认预览存在 |
| 所属团队 | `jayvenyin’s team`（只读 API）；此前截图选择的是另一个 `jayven’s team` |
| Base directory | `/`（用户 Build settings 截图） |
| Build command | **Not set**（用户截图）；本轮没有改为 build:site |
| Publish directory | **Not set**（用户截图）；不能把未设置记成已经发布 dist |
| Build status | **Active**（用户截图） |
| Production branch | **main**（用户 Branches and deploy contexts 截图） |
| Branch deploys | **Deploy only the production branch**（用户截图）；非生产分支未启用独立 branch deploy |
| Deploy Previews | **Any pull request against your production branch / branch deploy branches**（用户截图）；PR #2 的 base 为 main，符合此预览范围 |
| 本地设置 | 没有 `netlify.toml` 或链接用 `.netlify/state.json`；当前环境没有可用 Netlify CLI/auth。未安装或登录新工具 |

证据来自 GET `/api/v1/sites/<existing-domain>`、GET `/api/v1/sites/<verified-project-id>/deploys` 和用户提供的两张后台设置截图。公开 API 的空 `build_settings` 本身不构成设置值证据；现由截图补全。仅保存所需设置文字，没有提交原始截图、完整 API 响应或账户信息。项目管理入口：[现有 Netlify 项目](https://app.netlify.com/projects/stirring-cheesecake-37698e/overview)。

因此，优先**复用已有预览**做 iPhone 功能验收，无需新站点或生产改动。需由可访问该项目的账号在 iPhone Safari 验证 401 的实际登录/保护要求；401 本身不足以判断是密码、团队登录还是其他访问策略。当前 UI/runtime 与 fe21176 一致，本轮只改审计、发布构建和检查；预览不能冒充已包含本轮新构建修复。

## 获批后如何获得更新的隔离 HTTPS 预览

- **首选复用现有 PR Deploy Preview**：Production branch、Build command、Publish directory 和 Deploy Preview 范围已由截图核实。当前仍须确认预览访问保护/登录要求；保留 skip marker。以后仅在用户另行批准更新预览并确定发布产物方式后，才移除 skip marker 并推送不含 skip marker 的评审提交；现有 URL 保持，验收前核对部署 commit。不得通过合 main 获取预览。当前全局 build/publish 都是 Not set，不能声称自动预览已使用 dist 白名单。
- 若当前自动预览不能发布 `dist/`，可在用户明确批准后，使用同一已确认 Project ID 做一次手动 **draft** 上传。先在本机构建并验证 dist，再由已授权账号执行下列命令。它不是本轮已经执行的动作，不需要新建站点或修改后台 build/publish 设置：

```sh
npm run check:releases
npm test
npm run build:site
# 仅在用户批准“现有站点的非生产 draft deploy”后执行：
netlify deploy --site 7998275f-56b4-4599-80ef-d05a772a00e1 --dir dist --no-build --context deploy-preview
```

不使用 `--prod`、`--prod-if-unlocked`，不创建新站点、不改变访问保护，不在命令行传 token。CLI 会返回实际 HTTPS draft URL，不能预先捏造。这个选项需要届时核实既有授权账号，当前未安装或连接 CLI。

Netlify 官方说明：[Deploy Preview 独立于生产](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)、[draft CLI 与生产开关](https://github.com/netlify/cli/blob/main/docs/commands/deploy.md)、[跳过 PR 预览须在 PR 标题放 skip marker](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)。本轮不使用 `[skip ci]`，以便 [GitHub PR 验证](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs) 仍可运行。未改 Netlify 配置；解除部署 skip 必须等用户批准。

## 精简 iPhone 验收表

只用预览 origin 和合成笔记/任务/旧备份；Safari 与主屏幕 PWA 分别测。记录 iOS 版本、机型、URL、AppVersion/tripDataVersion、实际 commit、结果与错误。普通 LAN HTTP 不支持此应用依赖的安全校验/SW，不能替代 HTTPS。

| 检查 | 步骤与通过标准 |
| --- | --- |
| Safari 与布局 | 登录后打开预览，逐日切换；320/375/390/430px 对应窄屏无横向溢出。时间/名称对齐无竖线，详情从行程/地图打开。软键盘出现后备注、任务表单及保存/关闭可见；VoiceOver 能读名称、状态、标签并返回触发处 |
| 主屏幕 PWA | Safari 分享→添加主屏幕，冷启动、后台返回、旋转/键盘，底部 safe-area 和日期导航正常。保持现有生产图标；预览的安装身份与资料属于预览 origin，不代替生产安装升级验收 |
| 本机活动备注 | 输入多行中文/emoji/HTML 字符，等待明确保存成功，关详情、刷新、彻底关闭后重开。内容仍为文字；另一窗口先修改同一备注后，陈旧表单不得覆盖，失败草稿可导出，明确重试才可能覆盖 |
| To-do | 添加仅名称的本地任务，确认默认中优先级；补截止日/链接/备注/关联，编辑/完成/删除、切筛选后刷新。截止日不自动等于参观日；完成勾选不确认预订，另一台设备状态独立 |
| 离线 | 在线完整安装后开飞行模式，再冷启动主屏幕。每日文字、详情、备注/任务读写与重载可用；底图失败有列表降级，不承诺外部导航或完整底图离线。恢复网络同步失败时仍保留当前快照/个人资料 |
| 旧备份与恢复 | 在预览导入合成 v1（未标版本/1/2/3），先取消，再确认：原文进入恢复区，不替换新备注/完成状态。导出 v2、修改后导入、撤销；有导入后新修改时不能直接撤销。旧编辑器和原文下载均可达，旧键不被新版改写 |
| Google Maps handoff | 已安装与未安装 Google Maps 各测一次：查看/当前位置步行/驾车、明确上一站→当前站；实际到达 Google Maps App 或浏览器正确地点，拒绝定位时可输入起点。歌剧院入口地址、酒店参考点和未确认集合点语义可读；不导航到未知码头 |
| 存储失败恢复 | 不清理或填满生产存储。在隔离预览用合成损坏旧备份测零写入保护；受控测试环境注入读失败/IDB拒绝/quota，验证只读回退、原文/草稿导出、保留输入且不误报已保存。真机若遇系统容量/权限失败，立即复制或导出，恢复权限/容量后重试。系统强制结束前未保存的内存草稿不保证持久 |
| 更新与回退 | 需单独获批的两版预览用于测试等待更新、表单保护、完整 shell、官方同步及回退隔离；生产原图标/旧安装升级必须在合成隔离环境演练，不清正式网站数据。重复请求旧 hash URL 仍应成功 |

**当前状态**：自动化故障/离线/旧→新→旧→新测试已存在；此表的真实 iPhone 手工结果仍未执行。不能以 Chromium 手机模拟或公开 API 的 ready 状态替代上述检查。
