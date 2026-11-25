# 直播源订阅整理站

个人收集整理的 IPTV / 直播源 M3U 订阅导航页，纯静态，可直接部署到 GitHub Pages。

> **仅供测试。所有直播源均来自于网络，本人只进行收集和整理，不对内容的隐私和版权负责。**

## 文件结构

```
.
├── index.html          页面结构
├── data.js             订阅数据（频道数、分组、来源，脚本生成）
├── assets/
│   ├── style.css       样式
│   └── app.js          交互：筛选、搜索、复制、站内试播
├── .nojekyll           关闭 Jekyll 处理，保证静态资源直出
└── README.md
```

## 部署到 GitHub Pages

### 方式一：网页上传（最简单）

1. 在 GitHub 新建仓库，例如 `iptv-lists`，设为 **Public**。
2. 进入仓库 → **Add file → Upload files**，把本目录下的 `index.html`、`data.js`、`assets/`、`.nojekyll` 全部拖进去，提交。
3. 仓库 → **Settings → Pages** → **Source** 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`，保存。
4. 等 1–2 分钟，访问 `https://<你的用户名>.github.io/iptv-lists/`。

### 方式二：命令行

```bash
git init
git add .
git commit -m "init: iptv subscription site"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

推送后在 **Settings → Pages** 里按上面第 3 步开启即可。

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://127.0.0.1:8080
```

> 必须用 HTTP 服务打开，直接双击 `index.html` 会因浏览器限制导致 `data.js` 与订阅拉取失败。

## 数据来源

| 来源 | 说明 |
| :--- | :--- |
| [cumtwjq/iptv-subscriptions](https://cumtwjq.github.io/iptv-subscriptions/) | 河南主订阅 + APTV 各省移动单播列表 |
| [fanmingming/live](https://github.com/fanmingming/live) | 综合源、IPv6 源、ITV 源、演示源 |
| [Guovin/iptv-api](https://github.com/Guovin/iptv-api) | 自动采集测速生成结果（`gd` 分支） |
| [Elykia093/HA-CMCC-IPTV](https://github.com/Elykia093/HA-CMCC-IPTV) | 河南移动整理清单 |
| [YueChan/Live](https://github.com/YueChan/Live) | 综合源、GNTV 源 |
| [vbskycn/iptv](https://github.com/vbskycn/iptv) | IPv4 / IPv6 汇总 |
| [Kimentanm/aptv](https://github.com/Kimentanm/aptv) | 通用源、电台源、影视合集 |

## 更新数据

订阅的频道数会随源站变化。重新统计并生成 `data.js`：

```bash
python3 gen_data.py   # 需要先按 cache/list.txt 把订阅文件下载到 cache/
```

`gen_data.py` 会读取 `cache/` 下的 m3u 文件，统计频道数、分组和样例频道，重新写出 `data.js`。

## 说明

- 页面不存储、不转码、不转发任何视频流，站内试播直连源站。
- 部分源需要特定运营商宽带或 IPv6 才能播放，浏览器端受跨域与解码限制，试播失败属正常现象，请在本地播放器中使用。
- 组播地址（`rtp://`、`udp://`）浏览器无法播放，页面会明确提示。
