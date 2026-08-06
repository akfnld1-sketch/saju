/* 엔진 검증: node test/engine.test.js
 * 공개적으로 알려진 실제 달력 데이터와 대조한다. */
require('../js/astro.js');
require('../js/manse.js');
const { Manse, Astro } = globalThis;

let pass = 0, fail = 0;
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
}

/* --- 일주 간지 (역사적 앵커) --- */
eq('1949-10-01 갑자일', Manse.ganzhiName(Manse.dayGanzhiIdx(1949, 10, 1)).ko, '갑자');
eq('1970-01-01 신사일', Manse.ganzhiName(Manse.dayGanzhiIdx(1970, 1, 1)).ko, '신사');

/* --- 설날 (음력 1월 1일 → 양력) --- */
const seollal = { 1985: [2, 20], 1990: [1, 27], 2000: [2, 5], 2020: [1, 25], 2023: [1, 22], 2024: [2, 10], 2025: [1, 29] };
for (const [y, [m, d]] of Object.entries(seollal)) {
  const r = Manse.lunarToSolar(+y, 1, 1, false);
  eq(`설날 ${y}`, [r.y, r.m, r.d], [+y, m, d]);
}

/* --- 추석 (음력 8월 15일) --- */
const chuseok = { 2023: [9, 29], 2024: [9, 17], 2025: [10, 6] };
for (const [y, [m, d]] of Object.entries(chuseok)) {
  const r = Manse.lunarToSolar(+y, 8, 15, false);
  eq(`추석 ${y}`, [r.y, r.m, r.d], [+y, m, d]);
}

/* --- 윤달 존재 여부 --- */
eq('2020 윤4월 존재', !!Manse.lunarToSolar(2020, 4, 1, true), true);
eq('2023 윤2월 존재', !!Manse.lunarToSolar(2023, 2, 1, true), true);
eq('2025 윤6월 존재', !!Manse.lunarToSolar(2025, 6, 1, true), true);
eq('2017 윤5월 존재', !!Manse.lunarToSolar(2017, 5, 1, true), true);
eq('2024 윤달 없음', !!Manse.lunarToSolar(2024, 1, 1, true) || !!Manse.lunarToSolar(2024, 6, 1, true), false);

/* --- 양력→음력 왕복 --- */
const s2l = Manse.solarToLunar(2024, 9, 17);
eq('2024-09-17 → 음 8/15', [s2l.year, s2l.month, s2l.day, s2l.isLeap], [2024, 8, 15, false]);

/* --- 절기 날짜 --- */
function termKSTDate(y, lon) {
  const jd = Astro.solarTermJD(y, lon);
  const r = Astro.dateFromJD(jd + 9 / 24);
  return [r.y, r.m, r.d];
}
eq('입춘 2024', termKSTDate(2024, 315), [2024, 2, 4]);
eq('동지 2023', termKSTDate(2023, 270), [2023, 12, 22]);
eq('하지 2024', termKSTDate(2024, 90), [2024, 6, 21]);

/* --- 사주 기둥: 년주/월주 절기 경계 --- */
// 2024-02-04(입춘일) 이후 출생 → 갑진년, 이전 → 계묘년
const p1 = Manse.fourPillars({ y: 2024, m: 2, d: 5, hour: 12, min: 0, gender: 'M' });
eq('2024-02-05 년주 갑진', p1.year.ko, '갑진');
eq('2024-02-05 월주 병인', p1.month.ko, '병인');
const p2 = Manse.fourPillars({ y: 2024, m: 2, d: 3, hour: 12, min: 0, gender: 'M' });
eq('2024-02-03 년주 계묘', p2.year.ko, '계묘');

/* --- 시주: 오서둔 검증 (갑/기일 자시 = 갑자시) --- */
// 1949-10-01은 갑자일 → 낮 12시(오시)는 경오시
const p3 = Manse.fourPillars({ y: 1949, m: 10, d: 1, hour: 12, min: 40, gender: 'M', applyTrueSolar: false });
eq('갑자일 오시 = 경오시', p3.time.ko, '경오');
eq('1949-10-01 일주', p3.day.ko, '갑자');

/* --- 대운 방향: 갑진년(양간) 남자 → 순행 --- */
const du = Manse.daeun(p1);
eq('양남 순행', du.forward, true);
eq('대운 첫 기둥 정묘', du.list[0].pillar.ko, '정묘');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
