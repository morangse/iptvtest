(function () {
  "use strict";

  var DATA = window.IPTV_DATA || { lists: [], generated: "" };
  var lists = DATA.lists.slice();

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var state = { region: "全部", kw: "" };

  /* ---------- 统计 ---------- */
  function renderStats() {
    var totalCh = 0, repos = {};
    lists.forEach(function (l) { totalCh += l.channels; repos[l.repo] = 1; });
    $("#stLists").textContent = lists.length;
    $("#stChannels").textContent = totalCh.toLocaleString();
    $("#stRepos").textContent = Object.keys(repos).length;
    $("#gen").textContent = DATA.generated || "—";
  }

  /* ---------- 地区筛选 ---------- */
  function regionOrder() {
    var fixed = ["全部", "河南", "通用", "影视", "电台"];
    var rest = [];
    lists.forEach(function (l) {
      if (fixed.indexOf(l.region) < 0 && rest.indexOf(l.region) < 0) rest.push(l.region);
    });
    return fixed.filter(function (r) {
      return r === "全部" || lists.some(function (l) { return l.region === r; });
    }).concat(rest);
  }

  function renderChips() {
    var box = $("#chips");
    box.innerHTML = "";
    regionOrder().forEach(function (r) {
      var b = document.createElement("div");
      b.className = "chip" + (r === state.region ? " on" : "");
      b.textContent = r;
      b.onclick = function () { state.region = r; renderChips(); renderGrid(); };
      box.appendChild(b);
    });
  }

  /* ---------- 列表卡片 ---------- */
  function match(l) {
    if (state.region !== "全部" && l.region !== state.region) return false;
    if (!state.kw) return true;
    var k = state.kw.toLowerCase();
    var hay = [l.name, l.region, l.repo, l.desc, l.owner]
      .concat(l.samples || [])
      .concat((l.top_groups || []).map(function (g) { return g.name; }))
      .join(" ").toLowerCase();
    return hay.indexOf(k) >= 0;
  }

  function renderGrid() {
    var grid = $("#grid");
    grid.innerHTML = "";
    var hit = lists.filter(match);
    $("#count").textContent = "共 " + hit.length + " 个订阅 · " +
      hit.reduce(function (a, l) { return a + l.channels; }, 0).toLocaleString() + " 个频道条目";

    if (!hit.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "没有匹配的订阅，换个关键字或地区试试。";
      grid.appendChild(e);
      return;
    }

    hit.forEach(function (l) {
      var card = document.createElement("article");
      card.className = "card";
      card.innerHTML =
        '<div class="card-top">' +
          '<h3></h3>' +
          '<span class="tag region"></span>' +
        '</div>' +
        '<p class="desc"></p>' +
        '<div class="repo">来源 <code></code></div>' +
        '<div class="card-meta">' +
          '<div><b class="ch">-</b> 频道</div>' +
          '<div><b class="gr">-</b> 分组</div>' +
          '<div><b class="sz">-</b> 大小</div>' +
        '</div>' +
        '<div class="card-foot">' +
          '<button class="btn primary" data-act="copy">复制地址</button>' +
          '<button class="btn" data-act="open">查看频道</button>' +
        '</div>';

      $("h3", card).textContent = l.name;
      $(".tag", card).textContent = l.region;
      $(".desc", card).textContent = l.desc;
      $(".repo code", card).textContent = l.repo;
      $(".ch", card).textContent = l.channels.toLocaleString();
      $(".gr", card).textContent = l.groups;
      $(".sz", card).textContent = fmtSize(l.size);

      $('[data-act="copy"]', card).onclick = function (ev) {
        ev.stopPropagation(); copy(l.url, "订阅地址已复制");
      };
      $('[data-act="open"]', card).onclick = function (ev) {
        ev.stopPropagation(); openDetail(l);
      };
      card.onclick = function () { openDetail(l); };
      grid.appendChild(card);
    });
  }

  function fmtSize(b) {
    if (!b) return "-";
    if (b > 1048576) return (b / 1048576).toFixed(1) + " MB";
    return Math.round(b / 1024) + " KB";
  }

  /* ---------- 复制 ---------- */
  function copy(text, msg) {
    var done = function () { toast(msg || "已复制"); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
    } else { fallback(text, done); }
  }
  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("复制失败，请手动选择"); }
    document.body.removeChild(ta);
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ---------- 详情与试播 ---------- */
  var cur = null, curList = null, hls = null, chans = [];

  function openDetail(l) {
    cur = l; curList = [];
    $("#modal").hidden = false;
    document.body.style.overflow = "hidden";
    $("#mTitle").textContent = l.name;
    $("#mMeta").textContent = l.region + " · " + l.channels.toLocaleString() +
      " 个频道 · " + l.groups + " 个分组 · 来源 " + l.repo;
    $("#mUrl").value = l.url;
    $("#mq").value = "";
    $("#mChans").innerHTML = '<div class="muted small pad">正在加载频道表…</div>';
    $("#mCount").textContent = "";
    $("#playerWrap").hidden = true;
    stopVideo();
    loadChans(l);
  }

  function closeDetail() {
    $("#modal").hidden = true;
    document.body.style.overflow = "";
    stopVideo();
    cur = null;
  }

  var playTimer = null;

  function stopVideo() {
    var v = $("#video");
    clearTimeout(playTimer);
    try { v.pause(); } catch (e) {}
    v.removeAttribute("src"); v.load();
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
  }

  function startTimeout(c, noteEl) {
    clearTimeout(playTimer);
    playTimer = setTimeout(function () {
      var v = $("#video");
      if (v.readyState === 0) {
        noteEl.className = "player-note err";
        noteEl.textContent = "连接超时：" + c.name +
          " 这条线路 8 秒内没有响应，通常是因为它只在特定运营商宽带内可用，或线路已失效。请换一个频道或换其他订阅。";
      }
    }, 8000);
  }

  function loadChans(l) {
    fetch(l.url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (txt) {
        chans = parseM3U(txt);
        renderChans();
      })
      .catch(function (e) {
        $("#mChans").innerHTML = '<div class="muted small pad">频道表加载失败（' +
          e.message + '），可能是源站跨域限制或链接已失效。可直接复制地址到播放器里使用。</div>';
      });
  }

  function parseM3U(txt) {
    var lines = txt.split(/\r?\n/), out = [], pend = null;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) continue;
      if (ln.indexOf("#EXTINF") === 0) {
        var name = ln.substring(ln.lastIndexOf(",") + 1).trim();
        var g = /group-title="([^"]*)"/.exec(ln);
        pend = { name: name || "未命名频道", group: g ? g[1] : "", url: "" };
      } else if (ln.charAt(0) === "#") {
        continue;
      } else if (pend) {
        pend.url = ln; out.push(pend); pend = null;
      }
    }
    return out;
  }

  function playable(u) {
    return /^https?:\/\//i.test(u);
  }

  function renderChans() {
    var q = ($("#mq").value || "").trim().toLowerCase();
    var box = $("#mChans");
    box.innerHTML = "";
    var hit = chans.filter(function (c) {
      if (!q) return true;
      return (c.name + " " + c.group).toLowerCase().indexOf(q) >= 0;
    });
    $("#mCount").textContent = hit.length + " / " + chans.length + " 个频道";
    if (!hit.length) {
      box.innerHTML = '<div class="muted small pad">没有匹配的频道。</div>';
      return;
    }
    var frag = document.createDocumentFragment();
    hit.slice(0, 600).forEach(function (c) {
      var d = document.createElement("div");
      d.className = "chan" + (curList && curList.url === c.url ? " on" : "");
      d.textContent = c.name;
      d.title = (c.group ? "[" + c.group + "] " : "") + c.name + "\n" + (c.url || "无地址");
      d.onclick = function () {
        $$(".chan", box).forEach(function (x) { x.classList.remove("on"); });
        d.classList.add("on");
        curList = c; tryPlay(c);
      };
      frag.appendChild(d);
    });
    box.appendChild(frag);
  }

  function tryPlay(c) {
    var wrap = $("#playerWrap"), note = $("#playerNote"), v = $("#video");
    wrap.hidden = false;
    note.className = "player-note";
    if (!playable(c.url)) {
      note.className = "player-note err";
      note.textContent = "该频道为组播/特殊协议地址（" + (c.url || "空") +
        "），浏览器无法直接播放，请在支持该协议的播放器中使用。";
      stopVideo();
      return;
    }
    var isHls = /\.m3u8(\?|$)/i.test(c.url);
    stopVideo();
    note.textContent = "正在连接：" + c.name;

    var ok = function () {
      clearTimeout(playTimer);
      note.textContent = "正在播放：" + c.name + "（若长时间黑屏说明该线路当前不可用，换一个频道试试）";
    };
    var bad = function (m) {
      clearTimeout(playTimer);
      note.className = "player-note err";
      note.textContent = "播放失败：" + m + "。该线路可能已失效、需要特定运营商网络或被跨域策略拦截。";
    };

    startTimeout(c, note);

    if (isHls) {
      if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = c.url;
        v.play().then(ok).catch(function (e) { bad(e.message || "浏览器拒绝播放"); });
      } else if (window.Hls && window.Hls.isSupported()) {
        hls = new window.Hls({ maxBufferLength: 20, manifestLoadingMaxRetry: 1, fragLoadingMaxRetry: 1 });
        hls.loadSource(c.url); hls.attachMedia(v);
        hls.on(window.Hls.Events.MANIFEST_PARSED, function () { v.play().then(ok).catch(function () { ok(); }); });
        hls.on(window.Hls.Events.ERROR, function (_e, d) {
          if (d && d.fatal) {
            if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR) bad("网络错误或跨域被拒");
            else if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
              try { hls.recoverMediaError(); } catch (x) { bad("媒体解码错误"); }
            } else bad("清单解析失败");
          }
        });
      } else {
        v.src = c.url;
        v.play().then(ok).catch(function () { bad("浏览器不支持 HLS 播放"); });
      }
    } else {
      v.src = c.url;
      v.play().then(ok).catch(function () { bad("该格式浏览器可能不支持，请用本地播放器"); });
    }
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    var q = $("#q");
    q.oninput = function () {
      state.kw = q.value.trim();
      $("#clearQ").classList.toggle("show", !!state.kw);
      renderGrid();
    };
    $("#clearQ").onclick = function () {
      q.value = ""; state.kw = ""; $("#clearQ").classList.remove("show"); renderGrid(); q.focus();
    };
    $("#mCopy").onclick = function () { if (cur) copy(cur.url, "订阅地址已复制"); };
    $("#mq").oninput = renderChans;
    $$("[data-close]").forEach(function (el) { el.onclick = closeDetail; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#modal").hidden) closeDetail();
    });
    $$("[data-copy]").forEach(function (b) {
      b.onclick = function () { copy(b.getAttribute("data-copy"), "节目单地址已复制"); };
    });
  }

  renderStats();
  renderChips();
  renderGrid();
  bind();
})();
