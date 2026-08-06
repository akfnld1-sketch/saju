/* =========================================================
 * manse.js — 만세력 엔진 (사주 기둥 · 음양력 변환 · 대운)
 * 실제 절기/삭망 천문 계산 기반. 동일 입력 → 동일 결과.
 * ========================================================= */
(function (global) {
  'use strict';
  const A = global.Astro;

  /* ---------- 기본 상수 ---------- */
  const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const STEMS_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const BRANCHES_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const BRANCH_ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

  // 오행: 0목 1화 2토 3금 4수
  const ELEMENTS = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'];
  const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  const BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 지지 정기 장간 (대표 천간 인덱스)
  const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  // 지장간 전체 (여기/중기/정기)
  const BRANCH_HIDDEN = [
    [8, 9], [9, 7, 5], [4, 2, 0], [0, 1], [1, 9, 4], [4, 6, 2],
    [2, 5, 3], [3, 1, 5], [4, 8, 6], [6, 7], [7, 3, 4], [4, 0, 8]
  ];

  /* ---------- 절기 이름/황경 ---------- */
  // 월주 경계가 되는 12개 '절(節)'
  const JEOL = [
    { name: '입춘', lon: 315, monthBranch: 2 }, { name: '경칩', lon: 345, monthBranch: 3 },
    { name: '청명', lon: 15, monthBranch: 4 }, { name: '입하', lon: 45, monthBranch: 5 },
    { name: '망종', lon: 75, monthBranch: 6 }, { name: '소서', lon: 105, monthBranch: 7 },
    { name: '입추', lon: 135, monthBranch: 8 }, { name: '백로', lon: 165, monthBranch: 9 },
    { name: '한로', lon: 195, monthBranch: 10 }, { name: '입동', lon: 225, monthBranch: 11 },
    { name: '대설', lon: 255, monthBranch: 0 }, { name: '소한', lon: 285, monthBranch: 1 }
  ];
  // 중기(中氣) 황경 — 음력 월 번호 결정용. 동지=270
  const JUNGGI_LONS = [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300];

  /* ---------- 한국 표준시 역사적 오프셋 ---------- */
  function officialOffsetHours(y, m, d) {
    const v = y * 10000 + m * 100 + d;
    if (v >= 19080401 && v <= 19111231) return 8.5;
    if (v >= 19540321 && v <= 19610809) return 8.5;
    return 9;
  }

  /* ---------- KST 변환 도우미 ---------- */
  // jdUT → 한국 공식시 기준 {y,m,d,hour}
  function jdToKST(jdUT) {
    let r = A.dateFromJD(jdUT + 9 / 24);
    const off = officialOffsetHours(r.y, r.m, r.d);
    if (off !== 9) r = A.dateFromJD(jdUT + off / 24);
    return r;
  }
  // KST 날짜(자정 기준)의 정수 일련번호
  function kstDayNum(jdUT) {
    const r = jdToKST(jdUT);
    return A.jdn(r.y, r.m, r.d);
  }

  /* ---------- 간지 유틸 ---------- */
  function ganzhiName(idx) {
    const s = idx % 10, b = idx % 12;
    return {
      idx, stem: s, branch: b,
      ko: STEMS[s] + BRANCHES[b],
      hanja: STEMS_H[s] + BRANCHES_H[b]
    };
  }

  // 일주 간지 인덱스 (검증: 1949-10-01 = 갑자일, 1970-01-01 = 신사일)
  function dayGanzhiIdx(y, m, d) {
    return (((A.jdn(y, m, d) - 2440571) % 60) + 60) % 60;
  }

  /* ---------- 사주 원국 계산 ----------
   * input: { y, m, d, hour, min, gender('M'|'F'),
   *          lonDeg(출생지 경도, 기본 126.98=서울),
   *          unknownTime(bool), applyTrueSolar(bool) }
   * ------------------------------------ */
  function fourPillars(input) {
    const { y, m, d, gender } = input;
    const hour = input.unknownTime ? 12 : input.hour;
    const min = input.unknownTime ? 0 : (input.min || 0);
    const lonDeg = input.lonDeg || 126.98;

    const off = officialOffsetHours(y, m, d);
    // 출생 순간의 UT
    const birthJD = A.jdFromDate(y, m, d, hour + min / 60 - off);

    // 진태양시 보정(경도 기준): 시주·일주 경계 판단용
    const corrMin = input.applyTrueSolar === false ? 0 : (lonDeg - off * 15) * 4;
    const trueJD = A.jdFromDate(y, m, d, hour + min / 60) + corrMin / 1440; // 벽시계 타임라인
    const t = A.dateFromJD(trueJD); // 보정 후 벽시계 날짜/시각

    /* --- 년주: 입춘 기준 --- */
    const ipchunThis = A.solarTermJD(y, 315);
    const sajuYear = birthJD >= ipchunThis ? y : y - 1;
    const yearIdx = ((sajuYear - 4) % 60 + 60) % 60;

    /* --- 월주: 절(節) 기준 --- */
    // 출생 전 마지막 절 찾기
    let monthBranch = null, lastJeol = null, nextJeol = null;
    const cands = [];
    for (const yy of [y - 1, y, y + 1]) {
      for (const j of JEOL) cands.push({ ...j, jd: A.solarTermJD(yy, j.lon), year: yy });
    }
    cands.sort((a, b) => a.jd - b.jd);
    for (let i = 0; i < cands.length; i++) {
      if (cands[i].jd <= birthJD && (i === cands.length - 1 || cands[i + 1].jd > birthJD)) {
        lastJeol = cands[i]; nextJeol = cands[i + 1] || null;
        monthBranch = cands[i].monthBranch;
        break;
      }
    }
    // 월간: 오호둔 — 갑·기년 병인월 시작
    const yearStem = yearIdx % 10;
    const monthNumFromIn = ((monthBranch - 2) + 12) % 12; // 인월=0
    const monthStem = ((yearStem % 5) * 2 + 2 + monthNumFromIn) % 10;
    const monthIdx = monthNaturalIdx(monthStem, monthBranch);

    /* --- 일주: 진태양시 23시 이후 다음날 (정자시법) --- */
    let dayY = t.y, dayM = t.m, dayD = t.d;
    let dIdx = dayGanzhiIdx(dayY, dayM, dayD);
    if (!input.unknownTime && t.hour >= 23) dIdx = (dIdx + 1) % 60;

    /* --- 시주: 오서둔 — 갑·기일 갑자시 시작 --- */
    let timeIdx = null;
    if (!input.unknownTime) {
      const tb = Math.floor(((t.hour + 1) % 24) / 2);
      const dayStemForTime = dIdx % 10;
      const ts = ((dayStemForTime % 5) * 2 + tb) % 10;
      timeIdx = monthNaturalIdx(ts, tb);
    }

    return {
      input: { ...input, hour, min },
      sajuYear,
      year: ganzhiName(yearIdx),
      month: ganzhiName(monthIdx),
      day: ganzhiName(dIdx),
      time: timeIdx === null ? null : ganzhiName(timeIdx),
      lastJeol, nextJeol,
      birthJD, trueSolarCorrMin: corrMin
    };
  }

  // (천간, 지지) 쌍 → 60갑자 인덱스
  function monthNaturalIdx(stem, branch) {
    for (let i = stem; i < 60; i += 10) if (i % 12 === branch) return i;
    return -1;
  }

  /* ---------- 대운 ---------- */
  function daeun(pillars, count) {
    count = count || 8;
    const { gender } = pillars.input;
    const yangYear = (pillars.year.stem % 2) === 0;
    const forward = (yangYear && gender === 'M') || (!yangYear && gender === 'F');

    const gapDays = forward
      ? (pillars.nextJeol.jd - pillars.birthJD)
      : (pillars.birthJD - pillars.lastJeol.jd);
    const startAge = Math.max(1, Math.round(gapDays / 3));

    const list = [];
    for (let i = 1; i <= count; i++) {
      const idx = ((pillars.month.idx + (forward ? i : -i)) % 60 + 60) % 60;
      list.push({
        order: i,
        fromAge: startAge + (i - 1) * 10,
        toAge: startAge + i * 10 - 1,
        pillar: ganzhiName(idx)
      });
    }
    return { forward, startAge, list };
  }

  /* =========================================================
   * 음양력 변환 (한국 표준시 기준)
   * 규칙: 달은 삭이 든 날 시작 / 동지가 든 달 = 11월 /
   *       동지~동지 사이 13개 달이면 중기 없는 첫 달이 윤달
   * ========================================================= */
  const _suiCache = {};
  // sui: 동지(X-1) ~ 동지(X) 구간의 달 목록
  function buildSui(X) {
    if (_suiCache[X]) return _suiCache[X];
    const ws1 = A.solarTermJD(X - 1, 270); // 동지(X-1)
    const ws2 = A.solarTermJD(X, 270);     // 동지(X)
    const ws1Day = kstDayNum(ws1), ws2Day = kstDayNum(ws2);

    // ws1이 든 달의 삭 ~ ws2가 든 달의 삭
    let k = A.nearestNewMoonK(ws1) - 2;
    const moons = [];
    for (; ; k++) {
      const jd = A.newMoonJD(k);
      const dn = kstDayNum(jd);
      moons.push({ k, jd, dayNum: dn });
      if (dn > ws2Day + 40) break;
    }
    const startI = lastIndexWhere(moons, mo => mo.dayNum <= ws1Day);
    const endI = lastIndexWhere(moons, mo => mo.dayNum <= ws2Day);
    const months = [];
    for (let i = startI; i < endI; i++) {
      months.push({ startDayNum: moons[i].dayNum, endDayNum: moons[i + 1].dayNum }); // [start, end)
    }
    const isLeapSui = months.length === 13;

    // 각 달에 중기 포함 여부
    const junggis = [];
    for (const yy of [X - 2, X - 1, X, X + 1]) {
      for (const lon of JUNGGI_LONS) junggis.push(kstDayNum(A.solarTermJD(yy, lon)));
    }
    let leapUsed = false, num = 11, lunarYear = X - 1;
    for (let i = 0; i < months.length; i++) {
      const mo = months[i];
      const hasJunggi = junggis.some(dn => dn >= mo.startDayNum && dn < mo.endDayNum);
      if (i === 0) {
        mo.num = 11; mo.isLeap = false; mo.lunarYear = X - 1;
      } else if (isLeapSui && !leapUsed && !hasJunggi) {
        mo.num = num; mo.isLeap = true; mo.lunarYear = lunarYear; leapUsed = true;
      } else {
        num = num % 12 + 1;
        if (num === 1) lunarYear = X;
        mo.num = num; mo.isLeap = false; mo.lunarYear = lunarYear;
      }
      mo.days = mo.endDayNum - mo.startDayNum;
    }
    _suiCache[X] = months;
    return months;
  }
  function lastIndexWhere(arr, f) {
    let r = -1;
    for (let i = 0; i < arr.length; i++) if (f(arr[i])) r = i;
    return r;
  }

  // 양력 → 음력
  function solarToLunar(y, m, d) {
    const dn = A.jdn(y, m, d);
    for (const X of [y, y + 1]) {
      for (const mo of buildSui(X)) {
        if (dn >= mo.startDayNum && dn < mo.endDayNum) {
          return { year: mo.lunarYear, month: mo.num, day: dn - mo.startDayNum + 1, isLeap: mo.isLeap };
        }
      }
    }
    return null;
  }

  // 음력 → 양력 {y,m,d} / 없으면 null
  function lunarToSolar(ly, lm, ld, isLeap) {
    for (const X of [ly, ly + 1]) {
      for (const mo of buildSui(X)) {
        if (mo.lunarYear === ly && mo.num === lm && !!mo.isLeap === !!isLeap) {
          if (ld < 1 || ld > mo.days) return null;
          const dn = mo.startDayNum + ld - 1;
          return jdnToDate(dn);
        }
      }
    }
    return null;
  }
  function jdnToDate(dn) {
    const r = A.dateFromJD(dn); // JDN 정수 → 해당 날짜 정오
    return { y: r.y, m: r.m, d: r.d };
  }

  /* ---------- 특정 날짜의 년/월/일 간지 (운세용) ---------- */
  function dateGanzhi(y, m, d) {
    const noonJD = A.jdFromDate(y, m, d, 12 - 9); // KST 정오
    const ipchun = A.solarTermJD(y, 315);
    const gy = noonJD >= ipchun ? y : y - 1;
    const yearIdx = ((gy - 4) % 60 + 60) % 60;

    const cands = [];
    for (const yy of [y - 1, y]) {
      for (const j of JEOL) cands.push({ ...j, jd: A.solarTermJD(yy, j.lon) });
    }
    cands.sort((a, b) => a.jd - b.jd);
    let mb = 1;
    for (let i = 0; i < cands.length; i++) {
      if (cands[i].jd <= noonJD && (i === cands.length - 1 || cands[i + 1].jd > noonJD)) {
        mb = cands[i].monthBranch; break;
      }
    }
    const ys = yearIdx % 10;
    const ms = ((ys % 5) * 2 + 2 + ((mb - 2 + 12) % 12)) % 10;
    return {
      year: ganzhiName(yearIdx),
      month: ganzhiName(monthNaturalIdx(ms, mb)),
      day: ganzhiName(dayGanzhiIdx(y, m, d))
    };
  }

  global.Manse = {
    STEMS, STEMS_H, BRANCHES, BRANCHES_H, BRANCH_ANIMALS,
    ELEMENTS, STEM_ELEM, BRANCH_ELEM, BRANCH_MAIN_STEM, BRANCH_HIDDEN,
    JEOL, ganzhiName, dayGanzhiIdx, fourPillars, daeun,
    solarToLunar, lunarToSolar, dateGanzhi, monthNaturalIdx
  };
})(typeof window !== 'undefined' ? window : globalThis);
