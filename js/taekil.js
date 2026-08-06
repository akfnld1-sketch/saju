/* =========================================================
 * taekil.js — 택일 (길일 추천, 결정적)
 * 앞으로 30일의 일진을 내 사주와 대조해 목적별 점수/별점 산출
 * ========================================================= */
(function (global) {
  'use strict';
  const M = global.Manse, AN = global.Analysis;

  const GROUP_OF = { '비견': '비겁', '겁재': '비겁', '식신': '식상', '상관': '식상', '편재': '재성', '정재': '재성', '편관': '관성', '정관': '관성', '편인': '인성', '정인': '인성' };

  /* 목적별 가중치: 유리한 십신 / 설명 */
  const PURPOSES = {
    contract: { name: '계약·문서', icon: '📝', favor: ['정인', '정관', '정재'], note: '문서·신용의 별(정인·정관)이 드는 날이 계약에 유리합니다.' },
    move: { name: '이사', icon: '🏠', favor: ['정인', '식신'], note: '이사는 충(沖)이 없는 날과 손 없는 날을 함께 보면 좋습니다.', sonEomneun: true },
    open: { name: '개업·시작', icon: '🎊', favor: ['식신', '편재', '정재'], note: '먹을 복(식신)과 재물(재성)의 날이 개업·런칭에 유리합니다.' },
    interview: { name: '면접·미팅', icon: '🤝', favor: ['정관', '정인', '식신'], note: '나를 좋게 보이게 하는 관성·인성의 날이 유리합니다.' },
    exam: { name: '시험', icon: '📚', favor: ['정인', '편인', '식신'], note: '학문의 별(인성)이 드는 날 시험·발표에 집중력이 살아납니다.' }
  };

  function starStr(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  function scoreDay(p, ys, y, m, d, purposeKey) {
    const g = M.dateGanzhi(y, m, d);
    const f = AN.fortuneOf(p, g.day, ys);
    const purpose = PURPOSES[purposeKey];
    let score = f.score;
    const tags = [];

    if (purpose.favor.includes(f.god)) { score += 12; tags.push(`${f.god}일`); }
    else if (purpose.favor.map(x => GROUP_OF[x]).includes(GROUP_OF[f.god])) { score += 6; }

    // 공망일: 중요한 시작·계약에는 감점
    const gm = AN.gongmang(p.day.idx);
    if (gm.includes(g.day.branch)) { score -= 10; tags.push('공망'); }

    if (f.rel === '충(沖)') { score -= 12; tags.push('일지충'); }
    if (f.rel === '합(合)') { score += 6; tags.push('합'); }

    // 손 없는 날 (음력 9·10·19·20·29·30일) — 이사 가점
    let sonEomneun = false;
    if (purpose.sonEomneun) {
      const lun = M.solarToLunar(y, m, d);
      if (lun && (lun.day % 10 === 9 || lun.day % 10 === 0)) {
        sonEomneun = true; score += 8; tags.push('손없는날');
      }
    }

    score = Math.max(10, Math.min(99, score));
    const stars = score >= 84 ? 5 : score >= 70 ? 4 : score >= 57 ? 3 : score >= 45 ? 2 : 1;
    return { y, m, d, ganzhi: g.day, god: f.god, score, stars, tags, sonEomneun };
  }

  /* 오늘부터 days일 스캔 */
  function scan(p, ys, baseDate, purposeKey, days) {
    days = days || 30;
    const out = [];
    const start = new Date(baseDate.y, baseDate.m - 1, baseDate.d);
    for (let i = 0; i < days; i++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push(scoreDay(p, ys, dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), purposeKey));
    }
    return out;
  }

  function best(list, n) {
    return [...list].sort((a, b) => b.score - a.score || (a.y * 500 + a.m * 40 + a.d) - (b.y * 500 + b.m * 40 + b.d)).slice(0, n || 3);
  }

  global.Taekil = { PURPOSES, scan, best, starStr, scoreDay };
})(typeof window !== 'undefined' ? window : globalThis);
