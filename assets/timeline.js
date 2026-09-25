/* A Prelude to the End of the World — interactive timeline
   Data comes from timeline/index-data.js, which tools/build_timeline.py writes. */
(function () {
  'use strict';
  var T = window.TIMELINE, LM = window.TIMELINE_LANDMARKS || [], TX = window.TIMELINE_TEXT || [], ROWS = window.TIMELINE_ROWS || [];
  var KJV = window.KJV || {}, ALIAS = window.BOOK_ALIASES || {}, TOUR = window.TIMELINE_TOUR || [];
  var $ = function (id) { return document.getElementById(id); };
  var q = $('q'), list = $('results'), count = $('count'), prev = $('prev'), next = $('next');

  var viewer = OpenSeadragon({
    element: $('viewer'),
    tileSources: { Image: { xmlns: 'http://schemas.microsoft.com/deepzoom/2008', Url: 'timeline/tiles/', Format: T.format + (T.v ? '?v=' + T.v : ''), Overlap: '0',
      TileSize: String(T.tile), Size: { Width: String(T.width), Height: String(T.height) } } },
    showNavigationControl: false,
    showNavigator: true, navigatorId: 'nav', navigatorAutoFade: false, navigatorDisplayRegionColor: '#ff2fb0',
    visibilityRatio: 1, constrainDuringPan: true, minZoomImageRatio: 1, maxZoomPixelRatio: 2.5,
    animationTime: 0.9, springStiffness: 9, zoomPerScroll: 1.35, zoomPerClick: 1,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
    gestureSettingsTouch: { clickToZoom: false, dblClickToZoom: true, pinchRotate: false },
    imageSmoothingEnabled: true, crossOriginPolicy: false
  });
  window.__viewer = viewer;

  /* If the chart cannot be shown, say so plainly instead of leaving an empty frame, and say which of the two causes it is:
     the browser cannot display AVIF pictures (the format the chart is stored in), or the chart's files did not arrive from the server. */
  function chartProblem(kind) {
    if (document.getElementById('chart-msg')) return;
    var m = document.createElement('div'); m.id = 'chart-msg'; m.className = 'chart-msg'; m.setAttribute('role', 'alert');
    m.innerHTML = kind === 'format'
      ? '<h2>This browser can&rsquo;t show the chart</h2><p>The chart is stored as AVIF pictures, a newer format this browser does not display. Open this page in an up-to-date Chrome, Edge, Firefox or Safari and it will appear.</p><p class="small">Everything else on the site works in this browser.</p>'
      : '<h2>The chart&rsquo;s pictures didn&rsquo;t load</h2><p>The page is here, but the pictures that make up the chart could not be fetched from the server. Try reloading the page. If the chart still does not appear, the folder <code>timeline/tiles</code> may be missing from the upload.</p>';
    $('viewer').appendChild(m);
  }
  (function () {
    if (window.CHART_IMAGE) return;   /* the one-file preview shows a single WebP picture, not AVIF tiles: nothing to check there */
    var probe = new Image();
    probe.onload = function () { if (!probe.naturalWidth) chartProblem('format'); };
    probe.onerror = function () { chartProblem('format'); };
    probe.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAFwAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAH21kYXQSAAoFGAAGBCAyDBgACiiihAAAsBKamA==';
    var failed = 0;
    viewer.addHandler('tile-load-failed', function () { if (++failed === 6) chartProblem('files'); });
  })();

  function aspect() { var s = viewer.viewport.getContainerSize(); return s.x / Math.max(1, s.y); }
  function toVp(x, y, w, h) { return viewer.viewport.imageToViewportRectangle(x, y, w, h); }

  /* move the view so the rectangle (in chart pixels) is centred and readable */
  function goTo(r, opts) {
    opts = opts || {};
    var a = aspect(), x = r[0], y = r[1], w = r[2], h = r[3];
    var cw = viewer.viewport.getContainerSize().x;
    var minW = opts.exact ? 0 : cw / (cw < 700 ? 0.5 : 0.72);              // keep the lettering a comfortable size and leave its neighbours in view
    var vw = Math.max(w * 1.35, h * 1.35 * a, minW), vh = vw / a;
    if (vh > T.height) { vh = T.height; vw = vh * a; }
    var cx = x + w / 2, cy = y + h / 2;
    var bx = Math.min(Math.max(0, cx - vw / 2), Math.max(0, T.width - vw));
    var fy = (typeof tstep !== 'undefined' && tstep > -1) ? (cw < 700 ? 0.3 : 0.36) : 0.5;   // during the tour, keep the spot clear of the tour card
    var by = Math.min(Math.max(0, cy - vh * fy), Math.max(0, T.height - vh));
    viewer.viewport.fitBounds(toVp(bx, by, vw, vh), !!opts.now);
    if (!opts.quiet) mark(r);
  }
  var markEl = null;
  function mark(r) {
    if (markEl) viewer.removeOverlay(markEl);
    markEl = document.createElement('div'); markEl.className = 'hit';
    var pad = 14;
    viewer.addOverlay({ element: markEl, location: toVp(r[0] - pad, r[1] - pad, r[2] + pad * 2, r[3] + pad * 2) });
  }
  function clearMark() { if (markEl) { viewer.removeOverlay(markEl); markEl = null; } }

  function home(now) {
    var a = aspect();
    if (a < 1) goTo([0, 0, 1250, 600], { quiet: true, now: now });           // phone upright: start at the title
    else { var w = Math.min(T.width, T.height * a); viewer.viewport.fitBounds(toVp(0, 0, w, T.height), !!now); }
  }
  function whole() { viewer.viewport.fitBounds(toVp(0, 0, T.width, T.height)); clearMark(); }

  /* ---------- search ---------- */
  function norm(s) { return s.toLowerCase().replace(/[\u2018\u2019']/g, '').replace(/[^a-z0-9:]+/g, ' ').trim(); }
  var lmN = LM.map(function (l) { return norm(l.n); });
  var txN = TX.map(function (l) { return norm(l.t); });
  var bands = [625, 865, 1120, 1667, 2207, 2680];              // rough borders between the seven rows
  function rowOf(y) { var i = 0; while (i < bands.length && y > bands[i]) i++; return ROWS[i]; }

  /* words people type that the chart words differently */
  var ALSO = { 'second coming': ['jesus returns'], 'return of christ': ['jesus returns'], 'second advent': ['jesus returns'],
    'tribulation': ['great tribulation', '70th week of daniel', 'jacobs trouble'], 'seven years': ['7 year'], 'seventieth week': ['70th week'],
    'antichrist': ['man of sin', 'the beast', 'little horn'], 'false prophet': ['second beast'], '666': ['six hundred threescore'],
    'thousand years': ['millennium', '1000 years'], 'kingdom': ['millennium'], 'bema': ['judgment seat'], 'judgement seat': ['judgment seat'],
    'temple': ['3rd temple', 'second temple', 'first temple'], 'third temple': ['3rd temple'], 'hell': ['lake of fire'], 'new earth': ['new heavens'],
    'heaven': ['new jerusalem'], 'devil': ['satan'], 'lucifer': ['satan'], 'russia': ['magog'], 'iran': ['persia'], 'turkey': ['togarmah'],
    'ezekiel 38': ['gog of magog'], 'world war': ['red horse'], 'famine': ['black horse'], 'four horsemen': ['white horse', 'red horse', 'black horse', 'pale horse'],
    'horsemen': ['white horse', 'red horse', 'black horse', 'pale horse'], 'seals': ['seal'], 'trumpets': ['7 trumpets', 'trumpet'], 'bowls': ['bowls of wrath'],
    'vials': ['bowls of wrath'], 'wedding': ['marriage supper'], 'marriage of the lamb': ['marriage supper'], 'salvation': ['abcs of salvation', 'saved'],
    'gospel': ['abcs of salvation'], 'how to be saved': ['abcs of salvation'], 'israel 1948': ['israel reborn'], '1948': ['israel reborn'],
    'restrainer': ['restrainer'], 'holy spirit': ['restrainer'], 'caught up': ['rapture'], 'apostasy': ['falling away', 'depart from the faith', 'apostasy'],
    'noah': ['days of noah'], 'lot': ['days of lot'], 'sodom': ['days of lot'], 'new age': ['new age'], 'one world religion': ['world religion', 'babylon the great'],
    'babylon': ['babylon the great'], 'witnesses': ['two witnesses'], 'statue': ['head of gold', 'nebuchadnezzars statue'], 'empires': ['empire'] };

  /* "Matthew 24", "matt 24:15", "Mt 24" all become { book:'Matthew', ch:24, v:15 } */
  function parseRef(text) {
    var m = /^\s*((?:[1-3]\s*)?[a-z]+)\.?\s*(\d{1,3})?(?:\s*[:.]\s*(\d{1,3}))?\s*$/i.exec(text); if (!m) return null;
    var key = m[1].toLowerCase().replace(/^([1-3])\s*/, '$1 ').trim(), book = ALIAS[key]; if (!book) return null;
    if (!m[2] && key.length < 3) return null;
    return { book: book, ch: m[2] ? +m[2] : 0, v: m[3] ? +m[3] : 0 };
  }
  function refMatches(r, want) {
    var i = r.lastIndexOf(' '), book = r.slice(0, i), rest = r.slice(i + 1); if (book !== want.book) return false;
    if (!want.ch) return true;
    var n = rest.split(/[:\-]/).map(Number), ch = n[0]; if (ch !== want.ch && !(n.length === 4 && want.ch >= n[0] && want.ch <= n[2])) return false;
    if (!want.v || n.length < 2) return true;
    if (n.length === 2) return n[1] === want.v;
    if (n.length === 3) return want.v >= n[1] && want.v <= n[2];
    return true;
  }
  function label(r) { return r.replace(/-/g, '\u2013'); }

  var hits = [], cur = -1, sel = -1;
  function find(text) {
    var base = findOne(text), seen = {}, out = [];
    var extra = ALSO[norm(text)] || [];
    extra.forEach(function (t) { base = base.concat(findOne(t)); });
    var want = parseRef(text);
    if (want) {
      var refHits = [];
      TX.forEach(function (l) { (l.r || []).forEach(function (r) { if (refMatches(r, want)) refHits.push({ ref: true, t: label(r) + '  \u2014  ' + l.t, r: [l.x, l.y, l.w, l.h], refs: l.r }); }); });
      refHits.sort(function (a, b) { return a.r[0] - b.r[0]; });
      base = refHits.concat(base);
    }
    base.forEach(function (h) { var k = h.r.join(','); if (!seen[k]) { seen[k] = 1; out.push(h); } });
    return out.slice(0, 80);
  }
  function findOne(text) {
    var n = norm(text), out = [];
    if (n.length < 2) return out;
    var toks = n.split(' ');
    LM.forEach(function (l, i) {
      if (toks.every(function (t) { return lmN[i].indexOf(t) > -1; })) out.push({ lm: true, t: l.n, r: l.r });
    });
    var text_hits = [];
    TX.forEach(function (l, i) {
      var s = txN[i];
      if (s.indexOf(n) > -1 || (toks.length > 1 && toks.every(function (t) { return s.indexOf(t) > -1; })))
        text_hits.push({ t: l.t, r: [l.x, l.y, l.w, l.h], refs: l.r });
    });
    text_hits.sort(function (a, b) { return a.r[0] - b.r[0] || a.r[1] - b.r[1]; });
    var kept = [];                                                // the index has some near-duplicates; keep one of each
    text_hits.forEach(function (h) {
      var cx = h.r[0] + h.r[2] / 2, cy = h.r[1] + h.r[3] / 2;
      var dup = kept.some(function (k) { return Math.abs(k.cy - cy) < 30 && cx > k.x0 - 40 && cx < k.x1 + 40; });
      if (!dup) { kept.push({ cy: cy, x0: h.r[0], x1: h.r[0] + h.r[2] }); out.push(h); }
    });
    return out;
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hilite(s, text) {
    var i = s.toLowerCase().indexOf(text.toLowerCase());
    return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<b>' + esc(s.slice(i, i + text.length)) + '</b>' + esc(s.slice(i + text.length));
  }
  function render() {
    var text = q.value.trim();
    hits = find(text); cur = -1; sel = -1;
    list.innerHTML = '';
    if (norm(text).length < 2) { list.hidden = true; q.setAttribute('aria-expanded', 'false'); count.textContent = ''; setNav(); return; }
    if (!hits.length) {
      list.innerHTML = '<li class="none">Nothing on the chart matches \u201C' + esc(text) + '\u201D. Try one word, or a reference written the chart\u2019s way, like Rev 13 or Mat 24.</li>';
    } else hits.forEach(function (h, i) {
      var li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = 'r' + i; if (h.lm) li.className = 'lm';
      var row = rowOf(h.r[1] + h.r[3] / 2);
      li.innerHTML = '<span class="t">' + hilite(h.t, text) + '</span><span class="k">' + (h.lm ? 'event' : h.ref ? 'reference' : '<i class="sw" style="background:' + row[1] + '"></i>near ' + esc(row[0]) + ' line') + '</span>';
      li.addEventListener('mousedown', function (e) { e.preventDefault(); });
      li.addEventListener('click', function () { show(i); list.hidden = true; q.setAttribute('aria-expanded', 'false'); });
      list.appendChild(li);
    });
    list.hidden = false; q.setAttribute('aria-expanded', 'true');
    count.textContent = hits.length ? hits.length + (hits.length === 80 ? '+' : '') + ' found' : '';
    setNav();
  }
  function setNav() { var on = hits.length > 0; prev.disabled = next.disabled = !on; }
  function show(i) {
    if (!hits.length) return;
    cur = (i + hits.length) % hits.length;
    goTo(hits[cur].r);
    if (hits[cur].refs && window.innerWidth >= 900) openVerses(hits[cur].refs); else closeVerses();
    count.textContent = (cur + 1) + ' of ' + hits.length;
    setHash('q=' + encodeURIComponent(q.value.trim()) + (cur ? '&n=' + (cur + 1) : ''));
  }
  function select(i) {
    var items = list.querySelectorAll('li[role=option]'); if (!items.length) return;
    if (sel > -1 && items[sel]) items[sel].removeAttribute('aria-selected');
    sel = (i + items.length) % items.length;
    items[sel].setAttribute('aria-selected', 'true'); items[sel].scrollIntoView({ block: 'nearest' });
    q.setAttribute('aria-activedescendant', items[sel].id);
  }
  var timer;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 90); });
  q.addEventListener('focus', function () { if (hits.length && list.innerHTML) { list.hidden = false; } });
  q.addEventListener('blur', function () { setTimeout(function () { list.hidden = true; q.setAttribute('aria-expanded', 'false'); }, 120); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); list.hidden = false; select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault(); clearTimeout(timer); if (!list.innerHTML || q.value.trim() !== (q._last || '')) { render(); q._last = q.value.trim(); }
      if (sel > -1 && !list.hidden) show(sel); else show(e.shiftKey ? cur - 1 : cur + 1);
      list.hidden = true; sel = -1;
    } else if (e.key === 'Escape') { if (!list.hidden) list.hidden = true; else { q.value = ''; render(); clearMark(); q.blur(); } }
  });
  prev.addEventListener('click', function () { show(cur - 1); });
  next.addEventListener('click', function () { show(cur + 1); });

  /* ---------- jump menu ---------- */
  var jump = $('jump');
  [['start', 'Start here'], ['era', 'Along the timeline'], ['seal', 'The seals'], ['topic', 'People, places, events'], ['end', 'The end of the chart']].forEach(function (g) {
    var items = LM.filter(function (l) { return l.g === g[0]; }); if (!items.length) return;
    if (g[0] !== 'topic') items.sort(function (a, b) { return a.r[0] - b.r[0]; });
    else items.sort(function (a, b) { return a.n.localeCompare(b.n); });
    var og = document.createElement('optgroup'); og.label = g[1];
    items.forEach(function (l) { var o = document.createElement('option'); o.value = l.n; o.textContent = l.n; og.appendChild(o); });
    jump.appendChild(og);
  });
  function goName(name) {
    var n = norm(name), l = LM.filter(function (x) { return norm(x.n) === n; })[0] || LM.filter(function (x) { return norm(x.n).indexOf(n) > -1; })[0];
    if (l) { goTo(l.r); return true; } return false;
  }
  jump.addEventListener('change', function () { if (jump.value) { goName(jump.value); setHash('go=' + encodeURIComponent(jump.value)); jump.selectedIndex = 0; } });

  /* ---------- follow one of the seven timelines ---------- */
  var rowsEl = $('rows'), keys = ['heaven', 'israel', 'believer', 'empire', 'earth', 'man', 'satan'];
  var lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = 'Follow a timeline'; rowsEl.appendChild(lab);
  ROWS.forEach(function (r, i) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<i style="background:' + r[1] + '"></i>' + esc(r[0]);
    b.addEventListener('click', function () { followRow(i); setHash('row=' + keys[i]); });
    rowsEl.appendChild(b);
  });
  function followRow(i, now) {
    var r = ROWS[i]; if (!r) return;
    var b = viewer.viewport.viewportToImageRectangle(viewer.viewport.getBounds());
    var a = aspect(), vh = Math.min(b.height, 1150), vw = vh * a;
    var cx = b.x + b.width / 2;
    var bx = Math.min(Math.max(0, cx - vw / 2), Math.max(0, T.width - vw));
    var by = Math.min(Math.max(0, r[2] - vh / 2), T.height - vh);
    viewer.viewport.fitBounds(toVp(bx, by, vw, vh), !!now); clearMark();
    Array.prototype.forEach.call(rowsEl.querySelectorAll('button'), function (x, k) { x.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
  }

  /* ---------- zoom, share, present ---------- */
  $('zin').addEventListener('click', function () { viewer.viewport.zoomBy(1.6); viewer.viewport.applyConstraints(); });
  $('zout').addEventListener('click', function () { viewer.viewport.zoomBy(1 / 1.6); viewer.viewport.applyConstraints(); });
  $('fit').addEventListener('click', whole);
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, msg.length > 30 ? 4200 : 1800); }
  function setHash(h) { try { history.replaceState(null, '', '#' + h); } catch (e) { } }
  $('share').addEventListener('click', function () {
    var b = viewer.viewport.viewportToImageRectangle(viewer.viewport.getBounds());
    setHash('at=' + [b.x, b.y, b.width, b.height].map(Math.round).join(','));
    var url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast('The link is in the address bar'); });
    else toast('The link is in the address bar');
  });
  var exit = $('exit');
  function present(on) {
    document.body.classList.toggle('presenting', on); exit.hidden = !on;
    var el = document.documentElement;
    if (on && el.requestFullscreen) el.requestFullscreen().catch(function () { });
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  }
  $('present').addEventListener('click', function () { present(true); });
  exit.addEventListener('click', function () { present(false); });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement) present(false); });

  document.addEventListener('keydown', function (e) {
    if (e.target === q || e.target === jump || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); if (document.body.classList.contains('presenting')) present(false); q.focus(); q.select(); }
    else if (e.key === '0') whole();
    else if (e.key === 'Escape') { if (!vp.hidden) closeVerses(); else if (tstep > -1) tourEnd(); else if (document.body.classList.contains('presenting')) present(false); }
  });

  /* ---------- tap a reference, read the verse ---------- */
  var vp = $('verse'), vbody = $('versebody');
  function openVerses(refs) {
    var htmlOut = '';
    refs.forEach(function (r) {
      var k = KJV[r]; if (!k) return;
      htmlOut += '<h3>' + esc(label(r)) + '</h3>';
      k.v.forEach(function (v) { htmlOut += '<p><sup>' + v[0] + '</sup> ' + v[1] + '</p>'; });   // verse text is escaped when the data file is built
      if (k.more) htmlOut += '<p class="more">The passage continues. Open your Bible for the rest.</p>';
    });
    if (!htmlOut) { closeVerses(); return; }
    vbody.innerHTML = htmlOut; vbody.scrollTop = 0; vp.hidden = false; document.body.classList.add('has-verse');
  }
  function closeVerses() { vp.hidden = true; document.body.classList.remove('has-verse'); }
  $('verseclose').addEventListener('click', closeVerses);
  function blockAt(pt) {
    var best = null;
    TX.forEach(function (l) {
      if (!l.r) return;
      if (pt.x >= l.x - 12 && pt.x <= l.x + l.w + 12 && pt.y >= l.y - 12 && pt.y <= l.y + l.h + 12)
        if (!best || l.w * l.h < best.w * best.h) best = l;
    });
    return best;
  }
  viewer.addHandler('canvas-click', function (e) {
    if (!e.quick) return;
    var l = blockAt(viewer.viewport.viewerElementToImageCoordinates(e.position));
    if (l) { mark([l.x, l.y, l.w, l.h]); openVerses(l.r); } else closeVerses();
  });
  $('viewer').addEventListener('mousemove', function (e) {
    var b = this.getBoundingClientRect();
    var l = blockAt(viewer.viewport.viewerElementToImageCoordinates(new OpenSeadragon.Point(e.clientX - b.left, e.clientY - b.top)));
    this.style.cursor = l ? 'pointer' : '';
  });

  /* ---------- the guided tour ---------- */
  var tourEl = $('tour'), tstep = -1;
  function tourGo(i) {
    if (!TOUR.length) return;
    tstep = Math.max(0, Math.min(TOUR.length - 1, i));
    var s = TOUR[tstep];
    $('tourtitle').textContent = s.t; $('tourtext').textContent = s.x;
    $('tourcount').textContent = (tstep + 1) + ' of ' + TOUR.length;
    $('tourback').disabled = tstep === 0; $('tournext').textContent = tstep === TOUR.length - 1 ? 'Finish' : 'Next';
    tourEl.hidden = false; document.body.classList.add('touring'); closeVerses();
    goName(s.go); setHash('tour=' + (tstep + 1));
  }
  function tourEnd() { tourEl.hidden = true; tstep = -1; document.body.classList.remove('touring'); clearMark(); }
  $('tourbtn').addEventListener('click', function () { tourGo(0); });
  $('tournext').addEventListener('click', function () { if (tstep >= TOUR.length - 1) tourEnd(); else tourGo(tstep + 1); });
  $('tourback').addEventListener('click', function () { tourGo(tstep - 1); });
  $('tourclose').addEventListener('click', tourEnd);
  document.addEventListener('keydown', function (e) {                 // a presenter's clicker sends Page Down / Page Up
    if (tstep < 0 || e.target === q) return;
    var fwd = e.key === 'PageDown' || e.key === 'ArrowRight', back = e.key === 'PageUp' || e.key === 'ArrowLeft';
    if (!fwd && !back) return;
    e.preventDefault(); e.stopPropagation();
    if (fwd) { if (tstep >= TOUR.length - 1) tourEnd(); else tourGo(tstep + 1); } else tourGo(tstep - 1);
  }, true);

  /* ---------- open where the link says ---------- */
  function fromHash(now) {
    var h = location.hash.replace(/^#/, ''); if (!h) return false;
    var p = {}; h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    if (p.at) { var a = p.at.split(',').map(Number); if (a.length === 4 && a.every(isFinite)) { goTo(a, { quiet: true, exact: true, now: now }); return true; } }
    if (p.see) { var c = p.see.split(',').map(Number); if (c.length === 4 && c.every(isFinite)) { goTo(c, { now: now }); var bl = blockAt({ x: c[0] + c[2] / 2, y: c[1] + c[3] / 2 }); if (bl && window.innerWidth >= 900) openVerses(bl.r); return true; } }
    if (p.tour) { tourGo((parseInt(p.tour, 10) || 1) - 1); return true; }
    if (p.go && goName(p.go)) return true;
    if (p.row && keys.indexOf(p.row) > -1) { home(true); followRow(keys.indexOf(p.row), now); return true; }
    if (p.q) { q.value = p.q; render(); list.hidden = true; if (hits.length) { show((parseInt(p.n, 10) || 1) - 1); return true; } }
    return false;
  }
  viewer.addHandler('open', function () {
    if (!fromHash(true)) { home(true); setTimeout(function () { toast(aspect() < 1 ? 'Turn your phone sideways for a wider view. Tap any reference to read the verse.' : 'Drag to move, scroll to zoom. Click any reference to read the verse.'); }, 600); }
  });
  window.addEventListener('hashchange', function () { fromHash(false); });
})();
