巴黎手帐 / Paris Pocket · 当前说明（2026-11-08）

继续使用原网址：https://stirring-cheesecake-37698e.netlify.app/
不要另建 Netlify 站点。本轮仅完成受控重构 Phase 1 审计和方案，未修改运行界面、迁移用户数据或部署生产。

最新功能要求见 PRODUCT_BRIEF.md、AGENTS.md 和 docs/PHASE_1_REVIEW.md。旧版“手机内编辑官方行程、酒店未定、Apple Maps、双人云同步”等描述不再作为未来开发要求。当前应用实际仍是 V1.1.1，含本机编辑和旧行程；新版只读/同步功能待后续批准实现。外部导航已经使用 Google Maps。

旅行事实以用户 v4.12 PDF 为准；五家酒店已确认，游船/卢浮宫时段等待核。旧 trip-data.js 只作为兼容性来源，不可用它覆盖新行程要求。

用 iPhone Safari 打开原 HTTPS 网址，通过分享→添加到主屏幕。更新前保存输入，出现“新版本已准备好”时点击；不必重装。不要清除站点数据。个人笔记和勾选保存在当前设备/浏览器/origin；用户可自行导出备份妥善保管，不要上传到公开仓库。

本地运行、测试、PWA 限制与迁移/回滚方案见 README.md 和 docs/。Phase 1 完成后停止，等待评审再开始 Phase 2；main 合并和生产发布另需批准。
