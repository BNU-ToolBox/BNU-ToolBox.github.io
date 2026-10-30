# BNU-ToolBox Website

BNU-ToolBox 的 GitHub Pages 静态介绍页。

下载按钮读取与页面同源的 `releases.json`，不依赖浏览器访问 GitHub API。
`.github/workflows/update-release.yml` 会定时在服务端查询 GitHub Releases，
选择版本号最高且包含 `BNU-ToolBox-Setup-*.exe` 的非草稿版本，并在版本变化时
自动提交新的清单。

页面内置 0.1.0 下载地址作为清单暂时不可用时的回退。手动刷新清单可运行：

```bash
python scripts/update_release.py
```
