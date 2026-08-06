/* =========================================================
 * astro.js — 천문 계산 엔진 (태양 황경 · 24절기 · 삭(새달))
 * 모든 계산은 결정적(deterministic). 랜덤 없음.
 * 근거: Jean Meeus, "Astronomical Algorithms" 저정밀 공식
 * ========================================================= */
(function (global) {
  'use strict';

  const RAD = Math.PI / 180;

  /* ---------- 율리우스일 ---------- */
  // 그레고리력 (y,m,d,hourUT) → JD
  function jdFromDate(y, m, d, hourUT) {
    hourUT = hourUT || 0;
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    const jdn = d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 +
      Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
    return jdn - 0.5 + hourUT / 24;
  }

  // JD → {y, m, d, hour} (UT)
  function dateFromJD(jd) {
    const Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z;
    let A = Z;
    if (Z >= 2299161) {
      const al = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + al - Math.floor(al / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const dayF = B - D - Math.floor(30.6001 * E) + F;
    const m = E < 14 ? E - 1 : E - 13;
    const y = m > 2 ? C - 4716 : C - 4715;
    const d = Math.floor(dayF);
    return { y, m, d, hour: (dayF - d) * 24 };
  }

  // 그레고리력 날짜의 정수 JDN (정오 기준 번호)
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 +
      Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  /* ---------- ΔT (지구자전 보정, 초) ---------- */
  const DELTA_T_TABLE = [
    [1900, -3], [1920, 21], [1940, 24], [1950, 29], [1960, 33],
    [1970, 40], [1980, 51], [1990, 57], [2000, 64], [2010, 66],
    [2020, 69], [2030, 74], [2050, 93], [2100, 202]
  ];
  function deltaTSec(year) {
    const t = DELTA_T_TABLE;
    if (year <= t[0][0]) return t[0][1];
    if (year >= t[t.length - 1][0]) return t[t.length - 1][1];
    for (let i = 0; i < t.length - 1; i++) {
      if (year >= t[i][0] && year <= t[i + 1][0]) {
        const f = (year - t[i][0]) / (t[i + 1][0] - t[i][0]);
        return t[i][1] + f * (t[i + 1][1] - t[i][1]);
      }
    }
    return 69;
  }

  function norm360(x) { x %= 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }

  /* ---------- 태양 시황경 (겉보기 황경, 도) ---------- */
  // jd는 TT 기준으로 취급
  function sunLon(jdTT) {
    const T = (jdTT - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
      + 0.000289 * Math.sin(3 * M * RAD);
    const trueLon = L0 + C;
    const omega = 125.04 - 1934.136 * T;
    const apparent = trueLon - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return norm360(apparent);
  }

  /* ---------- 절기 시각 ----------
   * year년 안에서 태양 황경이 lonDeg(도)가 되는 순간의 JD(UT) 반환.
   * (소한~동지 등 24절기 모두, 해당 연도 1~12월 내의 시각)
   * -------------------------------- */
  const _termCache = {};
  function solarTermJD(year, lonDeg) {
    const key = year + '_' + lonDeg;
    if (_termCache[key] !== undefined) return _termCache[key];
    // 1월 1일경 태양 황경 ≈ 280.46° 를 기준으로 초기 추정
    let jd = 2451545.0 + (year - 2000) * 365.2422 + norm360(lonDeg - 280.46) / 0.9856;
    for (let i = 0; i < 8; i++) {
      const diff = norm180(lonDeg - sunLon(jd));
      jd += diff / 0.98565;
      if (Math.abs(diff) < 1e-7) break;
    }
    const r = jd - deltaTSec(year) / 86400; // TT → UT
    _termCache[key] = r;
    return r;
  }

  /* ---------- 삭(새달, New Moon) ----------
   * Meeus 49장. k번째 삭의 JD(UT).
   * k=0 → 2000-01-06 부근의 삭.
   * ---------------------------------------- */
  function newMoonJD(k) {
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let jde = 2451550.09766 + 29.530588861 * k
      + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;

    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = norm360(2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
    const Mp = norm360(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
    const F = norm360(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
    const Om = norm360(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;

    let corr = 0;
    corr += -0.40720 * Math.sin(Mp);
    corr += 0.17241 * E * Math.sin(M);
    corr += 0.01608 * Math.sin(2 * Mp);
    corr += 0.01039 * Math.sin(2 * F);
    corr += 0.00739 * E * Math.sin(Mp - M);
    corr += -0.00514 * E * Math.sin(Mp + M);
    corr += 0.00208 * E * E * Math.sin(2 * M);
    corr += -0.00111 * Math.sin(Mp - 2 * F);
    corr += -0.00057 * Math.sin(Mp + 2 * F);
    corr += 0.00056 * E * Math.sin(2 * Mp + M);
    corr += -0.00042 * Math.sin(3 * Mp);
    corr += 0.00042 * E * Math.sin(M + 2 * F);
    corr += 0.00038 * E * Math.sin(M - 2 * F);
    corr += -0.00024 * E * Math.sin(2 * Mp - M);
    corr += -0.00017 * Math.sin(Om);
    corr += -0.00007 * Math.sin(Mp + 2 * M);
    corr += 0.00004 * Math.sin(2 * Mp - 2 * F);
    corr += 0.00004 * Math.sin(3 * M);
    corr += 0.00003 * Math.sin(Mp + M - 2 * F);
    corr += 0.00003 * Math.sin(2 * Mp + 2 * F);
    corr += -0.00003 * Math.sin(Mp + M + 2 * F);
    corr += 0.00003 * Math.sin(Mp - M + 2 * F);
    corr += -0.00002 * Math.sin(Mp - M - 2 * F);
    corr += -0.00002 * Math.sin(3 * Mp + M);
    corr += 0.00002 * Math.sin(4 * Mp);

    // 행성 섭동 보정
    const A1 = (299.77 + 0.107408 * k - 0.009173 * T2) * RAD;
    const A2 = (251.88 + 0.016321 * k) * RAD;
    const A3 = (251.83 + 26.651886 * k) * RAD;
    const A4 = (349.42 + 36.412478 * k) * RAD;
    const A5 = (84.66 + 18.206239 * k) * RAD;
    const A6 = (141.74 + 53.303771 * k) * RAD;
    const A7 = (207.14 + 2.453732 * k) * RAD;
    const A8 = (154.84 + 7.306860 * k) * RAD;
    const A9 = (34.52 + 27.261239 * k) * RAD;
    const A10 = (207.19 + 0.121824 * k) * RAD;
    const A11 = (291.34 + 1.844379 * k) * RAD;
    const A12 = (161.72 + 24.198154 * k) * RAD;
    const A13 = (239.56 + 25.513099 * k) * RAD;
    const A14 = (331.55 + 3.592518 * k) * RAD;
    corr += 0.000325 * Math.sin(A1) + 0.000165 * Math.sin(A2) + 0.000164 * Math.sin(A3)
      + 0.000126 * Math.sin(A4) + 0.000110 * Math.sin(A5) + 0.000062 * Math.sin(A6)
      + 0.000060 * Math.sin(A7) + 0.000056 * Math.sin(A8) + 0.000047 * Math.sin(A9)
      + 0.000042 * Math.sin(A10) + 0.000040 * Math.sin(A11) + 0.000037 * Math.sin(A12)
      + 0.000035 * Math.sin(A13) + 0.000023 * Math.sin(A14);

    jde += corr;
    const y = 2000 + k / 12.3685;
    return jde - deltaTSec(y) / 86400; // TT → UT
  }

  // 특정 시점(jdUT) 근처의 삭 번호 k 추정
  function nearestNewMoonK(jdUT) {
    return Math.round((jdUT - 2451550.09766) / 29.530588861);
  }

  global.Astro = {
    jdFromDate, dateFromJD, jdn, sunLon, solarTermJD, newMoonJD,
    nearestNewMoonK, deltaTSec, norm360, norm180
  };
})(typeof window !== 'undefined' ? window : globalThis);
