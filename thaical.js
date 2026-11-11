/* Thai calendar engine: lunar dates (chantarakati), Buddhist holy days, holidays.
   Pure functions, no DOM. Works in the browser (window.ThaiCal) and in Node. */
(function (root) {
  'use strict';

  var DAY = 86400000;
  function dn(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }       // day number
  function fromDn(n) { var t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() }; }
  function key(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
  function keyOf(n) { var o = fromDn(n); return key(o.y, o.m, o.d); }

  /* ---------- Astronomy (Meeus, main periodic terms; good to a few minutes) ---------- */
  var RAD = Math.PI / 180;
  // k integer = new moon, k + 0.5 = full moon. Returns fractional day number (UTC).
  function moonPhase(k) {
    var T = k / 1236.85, E = 1 - 0.002516 * T;
    var J = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T;
    var M = (2.5534 + 29.1053567 * k) * RAD;
    var Mp = (201.5643 + 385.81693528 * k) * RAD;
    var F = (160.7108 + 390.67050284 * k) * RAD;
    var full = Math.abs(k - Math.round(k)) > 0.25, c;
    if (!full) {
      c = -0.4072 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
        + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) + 0.00208 * E * E * Math.sin(2 * M)
        - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F);
    } else {
      c = -0.40614 * Math.sin(Mp) + 0.17302 * E * Math.sin(M) + 0.01614 * Math.sin(2 * Mp) + 0.01043 * Math.sin(2 * F)
        + 0.00734 * E * Math.sin(Mp - M) - 0.00515 * E * Math.sin(Mp + M) + 0.00209 * E * E * Math.sin(2 * M)
        - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F);
    }
    return J + c - 2440587.5 - 0.0008; // minus ~70s delta-T
  }
  function kNear(dayNum) { return (dayNum + 2440587.5 - 2451550.09766) / 29.530588861; }
  // Sun's apparent longitude (deg) at fractional day number
  function sunLon(t) {
    var T = (t + 2440587.5 - 2451545) / 36525;
    var L0 = 280.46646 + 36000.76983 * T, M = (357.52911 + 35999.05029 * T) * RAD;
    var C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    return (((L0 + C - 0.00569) % 360) + 360) % 360;
  }
  // last new moon whose local date (tz hours) is <= dayNum
  function newMoonOnOrBefore(dayNum, tz) {
    var k = Math.round(kNear(dayNum)) + 1, d;
    for (;;) { d = Math.floor(moonPhase(k) + tz / 24); if (d <= dayNum) return d; k--; }
  }

  /* ---------- Thai lunar year types ---------- */
  // 0 normal (354 d), 1 athikawan (355 d, month 7 has 30 days), 2 athikamat (384 d, second month 8)
  // Years fixed from published festival dates.
  var KNOWN = { 2000: 1, 2001: 0, 2002: 2, 2003: 0, 2004: 2, 2005: 1, 2006: 0, 2007: 2, 2008: 0, 2009: 1, 2010: 2,
    2011: 0, 2012: 2, 2013: 0, 2014: 0, 2015: 2, 2016: 1, 2017: 0, 2018: 2, 2019: 0, 2020: 1, 2021: 2, 2022: 0,
    2023: 2, 2024: 0, 2025: 1, 2026: 2 };
  var KNOWN_MIN = 2000, KNOWN_MAX = 2026;
  var ANCHOR_Y = 2025, ANCHOR = dn(2024, 12, 1);   // 1st waxing of month 1, lunar year 2025
  var THRESH = 0.47;                               // calibrated on 2000-2026, see test.js
  var EPOCH = 1850;                                // earliest computed year
  var LUN = 29.530588861;
  var types = {}, starts = {};

  function isAthikamat(y) { return [1, 4, 7, 9, 12, 15, 18].indexOf((y + 543) % 19) >= 0; }
  function yearLen(t) { return t === 2 ? 384 : t === 1 ? 355 : 354; }

  // How far (days) the mean full moon falls after the calendar's first 15th-waxing day
  // of a lunar year starting at `start` (taken at noon, Thai time).
  function lag(start) {
    var cal = start + 14.5;
    var k = Math.round(kNear(cal) - 0.5) + 0.5;
    return 2451550.09766 + LUN * k - 2440587.5 + 7 / 24 - cal;
  }
  // The rule: Metonic 19-year pattern for the extra month; an extra day whenever the
  // calendar has run more than THRESH days ahead of the mean moon.
  function rule(y, start) { return isAthikamat(y) ? 2 : lag(start) > THRESH ? 1 : 0; }

  (function build() {
    // Walk back from the anchor by whole lunations to the epoch, snap to the day that is in
    // step with the mean moon, then run the rule forward. Known years override the rule.
    var n = 0, y;
    for (y = EPOCH; y < ANCHOR_Y; y++) n += isAthikamat(y) ? 13 : 12;
    var s = Math.round(ANCHOR - n * LUN);
    while (lag(s) > THRESH) s--;
    while (lag(s) <= THRESH - 1) s++;
    starts[EPOCH] = s;
  })();
  function yearStart(y) {
    if (y < EPOCH) y = EPOCH;
    if (y in starts) return starts[y];
    var a = y; while (!(a in starts)) a--;
    for (; a < y; a++) {
      types[a] = a in KNOWN ? KNOWN[a] : rule(a, starts[a]);
      starts[a + 1] = a + 1 === ANCHOR_Y ? ANCHOR : starts[a] + yearLen(types[a]);
    }
    return starts[y];
  }
  function yearType(y) { if (!(y in types)) { yearStart(y); yearStart(y + 1); } return types[y]; }

  // months of lunar year y: [{m: 1..12 | 88, start, len}]
  var monthCache = {};
  function months(y) {
    if (monthCache[y]) return monthCache[y];
    var t = yearType(y), s = yearStart(y), out = [];
    for (var m = 1; m <= 12; m++) {
      var len = m % 2 ? 29 : 30;
      if (m === 7 && t === 1) len = 30;
      out.push({ m: m, start: s, len: len }); s += len;
      if (m === 8 && t === 2) { out.push({ m: 88, start: s, len: 30 }); s += 30; }
    }
    return (monthCache[y] = out);
  }
  // Lunar date of a day number
  function lunar(n) {
    var y = fromDn(n).y + 1;
    while (yearStart(y) > n) y--;
    var ms = months(y);
    for (var i = ms.length - 1; i >= 0; i--) if (ms[i].start <= n) {
      var day = n - ms[i].start + 1, waxing = day <= 15;
      return { ly: y, month: ms[i].m, day: day, len: ms[i].len, waxing: waxing, kham: waxing ? day : day - 15,
        last: day === ms[i].len, type: yearType(y) };
    }
  }
  function lunarDay(y, month, day) {      // day number of given lunar day in lunar year y
    var ms = months(y);
    for (var i = 0; i < ms.length; i++) if (ms[i].m === month) return ms[i].start + (day === 'last' ? ms[i].len : day) - 1;
  }
  // 'full' | 'new' | 'first' | 'third' | null  (the four monthly Buddhist holy days)
  function isWanKon(l) { return l.day === 7 || l.day === 14 || l.day === 22 || l.day === l.len - 1; }
  function phaseOf(l) { return l.day === 15 ? 'full' : l.last ? 'new' : l.day === 8 ? 'first' : l.day === 23 ? 'third' : null; }

  /* ---------- Holidays ---------- */
  // type: 'public' (national holiday), 'buddhist' (religious, not a day off), 'observance'
  var FIXED = [
    [1, 1, 'public', "New Year's Day", 'วันขึ้นปีใหม่'],
    [1, 16, 'observance', "Teachers' Day", 'วันครู'],
    [1, 17, 'observance', 'King Ramkhamhaeng Day', 'วันพ่อขุนรามคำแหงมหาราช'],
    [1, 18, 'observance', 'Royal Thai Armed Forces Day', 'วันกองทัพไทย'],
    [2, 3, 'observance', "Thai Veterans' Day", 'วันทหารผ่านศึก'],
    [2, 14, 'observance', "Valentine's Day", 'วันวาเลนไทน์'],
    [3, 13, 'observance', 'National Elephant Day', 'วันช้างไทย'],
    [3, 31, 'observance', 'King Nangklao (Rama III) Memorial Day', 'วันพระบาทสมเด็จพระนั่งเกล้าเจ้าอยู่หัว'],
    [4, 2, 'observance', 'Thai Heritage Conservation Day', 'วันอนุรักษ์มรดกไทย'],
    [4, 6, 'public', 'Chakri Memorial Day', 'วันจักรี'],
    [4, 13, 'public', 'Songkran – Thai New Year', 'วันสงกรานต์ (วันมหาสงกรานต์)'],
    [4, 14, 'public', 'Songkran – Family Day', 'วันสงกรานต์ (วันเนา / วันครอบครัว)'],
    [4, 15, 'public', 'Songkran – Thai New Year’s Day', 'วันสงกรานต์ (วันเถลิงศก)'],
    [5, 1, 'public', 'National Labour Day', 'วันแรงงานแห่งชาติ'],
    [5, 4, 'public', 'Coronation Day', 'วันฉัตรมงคล', 2019],
    [6, 3, 'public', "Queen Suthida's Birthday", 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 2019],
    [6, 9, 'observance', 'Ananda Mahidol Day', 'วันอานันทมหิดล'],
    [6, 26, 'observance', 'Sunthorn Phu Day', 'วันสุนทรภู่'],
    [7, 28, 'public', "King Vajiralongkorn's Birthday", 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว', 2017],
    [7, 29, 'observance', 'National Thai Language Day', 'วันภาษาไทยแห่งชาติ'],
    [8, 12, 'public', "Mother's Day – Queen Sirikit's Birthday", 'วันแม่แห่งชาติ'],
    [8, 18, 'observance', 'National Science Day', 'วันวิทยาศาสตร์แห่งชาติ'],
    [9, 20, 'observance', 'National Youth Day', 'วันเยาวชนแห่งชาติ'],
    [9, 24, 'observance', 'Mahidol Day', 'วันมหิดล'],
    [9, 28, 'observance', 'Thai National Flag Day', 'วันพระราชทานธงชาติไทย', 2017],
    [10, 21, 'observance', "National Nurses' Day", 'วันพยาบาลแห่งชาติ'],
    [11, 25, 'observance', 'King Vajiravudh (Rama VI) Memorial Day', 'วันสมเด็จพระมหาธีรราชเจ้า'],
    [12, 16, 'observance', 'National Sports Day', 'วันกีฬาแห่งชาติ'],
    [12, 28, 'observance', 'King Taksin Memorial Day', 'วันสมเด็จพระเจ้าตากสินมหาราช'],
    [10, 13, 'public', 'King Bhumibol Memorial Day', 'วันนวมินทรมหาราช', 2017],
    [10, 23, 'public', 'Chulalongkorn Day', 'วันปิยมหาราช'],
    [12, 5, 'public', "Father's Day – King Bhumibol's Birthday & National Day", 'วันพ่อแห่งชาติ / วันชาติ'],
    [12, 10, 'public', 'Constitution Day', 'วันรัฐธรรมนูญ'],
    [12, 25, 'observance', 'Christmas Day', 'วันคริสต์มาส'],
    [12, 31, 'public', "New Year's Eve", 'วันสิ้นปี']
  ];

  function chineseNewYear(y) {          // new moon (China date) falling 21 Jan – 20 Feb
    var d = newMoonOnOrBefore(dn(y, 2, 20), 8);
    return d;
  }
  // China date on which the sun reaches ecliptic longitude `lon` (search starts near month m, day d)
  function termDay(y, lon, m, d) {
    var t = dn(y, m, d) - 4;
    while (sunLon(t + 1 - 8 / 24) < lon) t++;
    return t;
  }
  // 1st day of the Chinese month that holds the given solar term
  function chineseMonthStart(y, lon, m, d) { return newMoonOnOrBefore(termDay(y, lon, m, d), 8); }
  function vegetarianStart(y) { return chineseMonthStart(y, 210, 10, 23); }   // Chinese month 9

  var NOTES_TH = {
    'Makha Bucha': 'วันเพ็ญเดือน ๓ พระพุทธเจ้าทรงแสดงโอวาทปาฏิโมกข์แก่พระอรหันต์ ๑,๒๕๐ รูป ซึ่งมาประชุมพร้อมกันโดยมิได้นัดหมาย',
    'Trut Thai': 'วันสิ้นปีตามจันทรคติแบบไทยโบราณ (สิ้นเดือน ๔) ก่อนสงกรานต์ไม่กี่สัปดาห์ นิยมไปทำบุญที่วัด',
    'Visakha Bucha': 'วันเพ็ญเดือน ๖ วันคล้ายวันประสูติ ตรัสรู้ และปรินิพพานของพระพุทธเจ้า นับเป็นวันสำคัญที่สุดทางพระพุทธศาสนา',
    'Atthami Bucha': 'หลังวันวิสาขบูชา ๘ วัน เป็นวันถวายพระเพลิงพระพุทธสรีระ',
    'Asalha Bucha': 'วันเพ็ญเดือน ๘ พระพุทธเจ้าทรงแสดงปฐมเทศนา และเป็นวันที่พระรัตนตรัยครบองค์สาม',
    'Khao Phansa': 'พระสงฆ์เริ่มอยู่จำพรรษาตลอดสามเดือนในฤดูฝน พุทธศาสนิกชนจำนวนมากตั้งใจงดเหล้าเข้าพรรษา',
    'Sat Thai': 'ทำบุญอุทิศส่วนกุศลให้บรรพบุรุษในวันสิ้นเดือน ๑๐',
    'Ok Phansa': 'สิ้นสุดการอยู่จำพรรษาของพระสงฆ์ ตรงกับวันเพ็ญเดือน ๑๑',
    'Tak Bat Devo': 'ตักบาตรเทโวโรหณะ รำลึกถึงวันที่พระพุทธเจ้าเสด็จลงจากสวรรค์ชั้นดาวดึงส์ และเป็นวันเริ่มเทศกาลทอดกฐิน',
    'Loy Krathong': 'วันเพ็ญเดือน ๑๒ ลอยกระทงเพื่อบูชาและขอขมาพระแม่คงคา ภาคเหนือมีประเพณียี่เป็ง และเป็นวันสุดท้ายของเทศกาลทอดกฐิน',
    'Qingming': 'ครอบครัวชาวไทยเชื้อสายจีนไปไหว้และทำความสะอาดสุสานบรรพบุรุษ',
    'Sat Chin': 'ไหว้บรรพบุรุษและเซ่นไหว้วิญญาณไร้ญาติ ตรงกับวันที่ ๑๕ เดือน ๗ ตามปฏิทินจีน',
    'Mid-Autumn Moon Festival': 'ไหว้พระจันทร์และรับประทานขนมไหว้พระจันทร์ ตรงกับวันที่ ๑๕ เดือน ๘ ตามปฏิทินจีน',
    'Vegetarian Festival': 'ถือศีลกินเจ ๙ วัน ในเดือน ๙ ตามปฏิทินจีน'
  };
  var holCache = {};
  function baseHolidays(y) {            // map key -> [{type, en, th, note}]
    var map = {};
    function add(n, type, en, th, note) {
      var o = fromDn(n); if (o.y !== y) return;
      var k = keyOf(n); (map[k] = map[k] || []).push({ type: type, en: en, th: th, note: note || '', noteTh: NOTES_TH[en.split(' – ')[0].split(' (')[0]] || '' });
    }
    FIXED.forEach(function (f) { if (!f[5] || y >= f[5]) add(dn(y, f[0], f[1]), f[2], f[3], f[4]); });
    // second Saturday of January
    var j1 = fromDn(dn(y, 1, 1)).wd;
    add(dn(y, 1, 1) + ((6 - j1 + 7) % 7) + 7, 'observance', "Children's Day", 'วันเด็กแห่งชาติ');

    var am = yearType(y) === 2;
    var visM = am ? 7 : 6, asaM = am ? 88 : 8;
    add(lunarDay(y, am ? 4 : 3, 15), 'public', 'Makha Bucha', 'วันมาฆบูชา', 'Full moon of the 3rd lunar month. The Buddha taught the Ovada Patimokkha to 1,250 enlightened monks who gathered without being called.');
    add(lunarDay(y, 4, 'last'), 'observance', 'Trut Thai – traditional Thai year-end', 'วันตรุษไทย', 'End of the old lunar year (last day of the 4th month), a few weeks before Songkran. Merit-making at the temple.');
    add(lunarDay(y, visM, 15), 'public', 'Visakha Bucha', 'วันวิสาขบูชา', 'Full moon of the 6th lunar month. Birth, enlightenment and passing of the Buddha – the most sacred day of the year.');
    add(lunarDay(y, visM, 23), 'buddhist', 'Atthami Bucha', 'วันอัฏฐมีบูชา', 'Eight days after Visakha Bucha: the cremation of the Buddha.');
    add(lunarDay(y, asaM, 15), 'public', 'Asalha Bucha', 'วันอาสาฬหบูชา', 'Full moon of the 8th lunar month. The Buddha’s first sermon and the founding of the Sangha.');
    add(lunarDay(y, asaM, 16), 'public', 'Khao Phansa – Buddhist Lent begins', 'วันเข้าพรรษา', 'Monks begin the three-month rains retreat. Many people give up alcohol for Lent.');
    add(lunarDay(y, 10, 'last'), 'buddhist', 'Sat Thai', 'วันสารทไทย', 'Merit-making for ancestors at the end of the 10th lunar month.');
    add(lunarDay(y, 11, 15), 'buddhist', 'Ok Phansa – Buddhist Lent ends', 'วันออกพรรษา', 'End of the rains retreat, full moon of the 11th lunar month.');
    add(lunarDay(y, 11, 16), 'buddhist', 'Tak Bat Devo – Kathin season begins', 'วันตักบาตรเทโว', 'Alms-giving marking the Buddha’s return from heaven. The month of Kathin robe offerings starts.');
    add(lunarDay(y, 12, 15), 'observance', 'Loy Krathong', 'วันลอยกระทง', 'Full moon of the 12th lunar month. Krathong are floated to honour the water goddess. Yi Peng lantern festival in the North. Last day for Kathin robe offerings.');

    var cny = chineseNewYear(y);
    add(cny - 1, 'observance', 'Chinese New Year’s Eve (Wan Wai)', 'วันไหว้ตรุษจีน');
    add(cny, 'observance', 'Chinese New Year', 'วันตรุษจีน');
    add(termDay(y, 15, 4, 5), 'observance', 'Qingming – ancestor tomb visits', 'วันเช็งเม้ง', 'Thai-Chinese families visit and clean the graves of their ancestors.');
    add(chineseMonthStart(y, 150, 8, 23) + 14, 'observance', 'Sat Chin – Chinese Ghost Festival', 'วันสารทจีน', 'Offerings to ancestors and wandering spirits, 15th day of the 7th Chinese month.');
    add(chineseMonthStart(y, 180, 9, 23) + 14, 'observance', 'Mid-Autumn Moon Festival', 'วันไหว้พระจันทร์', 'Mooncakes and offerings to the moon, 15th day of the 8th Chinese month.');
    var veg = vegetarianStart(y);
    for (var i = 0; i < 9; i++) add(veg + i, 'observance', 'Vegetarian Festival (day ' + (i + 1) + ' of 9)', 'เทศกาลกินเจ (วันที่ ' + (i + 1) + ')', 'Nine days of plant-based eating (Kin Je) in the 9th Chinese lunar month.');
    return map;
  }
  function isPublic(map, k) { return !!map[k] && map[k].some(function (h) { return h.type === 'public'; }); }

  function holidays(y) {
    if (holCache[y]) return holCache[y];
    var map = baseHolidays(y), prev = baseHolidays(y - 1);
    // Substitution days: a public holiday on Sat/Sun moves to the next free working day.
    var taken = {};
    function sub(srcMap, yy) {
      Object.keys(srcMap).sort().forEach(function (k) {
        if (!isPublic(srcMap, k)) return;
        var p = k.split('-'), n = dn(+p[0], +p[1], +p[2]), wd = fromDn(n).wd;
        if (wd !== 0 && wd !== 6) return;
        var src = srcMap[k].filter(function (h) { return h.type === 'public'; })[0], name = src.en;
        for (var t = n + 1; ; t++) {
          var o = fromDn(t), tk = keyOf(t);
          if (o.wd === 0 || o.wd === 6 || taken[tk] || isPublic(o.y === y ? map : o.y === y - 1 ? prev : {}, tk)) continue;
          taken[tk] = 1;
          if (o.y === y) (map[tk] = map[tk] || []).push({ type: 'public', en: 'Substitution day for ' + name.split(' – ')[0], th: 'วันหยุดชดเชย' + src.th.split(' (')[0].split(' / ')[0], note: '', noteTh: '' });
          break;
        }
      });
    }
    sub(prev, y - 1); sub(map, y);
    return (holCache[y] = map);
  }

  /* ---------- Names ---------- */
  var N = {
    thDigits: function (s) { return String(s).replace(/\d/g, function (d) { return '๐๑๒๓๔๕๖๗๘๙'[d]; }); },
    monthsEn: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsTh: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
    daysEn: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysTh: ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'],
    daysThShort: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    // traditional colour of each weekday
    dayColors: [['Red', '#d64541'], ['Yellow', '#e6b422'], ['Pink', '#e77fa3'], ['Green', '#4a9d5b'], ['Orange', '#e8873a'], ['Blue', '#4a8fd6'], ['Purple', '#8a63c9']],
    zodiacEn: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'],
    zodiacTh: ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน'],
    zodiacIcon: ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐐', '🐒', '🐓', '🐕', '🐖'],
    phaseEn: { full: 'Full moon', 'new': 'New moon', first: 'Waxing half moon', third: 'Waning half moon' }
  };
  function lunarMonthLabel(m) { return m === 88 ? '8/8' : String(m); }
  function lunarEn(l) { return (l.waxing ? 'Waxing ' : 'Waning ') + l.kham + ', lunar month ' + lunarMonthLabel(l.month); }
  function lunarTh(l) { return (l.waxing ? 'ขึ้น ' : 'แรม ') + N.thDigits(l.kham) + ' ค่ำ เดือน ' + (l.month === 88 ? '๘ หลัง' : N.thDigits(l.month)); }
  // zodiac year turns on the 1st waxing of lunar month 5
  function zodiac(n) {
    var l = lunar(n), y = l.ly;
    if (l.month < 5 && l.month !== 88) y--;
    return ((y - 4) % 12 + 12) % 12;
  }

  function info(y, m, d) {
    var n = dn(y, m, d), l = lunar(n), k = key(y, m, d);
    return { key: k, n: n, wd: fromDn(n).wd, lunar: l, phase: phaseOf(l), wanKon: isWanKon(l), holidays: holidays(y)[k] || [], be: y + 543, zodiac: zodiac(n) };
  }

  root.ThaiCal = { dn: dn, fromDn: fromDn, key: key, keyOf: keyOf, info: info, lunar: lunar, lunarDay: lunarDay, yearType: yearType,
    yearStart: yearStart, holidays: holidays, names: N, lunarEn: lunarEn, lunarTh: lunarTh, moonPhase: moonPhase, kNear: kNear,
    chineseNewYear: chineseNewYear, vegetarianStart: vegetarianStart, _lag: lag, _rule: rule, KNOWN: KNOWN, MIN_YEAR: 1900, MAX_YEAR: 2150,
    reliable: function (y) { return y >= 1950 && y <= 2100; }, official: function (y) { return y >= KNOWN_MIN && y <= KNOWN_MAX + 1; } };
})(typeof window !== 'undefined' ? window : globalThis);
