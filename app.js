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
    { id: 'gym', icon: '🏋️', name: 'Gym' },
    { id: 'cake', icon: '🎂', name: 'Birthday' },
    { id: 'wine', icon: '🍷', name: 'Wine' }
  ];
  var VERSION = 2, ADDED_V2 = ['cake', 'wine'];
  var DEFAULTS_TH = { pray: 'สวดมนต์', fast: 'ถือศีลอด', veg: 'กินมังสวิรัติ', party: 'ปาร์ตี้', gym: 'ออกกำลังกาย', cake: 'วันเกิด', wine: 'ดื่มไวน์' };
  var data = { v: VERSION, acts: DEFAULTS.slice(), log: {}, notes: {} };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE));
    if (saved && Array.isArray(saved.acts)) {
      data = { v: saved.v || 1, acts: saved.acts, log: saved.log || {}, notes: saved.notes || {} };
      if (data.v < 2) {   // symbols added later: give them to existing users once
        DEFAULTS.forEach(function (d) {
          if (ADDED_V2.indexOf(d.id) >= 0 && !data.acts.some(function (a) { return a.id === d.id || a.icon === d.icon; })) data.acts.push(d);
        });
        data.v = VERSION;
        try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e2) { /* ignore */ }
      }
    }
  } catch (e) { /* first run or storage blocked */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ } }
  function actsOn(k) {
    var ids = data.log[k] || [];
    return data.acts.filter(function (a) { return ids.indexOf(a.id) >= 0; });
  }
  function pref(k, v) {
    try { if (v === undefined) return localStorage.getItem(STORE + '.' + k); localStorage.setItem(STORE + '.' + k, v); } catch (e) { /* ignore */ }
    return null;
  }

  /* ---------- language ---------- */
  var lang = pref('lang') || ((navigator.language || '').toLowerCase().indexOf('th') === 0 ? 'th' : 'en');
  var TH = lang === 'th';
  var STR = {
    en: {
      day: 'Day', week: 'Week', month: 'Month', today: 'Today', switchTo: 'ไทย',
      full: 'full', 'new': 'new', half: 'half moon – all four are Wan Phra', pub: 'public holiday', waxwan: '↑ waxing ↓ waning day',
      glance: function (m) { return m + ' at a glance'; }, phraList: '☸ Wan Phra (Buddhist holy days):', noHol: 'No holidays this month.',
      vegStart: 'Vegetarian Festival begins (9 days)', vegCont: 'Vegetarian Festival continues',
      wanPhra: 'Wan Phra', wanPhraChip: '☸ Wan Phra · วันพระ – ', wanKon: 'Wan Kon · วันโกน – eve of Wan Phra',
      tagPublic: 'Public holiday', tagBuddhist: 'Buddhist day', tagObs: 'Observance',
      myDay: 'My day', edit: 'Edit symbols', noSym: 'No symbols yet – tap “Edit symbols” to add some.',
      calc: function (y) { return 'Lunar dates for ' + y + ' are calculated from the calendar rules. Thailand confirms the official dates year by year, so a festival can occasionally differ by a day.'; },
      openFull: 'Open full day', symTitle: 'Your symbols', del: 'Delete', none: 'No symbols yet', add: 'Add',
      namePh: 'Name, e.g. Meditation',
      hint: "Tip: use your phone's emoji keyboard for the symbol. Deleting a symbol also removes it from the days where you used it.",
      exp: 'Export backup', imp: 'Import backup',
      confirmDel: function (n, c) { return 'Delete “' + n + '”? It is used on ' + c + ' day' + (c > 1 ? 's' : '') + ' and will be removed from them.'; },
      confirmImp: 'Replace everything on this device with the backup?', badFile: 'That file is not a Thai Calendar backup.',
      prev: 'Previous', next: 'Next', close: 'Close', jump: 'Choose month and year', note: 'Note', notePh: 'Write something about this day…', statsOpen: 'Monthly statistics', days: 'Days marked', inYear: 'Whole year', noStats: 'Nothing marked yet.', prevYear: 'Previous year', nextYear: 'Next year', appTitle: 'Thai Calendar'
    },
    th: {
      day: 'วัน', week: 'สัปดาห์', month: 'เดือน', today: 'วันนี้', switchTo: 'EN',
      full: 'เต็มดวง', 'new': 'เดือนดับ', half: 'ครึ่งดวง – ทั้งสี่แบบคือวันพระ', pub: 'วันหยุดราชการ', waxwan: '↑ ข้างขึ้น ↓ ข้างแรม',
      glance: function (m) { return 'วันสำคัญในเดือน' + m; }, phraList: '☸ วันพระ:', noHol: 'เดือนนี้ไม่มีวันหยุดหรือวันสำคัญ',
      vegStart: 'เริ่มเทศกาลกินเจ (9 วัน)', vegCont: 'เทศกาลกินเจ (ต่อเนื่อง)',
      wanPhra: 'วันพระ', wanPhraChip: '☸ วันพระ – ', wanKon: 'วันโกน – ก่อนวันพระหนึ่งวัน',
      tagPublic: 'วันหยุดราชการ', tagBuddhist: 'วันสำคัญทางพระพุทธศาสนา', tagObs: 'วันสำคัญ',
      myDay: 'กิจกรรมของฉัน', edit: 'แก้ไขสัญลักษณ์', noSym: 'ยังไม่มีสัญลักษณ์ แตะ “แก้ไขสัญลักษณ์” เพื่อเพิ่ม',
      calc: function (y) { return 'วันทางจันทรคติของปี พ.ศ. ' + (y + 543) + ' คำนวณจากหลักเกณฑ์ของปฏิทิน ทางราชการประกาศวันอย่างเป็นทางการเป็นรายปี วันสำคัญบางวันจึงอาจคลาดเคลื่อนได้หนึ่งวัน'; },
      openFull: 'ดูแบบเต็ม', symTitle: 'สัญลักษณ์ของคุณ', del: 'ลบ', none: 'ยังไม่มีสัญลักษณ์', add: 'เพิ่ม',
      namePh: 'ชื่อ เช่น นั่งสมาธิ',
      hint: 'เคล็ดลับ: ใช้แป้นพิมพ์อีโมจิบนโทรศัพท์เพื่อเลือกสัญลักษณ์ เมื่อลบสัญลักษณ์ใด สัญลักษณ์นั้นจะถูกลบออกจากทุกวันที่เคยบันทึกไว้ด้วย',
      exp: 'สำรองข้อมูล', imp: 'กู้คืนข้อมูล',
      confirmDel: function (n, c) { return 'ต้องการลบ “' + n + '” หรือไม่ สัญลักษณ์นี้ถูกใช้อยู่ ' + c + ' วัน และจะถูกลบออกจากวันเหล่านั้นด้วย'; },
      confirmImp: 'ต้องการแทนที่ข้อมูลทั้งหมดในเครื่องนี้ด้วยข้อมูลสำรองหรือไม่', badFile: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของปฏิทินไทย',
      prev: 'ก่อนหน้า', next: 'ถัดไป', close: 'ปิด', jump: 'เลือกเดือนและปี', note: 'บันทึก', notePh: 'เขียนบันทึกสำหรับวันนี้…', statsOpen: 'สถิติประจำเดือน', days: 'จำนวนวัน', inYear: 'ทั้งปี', noStats: 'ยังไม่มีการบันทึก', prevYear: 'ปีก่อนหน้า', nextYear: 'ปีถัดไป', appTitle: 'ปฏิทินไทย'
    }
  };
  var S = STR[lang];
  var MONTHS_TH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var DAYS_TH_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var COLORS_TH = ['สีแดง', 'สีเหลือง', 'สีชมพู', 'สีเขียว', 'สีส้ม', 'สีฟ้า', 'สีม่วง'];
  var ANIMALS_TH = ['หนู', 'วัว', 'เสือ', 'กระต่าย', 'งูใหญ่', 'งูเล็ก', 'ม้า', 'แพะ', 'ลิง', 'ไก่', 'สุนัข', 'หมู'];
  var PHASE_TH = { full: 'พระจันทร์เต็มดวง', 'new': 'คืนเดือนดับ', first: 'พระจันทร์ครึ่งดวง ข้างขึ้น', third: 'พระจันทร์ครึ่งดวง ข้างแรม' };

  function actName(a) {
    var d = DEFAULTS.filter(function (x) { return x.id === a.id; })[0];
    return TH && d && d.name === a.name ? DEFAULTS_TH[a.id] : a.name;
  }
  function hName(x) { return TH ? x.th : x.en; }
  function hShort(x) { return TH ? x.th.split(' (')[0].split(' / ')[0] : x.en.split(' – ')[0]; }
  function lunarPlainTh(l) { return (l.waxing ? 'ขึ้น ' : 'แรม ') + l.kham + ' ค่ำ เดือน ' + (l.month === 88 ? '8 หลัง' : l.month); }
  function lunarMain(l) { return TH ? lunarPlainTh(l) : T.lunarEn(l); }
  function lunarSub(l) { return TH ? T.lunarEn(l) : T.lunarTh(l); }
  function dowShort(wd) { return TH ? DAYS_TH_SHORT[wd] : N.daysEn[wd].slice(0, 3); }

  /* ---------- state ---------- */
  var now = new Date();
  var today = T.dn(now.getFullYear(), now.getMonth() + 1, now.getDate());
  var MIN = T.dn(T.MIN_YEAR, 1, 1), MAX = T.dn(T.MAX_YEAR, 12, 31);
  var state = { view: pref('view') || 'month', cur: today, sheet: null };

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
    var num = TH ? String : N.thDigits;
    if (l.day === 1) return 'เดือน ' + (l.month === 88 ? num(8) + num(8) : num(l.month));
    return (l.waxing ? '↑' : '↓') + num(l.kham);
  }

  // how many days each symbol was marked; prefix is 'YYYY-MM' or 'YYYY'
  function counts(prefix) {
    var c = {};
    Object.keys(data.log).forEach(function (k) {
      if (k.indexOf(prefix) === 0) data.log[k].forEach(function (id) { c[id] = (c[id] || 0) + 1; });
    });
    return c;
  }
  function statsStrip(y, m) {
    var c = counts(T.key(y, m, 1).slice(0, 7));
    var items = data.acts.filter(function (a) { return c[a.id]; });
    if (!items.length) return '';
    return '<button class="stats" data-act="stats" aria-label="' + S.statsOpen + '"><span class="sline">' +
      items.map(function (a) { return '<span>' + esc(a.icon) + '<b>' + c[a.id] + '</b></span>'; }).join('') + '</span><i aria-hidden="true">›</i></button>';
  }
  function renderStats() {
    var o = T.fromDn(state.cur), cm = counts(T.key(o.y, o.m, 1).slice(0, 7)), cy = counts(String(o.y) + '-');
    var mName = (TH ? N.monthsTh : N.monthsEn)[o.m - 1], yName = TH ? 'พ.ศ. ' + (o.y + 543) : String(o.y);
    $('stats-title').textContent = mName + ' ' + (TH ? o.y + 543 : o.y);
    var rows = data.acts.filter(function (a) { return cy[a.id]; });
    $('stats-body').innerHTML = rows.length ? '<table class="stat"><thead><tr><th>' + S.days + '</th><th>' + esc(TH ? MONTHS_TH_SHORT[o.m - 1] : mName.slice(0, 3)) + '</th><th>' + yName + '</th></tr></thead><tbody>' +
      rows.map(function (a) {
        return '<tr><td><span>' + esc(a.icon) + '</span> ' + esc(actName(a)) + '</td><td>' + (cm[a.id] || '–') + '</td><td>' + cy[a.id] + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="note">' + S.noStats + '</p>';
  }

  /* ---------- views ---------- */
  function renderMonth() {
    var o = T.fromDn(state.cur), first = T.dn(o.y, o.m, 1), start = first - T.fromDn(first).wd;
    var nextFirst = o.m === 12 ? T.dn(o.y + 1, 1, 1) : T.dn(o.y, o.m + 1, 1);
    var weeks = Math.ceil((nextFirst - start) / 7), h = '<div class="dow">';
    for (var w = 0; w < 7; w++) {
      h += '<span><b>' + (TH ? DAYS_TH_SHORT[w] : N.daysEn[w].slice(0, 3)) + '</b>' + (TH ? N.daysEn[w].slice(0, 3) : N.daysThShort[w]) +
        '<br><i style="background:' + N.dayColors[w][1] + '"></i></span>';
    }
    h += '</div><div class="grid">';
    for (var n = start; n < start + weeks * 7; n++) {
      var i = inf(n), d = T.fromDn(n), top = topHoliday(i), acts = actsOn(i.key);
      var cls = 'cell' + (d.m !== o.m ? ' other' : '') + (n === today ? ' today' : '') + (n === state.cur ? ' sel' : '') + (isPub(i) ? ' pub' : '') + (acts.length ? ' has-acts' : '');
      h += '<button class="' + cls + '" data-n="' + n + '" data-d="' + i.key + '" aria-label="' + d.d + ' ' + (TH ? N.monthsTh : N.monthsEn)[d.m - 1] + '">' +
        '<span class="row"><span class="g">' + d.d + '</span>' + (data.notes[i.key] ? '<i class="nt" aria-hidden="true">✎</i>' : '') + (i.phase ? moon(PHASE_P[i.phase], 14) : '') + '</span>' +
        '<span class="lun">' + lunShort(i.lunar) + '</span>' +
        (top ? '<span class="hol ' + top.type + '">' + esc(hShort(top)) + '</span>' : '') +
        (acts.length ? '<span class="acts' + (acts.length < 3 ? ' big' : '') + '">' + acts.slice(0, acts.length > 3 ? 2 : 3).map(function (a) { return '<i>' + esc(a.icon) + '</i>'; }).join('') +
          (acts.length > 3 ? '<em>+' + (acts.length - 2) + '</em>' : '') + '</span>' : '') +
        '</button>';
    }
    h += '</div>' + statsStrip(o.y, o.m) + '<div class="legend">' +
      '<span>' + moon(0.5, 14) + ' ' + S.full + '</span><span>' + moon(0, 14) + ' ' + S['new'] + '</span><span>' + moon(0.25, 14) + moon(0.75, 14) + ' ' + S.half + '</span>' +
      '<span><i class="sw" style="background:var(--red)"></i> ' + S.pub + '</span><span>' + S.waxwan + '</span></div>';
    return h + agenda(o.y, o.m);
  }

  // list of the month's special days, under the grid
  function agenda(y, m) {
    var last = T.fromDn(T.dn(y, m + 1, 0)).d, rows = '', phra = [];
    for (var d = 1; d <= last; d++) {
      var i = T.info(y, m, d);
      if (i.phase) phra.push(d);
      i.holidays.forEach(function (x) {
        var name = hName(x), veg = /^Vegetarian Festival \(day (\d)/.exec(x.en);
        if (veg) { if (veg[1] !== '1' && d !== 1) return; name = veg[1] === '1' ? S.vegStart : S.vegCont; }
        rows += '<button class="arow ' + x.type + '" data-n="' + i.n + '"><b>' + d + '</b><span>' + dowShort(i.wd) + '</span><em>' + esc(name) + '</em></button>';
      });
    }
    return '<section class="agenda"><h3>' + S.glance((TH ? N.monthsTh : N.monthsEn)[m - 1]) + '</h3>' +
      '<p class="phra">' + S.phraList + ' <b>' + phra.join(', ') + '</b></p>' +
      (rows || '<p class="note">' + S.noHol + '</p>') + '</section>';
  }

  function renderWeek() {
    var start = state.cur - T.fromDn(state.cur).wd, h = '';
    for (var n = start; n < start + 7; n++) {
      var i = inf(n), d = T.fromDn(n), acts = actsOn(i.key);
      h += '<button class="wrow' + (isPub(i) ? ' pub' : '') + (n === today ? ' today' : '') + '" data-n="' + n + '">' +
        '<span class="wdate" style="border-color:' + N.dayColors[d.wd][1] + '"><small>' + (TH ? DAYS_TH_SHORT[d.wd] : N.daysEn[d.wd].slice(0, 3)) + '</small><b>' + d.d + '</b><small>' + (TH ? N.daysEn[d.wd].slice(0, 3) : N.daysThShort[d.wd]) + '</small></span>' +
        '<span class="wbody"><span class="l">' + moonOfLunar(i.lunar, 16) + esc(lunarMain(i.lunar)) +
        (i.phase ? ' · <b style="color:var(--gold)">' + S.wanPhra + '</b>' : '') + '</span>' +
        i.holidays.map(function (x) { return '<div class="h" style="color:var(--' + (x.type === 'public' ? 'red' : x.type === 'buddhist' ? 'gold' : 'obs') + ')">' + esc(hName(x)) + '</div>'; }).join('') +
        (acts.length ? '<div class="a">' + acts.map(function (a) { return esc(a.icon); }).join(' ') + '</div>' : '') +
        (data.notes[i.key] ? '<div class="n">✎ ' + esc(data.notes[i.key]) + '</div>' : '') +
        '</span></button>';
    }
    return h;
  }

  function dayCard(n, full) {
    var i = inf(n), d = T.fromDn(n), l = i.lunar, col = N.dayColors[d.wd], ids = data.log[i.key] || [];
    var dateEn = d.d + ' ' + N.monthsEn[d.m - 1] + ' ' + d.y;
    var dateTh = TH ? d.d + ' ' + N.monthsTh[d.m - 1] + ' พ.ศ. ' + i.be : N.thDigits(d.d) + ' ' + N.monthsTh[d.m - 1] + ' พ.ศ. ' + N.thDigits(i.be);
    var h = '<section class="card"><div class="day-head"><div class="day-num' + (isPub(i) ? ' pub' : '') + '">' + d.d + '</div><div class="day-meta">' +
      '<div class="w">' + (TH ? N.daysTh[d.wd] + ' · ' + N.daysEn[d.wd] : N.daysEn[d.wd] + ' · ' + N.daysTh[d.wd]) + '</div>' +
      '<div class="t">' + (TH ? dateTh : dateEn) + '</div><div class="t">' + (TH ? dateEn : dateTh) + '</div></div></div>' +
      '<div class="chips"><span class="chip">' + (TH ? 'ค.ศ. ' + d.y : 'BE ' + i.be) + '</span>' +
      '<span class="chip">' + N.zodiacIcon[i.zodiac] + ' ' + (TH ? 'ปี' + N.zodiacTh[i.zodiac] + ' (' + ANIMALS_TH[i.zodiac] + ')' : 'Year of the ' + N.zodiacEn[i.zodiac] + ' · ปี' + N.zodiacTh[i.zodiac]) + '</span>' +
      '<span class="chip"><i style="background:' + col[1] + '"></i>' + (TH ? 'สีประจำวัน: ' + COLORS_TH[d.wd] : 'Day colour: ' + col[0]) + '</span>' +
      (n === today ? '<span class="chip gold">' + S.today + '</span>' : '') + '</div>' +
      '<div class="lunar">' + moonOfLunar(l, full ? 56 : 40) + '<div><div class="en">' + esc(lunarMain(l)) + '</div><div class="th">' + esc(lunarSub(l)) + '</div>' +
      (i.phase ? '<div class="chips" style="margin-top:6px"><span class="chip gold">' + S.wanPhraChip + (TH ? PHASE_TH[i.phase] : N.phaseEn[i.phase]) + '</span></div>' : '') +
      (i.wanKon ? '<div class="chips" style="margin-top:6px"><span class="chip">' + S.wanKon + '</span></div>' : '') + '</div></div>';
    if (i.holidays.length) {
      h += '<ul class="hlist">' + i.holidays.map(function (x) {
        var note = TH ? x.noteTh.replace(/[๐-๙]/g, function (c) { return '๐๑๒๓๔๕๖๗๘๙'.indexOf(c); }) : x.note;
        return '<li class="' + x.type + '"><span class="tag">' + (x.type === 'public' ? S.tagPublic : x.type === 'buddhist' ? S.tagBuddhist : S.tagObs) + '</span>' +
          '<b>' + esc(TH ? x.th : x.en) + '</b><span class="th">' + esc(TH ? x.en : x.th) + '</span>' + (note ? '<p>' + esc(note) + '</p>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    h += '<div class="sec"><h3>' + S.myDay + '</h3><button class="link" data-act="symbols">' + S.edit + '</button></div><div class="toggles">' +
      data.acts.map(function (a) {
        return '<button class="tog" data-toggle="' + esc(a.id) + '" data-n="' + n + '" aria-pressed="' + (ids.indexOf(a.id) >= 0) + '"><span>' + esc(a.icon) + '</span><small>' + esc(actName(a)) + '</small></button>';
      }).join('') + '</div>' +
      (data.acts.length ? '' : '<p class="note">' + S.noSym + '</p>') +
      '<div class="sec"><h3>' + S.note + '</h3></div><textarea class="daynote" data-note="' + i.key + '" rows="2" maxlength="2000" placeholder="' + esc(S.notePh) + '" aria-label="' + S.note + '">' + esc(data.notes[i.key] || '') + '</textarea>';
    if (!T.official(d.y)) h += '<p class="note">' + S.calc(d.y) + '</p>';
    return h + '</section>';
  }

  function render() {
    var o = T.fromDn(state.cur), t, s;
    if (state.view === 'month') {
      t = TH ? N.monthsTh[o.m - 1] + ' ' + (o.y + 543) : N.monthsEn[o.m - 1] + ' ' + o.y;
      s = TH ? N.monthsEn[o.m - 1] + ' ' + o.y : N.monthsTh[o.m - 1] + ' พ.ศ. ' + N.thDigits(o.y + 543);
      $('main').innerHTML = renderMonth();
    } else if (state.view === 'week') {
      var a = T.fromDn(state.cur - o.wd), b = T.fromDn(state.cur - o.wd + 6);
      var en = a.d + (a.m !== b.m ? ' ' + N.monthsEn[a.m - 1].slice(0, 3) : '') + ' – ' + b.d + ' ' + N.monthsEn[b.m - 1].slice(0, 3) + ' ' + b.y;
      var th = a.d + (a.m !== b.m ? ' ' + MONTHS_TH_SHORT[a.m - 1] : '') + ' – ' + b.d + ' ' + MONTHS_TH_SHORT[b.m - 1] + ' ' + (b.y + 543);
      t = TH ? th : en; s = TH ? en : N.monthsTh[b.m - 1] + ' พ.ศ. ' + N.thDigits(b.y + 543);
      $('main').innerHTML = renderWeek();
    } else {
      t = TH ? DAYS_TH_SHORT[o.wd] + ' ' + o.d + ' ' + N.monthsTh[o.m - 1] + ' ' + (o.y + 543) : N.daysEn[o.wd].slice(0, 3) + ' ' + o.d + ' ' + N.monthsEn[o.m - 1] + ' ' + o.y;
      s = TH ? lunarPlainTh(T.lunar(state.cur)) : T.lunarTh(T.lunar(state.cur));
      $('main').innerHTML = dayCard(state.cur, true);
    }
    $('title').textContent = t; $('subtitle').textContent = s;
    if (state.sheet !== null) {
      // keep the note being typed in place when the pop-up is redrawn
      var f = document.activeElement, keep = f && f.dataset && f.dataset.note ? [f.dataset.note, f.selectionStart, f.selectionEnd] : null;
      $('sheet-body').innerHTML = dayCard(state.sheet, false);
      if (keep) { var ta = $('sheet-body').querySelector('[data-note="' + keep[0] + '"]'); if (ta) { ta.focus(); ta.setSelectionRange(keep[1], keep[2]); } }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.setAttribute('aria-selected', b.dataset.view === state.view); });
  }

  // fixed texts outside the views
  function applyLang() {
    S = STR[lang]; TH = lang === 'th';
    document.documentElement.lang = lang;
    document.title = S.appTitle;
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.textContent = S[b.dataset.view]; });
    $('today').textContent = S.today; $('lang').textContent = S.switchTo;
    $('prev').setAttribute('aria-label', S.prev); $('next').setAttribute('aria-label', S.next);
    $('sheet-prev').setAttribute('aria-label', S.prev); $('sheet-next').setAttribute('aria-label', S.next);
    $('jump').setAttribute('aria-label', S.jump); $('pick-prev').setAttribute('aria-label', S.prevYear); $('pick-next').setAttribute('aria-label', S.nextYear);
    $('pick-close').setAttribute('aria-label', S.close); $('stats-close').setAttribute('aria-label', S.close); $('pick-today').textContent = S.today;
    $('sheet-close').setAttribute('aria-label', S.close); $('sym-close').setAttribute('aria-label', S.close);
    $('sheet-full').textContent = S.openFull; $('sym-title').textContent = S.symTitle;
    $('new-name').placeholder = S.namePh; $('add-sym').textContent = S.add; $('sym-hint').textContent = S.hint;
    $('export').textContent = S.exp; $('import-label').textContent = S.imp;
  }

  function go(n) { state.cur = Math.max(MIN, Math.min(MAX, n)); render(); }
  function step(dir) {
    if (state.view === 'day') return go(state.cur + dir);
    if (state.view === 'week') return go(state.cur + 7 * dir);
    var o = T.fromDn(state.cur), m = o.m + dir, y = o.y;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    goMonth(y, m);
  }
  function goMonth(y, m) {   // same day of the month where it exists
    var o = T.fromDn(state.cur), last = T.fromDn(T.dn(y, m + 1, 0)).d;
    go(T.dn(y, m, Math.min(o.d, last)));
  }

  /* ---------- month and year picker ---------- */
  var pickYear = 0;
  function renderPicker() {
    var cur = T.fromDn(state.cur), now = T.fromDn(today), h = '';
    $('pick-year').textContent = TH ? 'พ.ศ. ' + (pickYear + 543) : String(pickYear);
    $('pick-sub').textContent = TH ? String(pickYear) : 'พ.ศ. ' + (pickYear + 543);
    $('pick-prev').disabled = pickYear <= T.MIN_YEAR; $('pick-next').disabled = pickYear >= T.MAX_YEAR;
    for (var m = 1; m <= 12; m++) {
      var cls = (pickYear === cur.y && m === cur.m ? ' sel' : '') + (pickYear === now.y && m === now.m ? ' now' : '');
      h += '<button type="button" class="pm' + cls + '" data-m="' + m + '">' + (TH ? MONTHS_TH_SHORT[m - 1] : N.monthsEn[m - 1].slice(0, 3)) + '</button>';
    }
    $('pick-months').innerHTML = h;
  }
  $('jump').onclick = function () { pickYear = T.fromDn(state.cur).y; renderPicker(); $('picker').showModal(); };
  $('pick-prev').onclick = function () { pickYear = Math.max(T.MIN_YEAR, pickYear - 1); renderPicker(); };
  $('pick-next').onclick = function () { pickYear = Math.min(T.MAX_YEAR, pickYear + 1); renderPicker(); };
  $('pick-months').onclick = function (e) {
    var b = e.target.closest('[data-m]'); if (!b) return;
    $('picker').close(); goMonth(pickYear, +b.dataset.m); window.scrollTo(0, 0);
  };
  $('pick-today').onclick = function () { $('picker').close(); go(today); };
  $('pick-close').onclick = function () { $('picker').close(); };
  $('picker').addEventListener('click', function (e) { if (e.target === this) this.close(); });
  function setView(v) { state.view = v; pref('view', v); render(); window.scrollTo(0, 0); }

  /* ---------- events ---------- */
  $('prev').onclick = function () { step(-1); };
  $('next').onclick = function () { step(1); };
  $('today').onclick = function () { go(today); };
  $('lang').onclick = function () {
    lang = TH ? 'en' : 'th'; pref('lang', lang);
    applyLang(); render(); if ($('symbols').open) renderSymbols(); if ($('picker').open) renderPicker(); if ($('stats').open) renderStats();
  };
  document.querySelector('.seg').onclick = function (e) { var b = e.target.closest('button'); if (b) setView(b.dataset.view); };

  // Day pop-up (bottom sheet)
  function openSheet(n) {
    state.cur = n; state.sheet = n; render();
    var d = $('day-sheet'); if (!d.open) d.showModal();
    d.scrollTop = 0;
  }
  $('day-sheet').addEventListener('close', function () { state.sheet = null; render(); });
  // notes save as you type
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 260) + 'px'; }
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t.dataset || !t.dataset.note) return;
    var v = t.value.replace(/\s+$/, '');
    if (v) data.notes[t.dataset.note] = t.value; else delete data.notes[t.dataset.note];
    save(); grow(t);
  });
  document.addEventListener('focusin', function (e) { if (e.target.dataset && e.target.dataset.note) grow(e.target); });
  $('stats-close').onclick = function () { $('stats').close(); };
  $('stats').addEventListener('click', function (e) { if (e.target === this) this.close(); });
  $('day-sheet').addEventListener('click', function (e) { if (e.target === this) this.close(); });   // tap outside
  $('sheet-close').onclick = function () { $('day-sheet').close(); };
  $('sheet-prev').onclick = function () { openSheet(Math.max(MIN, state.sheet - 1)); };
  $('sheet-next').onclick = function () { openSheet(Math.min(MAX, state.sheet + 1)); };
  $('sheet-full').onclick = function () { $('day-sheet').close(); setView('day'); };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-toggle],[data-act],[data-n]');
    if (!el) return;
    if (el.dataset.toggle) {
      var k = T.keyOf(+el.dataset.n), ids = data.log[k] || [], at = ids.indexOf(el.dataset.toggle);
      if (at >= 0) ids.splice(at, 1); else ids.push(el.dataset.toggle);
      if (ids.length) data.log[k] = ids; else delete data.log[k];
      save(); render();
    } else if (el.dataset.act === 'stats') {
      renderStats(); $('stats').showModal();
    } else if (el.dataset.act === 'symbols') {
      renderSymbols(); $('symbols').showModal();
    } else {
      openSheet(+el.dataset.n);
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
    if ($('symbols').open || $('day-sheet').open) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- symbols dialog ---------- */
  function renderSymbols() {
    $('sym-list').innerHTML = data.acts.map(function (a) {
      return '<li><span>' + esc(a.icon) + '</span><b>' + esc(actName(a)) + '</b><button type="button" class="del" data-del="' + esc(a.id) + '">' + S.del + '</button></li>';
    }).join('') || '<li><b style="color:var(--muted)">' + S.none + '</b></li>';
  }
  $('sym-close').onclick = function () { $('symbols').close(); };
  $('sym-list').onclick = function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var id = b.dataset.del, a = data.acts.filter(function (x) { return x.id === id; })[0];
    var used = Object.keys(data.log).filter(function (k) { return data.log[k].indexOf(id) >= 0; });
    if (used.length && !confirm(S.confirmDel(actName(a), used.length))) return;
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
        if (!confirm(S.confirmImp)) return;
        data = { v: d.v || 1, acts: d.acts, log: d.log || {}, notes: (d.notes && typeof d.notes === 'object') ? d.notes : {} }; save(); renderSymbols(); render();
      } catch (e) { alert(S.badFile); }
    };
    r.readAsText(f); this.value = '';
  };

  applyLang();
  render();
  // keep "today" right when the app is reopened on another day
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var d = new Date(), t = T.dn(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (t !== today) { if (state.cur === today) state.cur = t; today = t; render(); }
  });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js');
})();
