// node test.js — checks the engine against published dates and real moon phases
require('./thaical.js');
const T = globalThis.ThaiCal;
let fail = 0;
const eq = (name, got, want) => { if (got !== want) { fail++; console.log('FAIL', name, 'got', got, 'want', want); } };
const hol = (y, name) => { const h = T.holidays(y); return Object.keys(h).filter(k => h[k].some(x => (x.en === name || x.en.startsWith(name + ' ') || (name.endsWith('1') && x.en.startsWith(name))))).sort()[0]; };

// Loy Krathong, published dates
const loy = { 2000: '11-11', 2001: '10-31', 2002: '11-19', 2003: '11-08', 2004: '11-26', 2005: '11-16', 2006: '11-05', 2007: '11-24',
  2008: '11-12', 2009: '11-02', 2010: '11-21', 2011: '11-10', 2012: '11-28', 2013: '11-17', 2014: '11-06', 2015: '11-25', 2016: '11-14',
  2017: '11-03', 2018: '11-22', 2019: '11-11', 2020: '10-31', 2021: '11-19', 2022: '11-08', 2023: '11-27', 2024: '11-15', 2025: '11-05', 2026: '11-24' };
for (const y in loy) eq('Loy ' + y, hol(+y, 'Loy Krathong'), y + '-' + loy[y]);
const others = [['Makha Bucha', '2020-02-08', '2021-02-26', '2022-02-16', '2023-03-06', '2024-02-24', '2025-02-12', '2026-03-03'],
  ['Visakha Bucha', '2020-05-06', '2021-05-26', '2022-05-15', '2023-06-03', '2024-05-22', '2025-05-11', '2026-05-31'],
  ['Asalha Bucha', '2020-07-05', '2021-07-24', '2022-07-13', '2023-08-01', '2024-07-20', '2025-07-10', '2026-07-29'],
  ['Khao Phansa', '2024-07-21', '2025-07-11', '2026-07-30'], ['Ok Phansa', '2025-10-07', '2026-10-26'],
  ['Chinese New Year', '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03'],
  ['Qingming', '2024-04-04', '2025-04-04', '2026-04-05'], ['Sat Chin', '2024-08-18', '2025-09-06', '2026-08-27'],
  ['Mid-Autumn Moon Festival', '2024-09-17', '2025-10-06', '2026-09-25'],
  ['Vegetarian Festival (day 1', '2023-10-15', '2024-10-03', '2025-10-21']];
for (const [name, ...dates] of others) for (const d of dates) eq(name + ' ' + d, hol(+d.slice(0, 4), name), d);

// Calibration: lag of real full moons behind the calendar, per year, with known type
// The rule alone must reproduce every known year type, and the walk from 1850 must land on the anchor
for (let y = 2000; y <= 2026; y++) eq('rule ' + y, T._rule(y, T.yearStart(y)), T.KNOWN[y]);
eq('1999 length', T.yearStart(2000) - T.yearStart(1999), [354, 355, 384][T.yearType(1999)]);
eq('2024 length', T.yearStart(2025) - T.yearStart(2024), 354);

// Every computed full-moon day must stay within a day or so of the real full moon, 1900-2150
let worst = 0, counts = {};
for (let y = 1900; y <= 2150; y++) {
  for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const cal = T.lunarDay(y, m, 15);
    const k = Math.round(T.kNear(cal + 0.5) - 0.5) + 0.5;
    const diff = Math.floor(T.moonPhase(k) + 7 / 24) - cal;
    counts[diff] = (counts[diff] || 0) + 1; worst = Math.max(worst, Math.abs(diff));
  }
}
console.log('full-moon day offsets (real - calendar), 1900-2150:', JSON.stringify(counts));
if (worst > 2) { fail++; console.log('FAIL drift', worst); }
const seq = []; for (let y = 2027; y <= 2040; y++) seq.push(y + ':' + T.yearType(y)); console.log('predicted types', seq.join(' '));
console.log(fail ? fail + ' FAILED' : 'all checks passed');
