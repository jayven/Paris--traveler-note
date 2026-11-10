# Paris Pocket — 纸艺 P 安装图标

2026-11-09，用户提供 `巴黎口袋_立体纸艺字母p图标.png`，要求更新 App icon。直接使用原图（1254×1254 RGB PNG），只用系统 `sips -z` 导出安装尺寸；没有重绘、裁剪、去白边或改变配色。原图 SHA256：`ceda2b860e8503e57fc20c0bfcf39c0c750eaa736733fec00153ff63061b831c`。

![iPhone 180px 图标](../../../assets/apple-touch-icon-paper-p.png)

| 资源 | 用途 |
| --- | --- |
| [180×180 PNG](../../../assets/apple-touch-icon-paper-p.png) | 主页面和 legacy 的 Apple touch icon |
| [192×192 PNG](../../../assets/icon-paper-p-192.png) | 浏览器 favicon / PWA manifest |
| [512×512 PNG](../../../assets/icon-paper-p-512.png) | PWA manifest |

新资源使用独立文件名，避免继续引用旧图标 URL；原来的三个图标仍保留在白名单和离线 shell 中供旧版本引用。新图案标记为 `purpose:any`，不冒充 maskable-safe：W3C 只保证中心半径 40% 范围不被遮罩裁去，原图的纸折／外框超出此范围。[官方规范](https://www.w3.org/TR/appmanifest/#icon-masks)。

只更新 `index.html`／`legacy.html` 图标引用、manifest icons、SW cache `paris-pocket-v9-paper-icon` 及构建白名单。PWA 的 id、name、short_name、start_url、scope、display 和其他 manifest 字段逐项比较不变；应用内页眉字母标识、`#58443E` 视觉、地图／行程／存储逻辑均未改。

验证：三张 PNG 无透明通道，尺寸正确；浏览器实际解码、两页引用、manifest 身份、SW 缓存及离线加载通过。[检查结果](checks.json)。**61/61 Node、test:pwa、check:releases、build:site、git diff --check 均 PASS**。产物为 26 文件（增加三张有意保留的新图标），官方快照不变。原图标文件保持原字节。

本次仅提交现有功能分支 / 草稿 PR #2，**没有部署**。现有 HTTPS 测试预览仍为 `6ab2762`，不包含此新图标。后续须另获预览更新批准，再在 Safari 添加测试主屏幕图标验证；已安装图标的系统刷新时机未验证，不承诺立即替换。保留现有生产安装及资料，不改变安装身份来强制刷新。
