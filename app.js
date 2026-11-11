(function () {
  'use strict';
  var T = window.ThaiCal, N = T.names;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- storage ---------- */
  var STORE = 'thaical.v1';
  var DEFAULTS = [
    { id: 'pray', icon: '🙏', name: 'Praying' },
    { id: 'fast', icon: '🍽️', name: 'Fasting' },
    { id: 'veg', icon: '🥦', name: 'Vegetarian' },
    { id: 'party', icon: '🎉', name: 'Partying' },
    { id: 'gym', icon: '🏋️', name: 'Gym' }
  ];
  var data = { acts: DEFAULTS.slice(), log: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE));
    if (saved && Array.isArray(saved.acts)) data = { acts: saved.acts, log: saved.log || {} };
  } catch (e) { /* first run or storage blocked */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ } }
  function actsOn(k) {
    var ids = data.log[k] || [];
    return data.acts.filter(function (a) { return ids.indexOf(a.id) >= 0; });
  }

  /* ---------- state ---------- */
  var now = new Date();
  var today = T.dn(now.getFullYear(), now.getMonth() + 1, now.getDate());
  var MIN = T.dn(T.MIN_YEAR, 1, 1), MAX = T.dn(T.MAX_YEAR, 12, 31);
  var state = { view: 'month', cur: today };
  try { var v = localStorage.getItem(STORE + '.view'); if (v) state.view = v; } catch (e) { /* ignore */ }

  /* ---------- moon drawing ---------- */
  // p: 0 new … 0.5 full … 1 new
  function moon(p, size) {
    var r = size / 2 - 1, c = size / 2, lit = '';
    if (p > 0.02 && p < 0.98) {
      var wax = p <= 0.5, q = wax ? p : 1 - p;
      var rx = Math.abs(Math.cos(2 * Math.PI * q)) * r;
      var d = 'M' + c + ' ' + (c - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + c + ' ' + (c + r) +
        (rx < 0.3 ? '' : 'A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (q < 0.25 ? 0 : 1) + ' ' + c + ' ' + (c - r)) + 'Z';
      lit = '<path d="' + d + '" fill="#f2c14e"' + (wax ? '' : ' transform="translate(' + size + ' 0) scale(-1 1)"') + '/>';
    }
    return '<svg class="moon" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="var(--moon-dark)"/>' + lit +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--gold)" stroke-width="1"/></svg>';
  }
  var PHASE_P = { 'new': 0, first: 0.25, full: 0.5, third: 0.75 };
  function moonOfLunar(l, size) { return moon(l.last ? 0 : l.day === 15 ? 0.5 : l.day / 30, size); }

  /* ---------- helpers ---------- */
  function inf(n) { var o = T.fromDn(n); return T.info(o.y, o.m, o.d); }
  function topHoliday(i) {
    var order = { 'public': 0, buddhist: 1, observance: 2 };
    return i.holidays.slice().sort(function (a, b) { return order[a.type] - order[b.type]; })[0];
  }
  function isPub(i) { return i.holidays.some(function (h) { return h.type === 'public'; }); }
  function lunShort(l) {
    if (l.day === 1) return 'เดือน ' + (l.month === 88 ? '๘๘' : N.thDigits(l.month));
    return (l.waxing ? '↑' : '↓') + N.thDigits(l.kham);
  }

  /* ---------- views ---------- */
  function renderMonth() {
    var o = T.fromDn(state.cur), first = T.dn(o.y, o.m, 1), start = first - T.fromDn(first).wd;
    var nextFirst = o.m === 12 ? T.dn(o.y + 1, 1, 1) : T.dn(o.y, o.m + 1, 1);
    var weeks = Math.ceil((nextFirst - start) / 7), h = '<div class="dow">';
    for (var w = 0; w < 7; w++) h += '<span><b>' + N.daysEn[w].slice(0, 3) + '</b>' + N.daysThShort[w] + '<br><i style="background:' + N.dayColors[w][1] + '"></i></span>';
    h += '</div><div class="grid">';
    for (var n = start; n < start + weeks * 7; n++) {
      var i = inf(n), d = T.fromDn(n), top = topHoliday(i), acts = actsOn(i.key);
      var cls = 'cell' + (d.m !== o.m ? ' other' : '') + (n === today ? ' today' : '') + (n === state.cur ? ' sel' : '') + (isPub(i) ? ' pub' : '');
      h += '<button class="' + cls + '" data-n="' + n + '" aria-label="' + d.d + ' ' + N.monthsEn[d.m - 1] + '">' +
        '<span class="row"><span class="g">' + d.d + '</span>' + (i.phase ? moon(PHASE_P[i.phase], 14) : '') + '</span>' +
        '<span class="lun">' + lunShort(i.lunar) + '</span>' +
        (top ? '<span class="hol ' + top.type + '">' + esc(top.en.split(' – ')[0]) + '</span>' : '') +
        (acts.length ? '<span class="acts">' + acts.map(function (a) { return esc(a.icon); }).join('') + '</span>' : '') +
        '</button>';
    }
    h += '</div><div class="legend">' +
      '<span>' + moon(0.5, 14) + ' full</span><span>' + moon(0, 14) + ' new</span><span>' + moon(0.25, 14) + moon(0.75, 14) + ' half moon – all four are Wan Phra</span>' +
      '<span><i class="sw" style="background:var(--red)"></i> public holiday</span><span>↑ waxing ↓ waning day</span></div>';
    return h + dayCard(state.cur, false);
  }

  function renderWeek() {
    var start = state.cur - T.fromDn(state.cur).wd, h = '';
    for (var n = start; n < start + 7; n++) {
      var i = inf(n), d = T.fromDn(n), acts = actsOn(i.key);
      h += '<button class="wrow' + (isPub(i) ? ' pub' : '') + (n === today ? ' today' : '') + '" data-n="' + n + '" data-open="day">' +
        '<span class="wdate" style="border-color:' + N.dayColors[d.wd][1] + '"><small>' + N.daysEn[d.wd].slice(0, 3) + '</small><b>' + d.d + '</b><small>' + N.daysThShort[d.wd] + '</small></span>' +
        '<span class="wbody"><span class="l">' + moonOfLunar(i.lunar, 16) + esc(T.lunarEn(i.lunar)) +
        (i.phase ? ' · <b style="color:var(--gold)">Wan Phra</b>' : '') + '</span>' +
        i.holidays.map(function (x) { return '<div class="h" style="color:var(--' + (x.type === 'public' ? 'red' : x.type === 'buddhist' ? 'gold' : 'obs') + ')">' + esc(x.en) + '</div>'; }).join('') +
        (acts.length ? '<div class="a">' + acts.map(function (a) { return esc(a.icon); }).join(' ') + '</div>' : '') +
        '</span></button>';
    }
    return h;
  }

  function dayCard(n, full) {
    var i = inf(n), d = T.fromDn(n), l = i.lunar, col = N.dayColors[d.wd], ids = data.log[i.key] || [];
    var h = '<section class="card"><div class="day-head"><div class="day-num' + (isPub(i) ? ' pub' : '') + '">' + d.d + '</div><div class="day-meta">' +
      '<div class="w">' + N.daysEn[d.wd] + ' · ' + N.daysTh[d.wd] + '</div>' +
      '<div class="t">' + d.d + ' ' + N.monthsEn[d.m - 1] + ' ' + d.y + '</div>' +
      '<div class="t">' + N.thDigits(d.d) + ' ' + N.monthsTh[d.m - 1] + ' พ.ศ. ' + N.thDigits(i.be) + '</div></div></div>' +
      '<div class="chips"><span class="chip">BE ' + i.be + '</span>' +
      '<span class="chip">' + N.zodiacIcon[i.zodiac] + ' Year of the ' + N.zodiacEn[i.zodiac] + ' · ปี' + N.zodiacTh[i.zodiac] + '</span>' +
      '<span class="chip"><i style="background:' + col[1] + '"></i>Day colour: ' + col[0] + '</span>' +
      (n === today ? '<span class="chip gold">Today</span>' : '') + '</div>' +
      '<div class="lunar">' + moonOfLunar(l, full ? 56 : 40) + '<div><div class="en">' + esc(T.lunarEn(l)) + '</div><div class="th">' + T.lunarTh(l) + '</div>' +
      (i.phase ? '<div class="chips" style="margin-top:6px"><span class="chip gold">☸ Wan Phra · วันพระ – ' + N.phaseEn[i.phase] + '</span></div>' : '') + '</div></div>';
    if (i.holidays.length) {
      h += '<ul class="hlist">' + i.holidays.map(function (x) {
        return '<li class="' + x.type + '"><span class="tag">' + (x.type === 'public' ? 'Public holiday' : x.type === 'buddhist' ? 'Buddhist day' : 'Observance') + '</span>' +
          '<b>' + esc(x.en) + '</b><span class="th">' + esc(x.th) + '</span>' + (x.note ? '<p>' + esc(x.note) + '</p>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    h += '<div class="sec"><h3>My day</h3><button class="link" data-act="symbols">Edit symbols</button></div><div class="toggles">' +
      data.acts.map(function (a) {
        return '<button class="tog" data-toggle="' + esc(a.id) + '" data-n="' + n + '" aria-pressed="' + (ids.indexOf(a.id) >= 0) + '"><span>' + esc(a.icon) + '</span><small>' + esc(a.name) + '</small></button>';
      }).join('') + '</div>' +
      (data.acts.length ? '' : '<p class="note">No symbols yet – tap “Edit symbols” to add some.</p>');
    if (!T.official(d.y)) h += '<p class="note">Lunar dates for ' + d.y + ' are calculated from the calendar rules. Thailand confirms the official dates year by year, so a festival can occasionally differ by a day.</p>';
    return h + '</section>';
  }

  function render() {
    var o = T.fromDn(state.cur), t, s;
    if (state.view === 'month') {
      t = N.monthsEn[o.m - 1] + ' ' + o.y; s = N.monthsTh[o.m - 1] + ' พ.ศ. ' + N.thDigits(o.y + 543);
      $('main').innerHTML = renderMonth();
    } else if (state.view === 'week') {
      var a = T.fromDn(state.cur - o.wd), b = T.fromDn(state.cur - o.wd + 6);
      t = a.d + (a.m !== b.m ? ' ' + N.monthsEn[a.m - 1].slice(0, 3) : '') + ' – ' + b.d + ' ' + N.monthsEn[b.m - 1].slice(0, 3) + ' ' + b.y;
      s = N.monthsTh[b.m - 1] + ' พ.ศ. ' + N.thDigits(b.y + 543);
      $('main').innerHTML = renderWeek();
    } else {
      t = N.daysEn[o.wd].slice(0, 3) + ' ' + o.d + ' ' + N.monthsEn[o.m - 1] + ' ' + o.y; s = T.lunarTh(T.lunar(state.cur));
      $('main').innerHTML = dayCard(state.cur, true);
    }
    $('title').textContent = t; $('subtitle').textContent = s;
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.setAttribute('aria-selected', b.dataset.view === state.view); });
  }

  function go(n) { state.cur = Math.max(MIN, Math.min(MAX, n)); render(); }
  function step(dir) {
    if (state.view === 'day') return go(state.cur + dir);
    if (state.view === 'week') return go(state.cur + 7 * dir);
    var o = T.fromDn(state.cur), m = o.m + dir, y = o.y;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    var last = T.fromDn(T.dn(y, m + 1, 0)).d;
    go(T.dn(y, m, Math.min(o.d, last)));
  }
  function setView(v) { state.view = v; try { localStorage.setItem(STORE + '.view', v); } catch (e) { /* ignore */ } render(); window.scrollTo(0, 0); }

  /* ---------- events ---------- */
  $('prev').onclick = function () { step(-1); };
  $('next').onclick = function () { step(1); };
  $('today').onclick = function () { go(today); };
  document.querySelector('.seg').onclick = function (e) { var b = e.target.closest('button'); if (b) setView(b.dataset.view); };

  $('main').addEventListener('click', function (e) {
    var el = e.target.closest('[data-toggle],[data-act],[data-n]');
    if (!el) return;
    if (el.dataset.toggle) {
      var k = T.keyOf(+el.dataset.n), ids = data.log[k] || [], at = ids.indexOf(el.dataset.toggle);
      if (at >= 0) ids.splice(at, 1); else ids.push(el.dataset.toggle);
      if (ids.length) data.log[k] = ids; else delete data.log[k];
      save(); render();
    } else if (el.dataset.act === 'symbols') {
      renderSymbols(); $('symbols').showModal();
    } else if (el.dataset.open === 'day') {
      state.cur = +el.dataset.n; setView('day');
    } else {
      if (+el.dataset.n === state.cur) return setView('day');   // second tap opens the day
      go(+el.dataset.n);
    }
  });

  // swipe left / right
  var sx = 0, sy = 0;
  $('main').addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  $('main').addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if ($('symbols').open) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- symbols dialog ---------- */
  function renderSymbols() {
    $('sym-list').innerHTML = data.acts.map(function (a) {
      return '<li><span>' + esc(a.icon) + '</span><b>' + esc(a.name) + '</b><button type="button" class="del" data-del="' + esc(a.id) + '">Delete</button></li>';
    }).join('') || '<li><b style="color:var(--muted)">No symbols yet</b></li>';
  }
  $('sym-list').onclick = function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var id = b.dataset.del, a = data.acts.filter(function (x) { return x.id === id; })[0];
    var used = Object.keys(data.log).filter(function (k) { return data.log[k].indexOf(id) >= 0; });
    if (used.length && !confirm('Delete “' + a.name + '”? It is used on ' + used.length + ' day' + (used.length > 1 ? 's' : '') + ' and will be removed from them.')) return;
    data.acts = data.acts.filter(function (x) { return x.id !== id; });
    used.forEach(function (k) { data.log[k] = data.log[k].filter(function (x) { return x !== id; }); if (!data.log[k].length) delete data.log[k]; });
    save(); renderSymbols(); render();
  };
  $('add-sym').onclick = function () {
    var icon = $('new-icon').value.trim(), name = $('new-name').value.trim();
    if (!icon) return $('new-icon').focus();
    if (!name) return $('new-name').focus();
    data.acts.push({ id: 'c' + Date.now().toString(36), icon: icon, name: name });
    $('new-icon').value = ''; $('new-name').value = '';
    save(); renderSymbols(); render();
  };
  $('new-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('add-sym').click(); } });
  $('new-icon').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('new-name').focus(); } });
  $('export').onclick = function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = 'thai-calendar-backup.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };
  $('import').onchange = function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!Array.isArray(d.acts) || typeof d.log !== 'object') throw 0;
        if (!confirm('Replace everything on this device with the backup?')) return;
        data = { acts: d.acts, log: d.log || {} }; save(); renderSymbols(); render();
      } catch (e) { alert('That file is not a Thai Calendar backup.'); }
    };
    r.readAsText(f); this.value = '';
  };

  render();
  // keep "today" right when the app is reopened on another day
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var d = new Date(), t = T.dn(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (t !== today) { if (state.cur === today) state.cur = t; today = t; render(); }
  });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js');
})();
