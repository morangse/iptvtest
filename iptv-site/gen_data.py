#!/usr/bin/env python3
"""统计各订阅的频道数/分组/样例频道，生成 data.js。

用法：
    python3 gen_data.py           # 下载订阅到 cache/ 并重新生成 data.js
    python3 gen_data.py --local   # 只用 cache/ 里已有文件（离线）
"""
import collections
import datetime
import json
import os
import re
import sys
import urllib.request

CACHE = "cache"
BASE = "https://cumtwjq.github.io/iptv-subscriptions/"

# key -> 订阅地址
URLS = {
    "ha-cmcc-iptv": BASE + "ha-cmcc-iptv.m3u",
    "aptv-hnyd": BASE + "aptv-hnyd.m3u",
    "aptv-ahyd": BASE + "aptv-ahyd.m3u",
    "aptv-bjyd": BASE + "aptv-bjyd.m3u",
    "aptv-fjyd": BASE + "aptv-fjyd.m3u",
    "aptv-gxyd": BASE + "aptv-gxyd.m3u",
    "aptv-gzyd": BASE + "aptv-gzyd.m3u",
    "aptv-hbyd": BASE + "aptv-hbyd.m3u",
    "aptv-hljyd": BASE + "aptv-hljyd.m3u",
    "aptv-hunyd": BASE + "aptv-hunyd.m3u",
    "aptv-jsyd": BASE + "aptv-jsyd.m3u",
    "aptv-jxyd": BASE + "aptv-jxyd.m3u",
    "aptv-lnyd": BASE + "aptv-lnyd.m3u",
    "aptv-sdyd": BASE + "aptv-sdyd.m3u",
    "aptv-shyd": BASE + "aptv-shyd.m3u",
    "aptv-sxyd": BASE + "aptv-sxyd.m3u",
    "aptv-zjyd": BASE + "aptv-zjyd.m3u",
    "aptv-iptv": BASE + "aptv-iptv.m3u",
    "fm-index": "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/index.m3u",
    "fm-ipv6": "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/ipv6.m3u",
    "fm-itv": "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/itv.m3u",
    "fm-demo": "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/demo.m3u",
    "guovin-result": "https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/result.m3u",
    "elykia-index": "https://raw.githubusercontent.com/Elykia093/HA-CMCC-IPTV/main/public/index.m3u",
    "yuechan-iptv": "https://raw.githubusercontent.com/YueChan/Live/main/IPTV.m3u",
    "yuechan-gntv": "https://raw.githubusercontent.com/YueChan/Live/main/GNTV.m3u",
    "vbskycn-4": "https://raw.githubusercontent.com/vbskycn/iptv/master/tv/iptv4.m3u",
    "vbskycn-6": "https://raw.githubusercontent.com/vbskycn/iptv/master/tv/iptv6.m3u",
    "aptv-iptv-m3u": "https://raw.githubusercontent.com/Kimentanm/aptv/master/m3u/iptv.m3u",
    "aptv-radio": "https://raw.githubusercontent.com/Kimentanm/aptv/master/m3u/radio.m3u",
    "aptv-bi": "https://raw.githubusercontent.com/Kimentanm/aptv/master/m3u/bi.m3u",
    "aptv-yqk": "https://raw.githubusercontent.com/Kimentanm/aptv/master/m3u/yqk.m3u",
}

# key, 显示名, 地区, 仓库, 描述, 仓库所有者
META = [
    ("ha-cmcc-iptv", "河南移动（主）", "河南", "cumtwjq/iptv-subscriptions", "主订阅，频道最全，含影视分组", "cumtwjq"),
    ("aptv-hnyd", "河南移动（备用）", "河南", "cumtwjq/iptv-subscriptions", "APTV 河南移动列表，备用线路", "cumtwjq"),
    ("aptv-ahyd", "安徽移动", "安徽", "cumtwjq/iptv-subscriptions", "安徽移动单播整理", "cumtwjq"),
    ("aptv-bjyd", "北京移动", "北京", "cumtwjq/iptv-subscriptions", "北京移动单播整理", "cumtwjq"),
    ("aptv-fjyd", "福建移动", "福建", "cumtwjq/iptv-subscriptions", "福建移动单播整理", "cumtwjq"),
    ("aptv-gxyd", "广西移动", "广西", "cumtwjq/iptv-subscriptions", "广西移动单播整理", "cumtwjq"),
    ("aptv-gzyd", "贵州移动", "贵州", "cumtwjq/iptv-subscriptions", "贵州移动单播整理", "cumtwjq"),
    ("aptv-hbyd", "河北移动", "河北", "cumtwjq/iptv-subscriptions", "河北移动单播整理", "cumtwjq"),
    ("aptv-hljyd", "黑龙江移动", "黑龙江", "cumtwjq/iptv-subscriptions", "黑龙江移动单播整理", "cumtwjq"),
    ("aptv-hunyd", "湖南移动（含影视）", "湖南", "cumtwjq/iptv-subscriptions", "湖南移动，含电影/电视剧/动漫分组", "cumtwjq"),
    ("aptv-jsyd", "江苏移动", "江苏", "cumtwjq/iptv-subscriptions", "江苏移动单播整理", "cumtwjq"),
    ("aptv-jxyd", "江西移动", "江西", "cumtwjq/iptv-subscriptions", "江西移动单播整理", "cumtwjq"),
    ("aptv-lnyd", "辽宁移动", "辽宁", "cumtwjq/iptv-subscriptions", "辽宁移动单播整理", "cumtwjq"),
    ("aptv-sdyd", "山东移动", "山东", "cumtwjq/iptv-subscriptions", "山东移动单播整理，频道量较大", "cumtwjq"),
    ("aptv-shyd", "上海移动", "上海", "cumtwjq/iptv-subscriptions", "上海移动单播整理", "cumtwjq"),
    ("aptv-sxyd", "山西移动", "山西", "cumtwjq/iptv-subscriptions", "山西移动单播整理", "cumtwjq"),
    ("aptv-zjyd", "浙江移动", "浙江", "cumtwjq/iptv-subscriptions", "浙江移动单播整理", "cumtwjq"),
    ("aptv-iptv", "通用合集", "通用", "cumtwjq/iptv-subscriptions", "通用列表，含电影、电视剧、动漫分组", "cumtwjq"),
    ("fm-index", "fanmingming 综合源", "通用", "fanmingming/live", "公开直播源汇总，IPv6 资源丰富", "fanmingming"),
    ("fm-ipv6", "fanmingming IPv6 源", "通用", "fanmingming/live", "IPv6 专用线路，需网络支持 IPv6", "fanmingming"),
    ("fm-itv", "fanmingming ITV 源", "通用", "fanmingming/live", "卫视频道整理列表", "fanmingming"),
    ("fm-demo", "fanmingming 演示源", "通用", "fanmingming/live", "示例频道列表", "fanmingming"),
    ("guovin-result", "iptv-api 自动生成结果", "通用", "Guovin/iptv-api", "自动采集测速生成，频道量大，时效性强", "Guovin"),
    ("elykia-index", "HA-CMCC-IPTV 主清单", "河南", "Elykia093/HA-CMCC-IPTV", "区域移动宽带网络测试整理清单", "Elykia093"),
    ("yuechan-iptv", "YueChan 综合源", "通用", "YueChan/Live", "IPv4/IPv6 开源节目源整理", "YueChan"),
    ("yuechan-gntv", "YueChan GNTV 源", "通用", "YueChan/Live", "国内频道整理列表", "YueChan"),
    ("vbskycn-4", "vbskycn IPv4 源", "通用", "vbskycn/iptv", "长期维护的组播/单播汇总，含 EPG", "vbskycn"),
    ("vbskycn-6", "vbskycn IPv6 源", "通用", "vbskycn/iptv", "IPv6 单播线路（当前仅 1 条）", "vbskycn"),
    ("aptv-iptv-m3u", "APTV 通用源", "通用", "Kimentanm/aptv", "跨平台直播源聚合", "Kimentanm"),
    ("aptv-radio", "APTV 电台源", "电台", "Kimentanm/aptv", "广播电台音频直播", "Kimentanm"),
    ("aptv-bi", "APTV 影视合集", "影视", "Kimentanm/aptv", "影视轮播类大量合集，频道量极大", "Kimentanm"),
    ("aptv-yqk", "APTV 影视源", "影视", "Kimentanm/aptv", "影视点播/轮播类整理", "Kimentanm"),
]


def fetch(key, url):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + ".m3u")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    print("下载 %-16s %8d 字节" % (key, len(data)))
    return path


def main():
    offline = "--local" in sys.argv
    out, total = [], 0
    for key, name, region, repo, desc, owner in META:
        url = URLS[key]
        path = os.path.join(CACHE, key + ".m3u")
        if not os.path.exists(path):
            if offline:
                print("跳过缺失文件：", path)
                continue
            fetch(key, url)
        txt = open(path, encoding="utf-8", errors="replace").read()
        chans = re.findall(r"#EXTINF:[^\n]*,(.*)", txt)
        groups = re.findall(r'group-title="([^"]*)"', txt)
        gc = collections.Counter(groups)
        samples = []
        for c in chans:
            c = c.strip()
            if c and c not in samples:
                samples.append(c)
            if len(samples) >= 10:
                break
        out.append({
            "key": key, "name": name, "region": region, "repo": repo,
            "owner": owner, "desc": desc, "url": url,
            "channels": len(chans), "groups": len(gc),
            "top_groups": [{"name": g, "count": c} for g, c in gc.most_common(8)],
            "samples": samples,
            "size": os.path.getsize(path),
        })
        total += len(chans)

    data = {
        "generated": datetime.date.today().isoformat(),
        "total_channels": total,
        "lists": out,
    }
    with open("data.js", "w", encoding="utf-8") as f:
        f.write("window.IPTV_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    print("生成 data.js：%d 个订阅，%d 个频道条目" % (len(out), total))


if __name__ == "__main__":
    main()
