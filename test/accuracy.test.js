/* 정확성 집중 검증: node test/accuracy.test.js
 * 1) 일진 앵커·연속성  2) 음양력 왕복 (수만 건)  3) 설날/윤달 앵커 확대
 * 4) 절기 날짜 범위 (100년)  5) 시주·일주 경계  6) 대운수 범위 */
require('../js/astro.js');
require('../js/manse.js');
const { Manse, Astro } = globalThis;

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}${detail ? ' — ' + detail : ''}`); }
}

/* --- 1) 일진 앵커 + 60갑자 연속성 --- */
ok('1900-01-01 갑술일', Manse.ganzhiName(Manse.dayGanzhiIdx(1900, 1, 1)).ko === '갑술');
ok('1949-10-01 갑자일', Manse.ganzhiName(Manse.dayGanzhiIdx(1949, 10, 1)).ko === '갑자');
ok('1970-01-01 신사일', Manse.ganzhiName(Manse.dayGanzhiIdx(1970, 1, 1)).ko === '신사');
// 1900-01-01부터 2050-12-31까지 하루씩 전진하며 간지가 정확히 1씩 증가하는지
(function () {
  let prev = Manse.dayGanzhiIdx(1900, 1, 1);
  let broken = null;
  const d = new Date(1900, 0, 2);
  while (d.getFullYear() <= 2050) {
    const idx = Manse.dayGanzhiIdx(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (idx !== (prev + 1) % 60) { broken = d.toISOString().slice(0, 10); break; }
    prev = idx;
    d.setDate(d.getDate() + 1);
  }
  ok('일진 60갑자 연속성 (1900~2050, 약 5.5만일)', broken === null, broken);
})();

/* --- 2) 음양력 왕복 검증 (1940~2049, 매일) --- */
(function () {
  let n = 0, broken = null;
  const d = new Date(1940, 0, 1);
  while (d.getFullYear() <= 2049) {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    const lun = Manse.solarToLunar(y, m, day);
    if (!lun) { broken = `${y}-${m}-${day} 변환실패`; break; }
    const back = Manse.lunarToSolar(lun.year, lun.month, lun.day, lun.isLeap);
    if (!back || back.y !== y || back.m !== m || back.d !== day) {
      broken = `${y}-${m}-${day} → 음 ${lun.year}/${lun.isLeap ? '윤' : ''}${lun.month}/${lun.day} → ${back ? back.y + '-' + back.m + '-' + back.d : 'null'}`;
      break;
    }
    if (lun.day < 1 || lun.day > 30 || lun.month < 1 || lun.month > 12) { broken = `${y}-${m}-${day} 범위이상`; break; }
    n++;
    d.setDate(d.getDate() + 1);
  }
  ok(`음양력 왕복 일관성 (${n.toLocaleString()}일 검증)`, broken === null, broken);
})();

/* --- 3) 설날 앵커 확대 --- */
const seollal = {
  1970: [2, 6], 1980: [2, 16], 1995: [1, 31], 2010: [2, 14],
  2015: [2, 19], 2021: [2, 12], 2022: [2, 1], 2026: [2, 17]
};
for (const [y, [m, d]] of Object.entries(seollal)) {
  const r = Manse.lunarToSolar(+y, 1, 1, false);
  ok(`설날 ${y} = ${m}/${d}`, r && r.y === +y && r.m === m && r.d === d, r && `${r.y}-${r.m}-${r.d}`);
}

/* --- 4) 윤달 앵커 확대 --- */
for (const [y, m] of [[2004, 2], [2006, 7], [2009, 5], [2012, 3], [2014, 9]]) {
  ok(`${y}년 윤${m}월 존재`, !!Manse.lunarToSolar(y, m, 1, true));
}
// 윤달이 없는 해에서 임의 윤달 조회는 null
for (const y of [2005, 2011, 2022]) {
  let any = false;
  for (let m = 1; m <= 12; m++) if (Manse.lunarToSolar(y, m, 1, true)) any = true;
  ok(`${y}년 윤달 없음`, !any);
}

/* --- 5) 절기 날짜 범위 (1950~2049) --- */
(function () {
  const ranges = [[315, 2, 3, 5, '입춘'], [0, 3, 19, 22, '춘분'], [90, 6, 20, 22, '하지'], [180, 9, 22, 24, '추분'], [270, 12, 21, 23, '동지']];
  let broken = null;
  for (let y = 1950; y <= 2049 && !broken; y++) {
    for (const [lon, m, dMin, dMax, name] of ranges) {
      const jd = Astro.solarTermJD(y, lon);
      const r = Astro.dateFromJD(jd + 9 / 24);
      if (r.m !== m || r.d < dMin || r.d > dMax) { broken = `${name} ${y} → ${r.y}-${r.m}-${r.d}`; break; }
    }
  }
  ok('절기 날짜 범위 (5절기 × 100년)', broken === null, broken);
})();

/* --- 6) 시주·일주 경계 (정자시법: 23시 이후 다음날 일주) --- */
const pA = Manse.fourPillars({ y: 2000, m: 6, d: 15, hour: 22, min: 50, gender: 'M', applyTrueSolar: false });
const pB = Manse.fourPillars({ y: 2000, m: 6, d: 15, hour: 23, min: 10, gender: 'M', applyTrueSolar: false });
const pC = Manse.fourPillars({ y: 2000, m: 6, d: 16, hour: 0, min: 10, gender: 'M', applyTrueSolar: false });
ok('23시 전 일주 유지', pA.day.idx === Manse.dayGanzhiIdx(2000, 6, 15));
ok('23시 후 일주 +1', pB.day.idx === (Manse.dayGanzhiIdx(2000, 6, 15) + 1) % 60);
ok('23시 후와 익일 자정 동일 일주', pB.day.idx === pC.day.idx);
ok('23시 후 시주 자시', pB.time.branch === 0 && pC.time.branch === 0);
// 진태양시 보정: 서울 23:20 출생 → 진태양시 22:48 → 일주 유지
const pD = Manse.fourPillars({ y: 2000, m: 6, d: 15, hour: 23, min: 20, gender: 'M', lonDeg: 126.98, applyTrueSolar: true });
ok('진태양시 보정 시 일주 유지', pD.day.idx === Manse.dayGanzhiIdx(2000, 6, 15));

/* --- 7) 대운수 범위 + 방향 (다양한 표본) --- */
(function () {
  let broken = null;
  for (let y = 1950; y <= 2020 && !broken; y += 7) {
    for (const [m, d] of [[1, 10], [4, 20], [8, 8], [12, 30]]) {
      for (const g of ['M', 'F']) {
        const p = Manse.fourPillars({ y, m, d, hour: 10, min: 0, gender: g });
        const du = Manse.daeun(p);
        if (du.startAge < 1 || du.startAge > 11) { broken = `${y}-${m}-${d} ${g} 대운수 ${du.startAge}`; break; }
        const yangYear = p.year.stem % 2 === 0;
        const expectForward = (yangYear && g === 'M') || (!yangYear && g === 'F');
        if (du.forward !== expectForward) { broken = `${y}-${m}-${d} ${g} 방향 오류`; break; }
      }
    }
  }
  ok('대운수 1~11 범위 + 양남음녀 순행 (표본 88건)', broken === null, broken);
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
