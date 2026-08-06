/* =========================================================
 * graph.js — 미래 10년 운세 그래프 (재물/애정/건강/직업/종합)
 * 단일 시리즈 뷰(탭 전환) · 텍스트 라벨로 식별 · 호버 툴팁
 * ========================================================= */
(function () {
  'use strict';
  const M = window.Manse, AN = window.Analysis, T = window.Texts;
  const $ = id => document.getElementById(id);
  let selYear = null;

  const TABS = [
    ['all', '🔮 종합'], ['money', '💰 재물'], ['love', '💘 애정'],
    ['health', '🩺 건강'], ['career', '💼 직업']
  ];
  let curTab = 'all';

  function yearData(saju, domain) {
    const { p, ys } = saju;
    const baseY = new Date().getFullYear();
    const out = [];
    for (let y = baseY; y < baseY + 10; y++) {
      const idx = ((y - 4) % 60 + 60) % 60;
      const gz = M.ganzhiName(idx);
      const f = domain === 'all' ? AN.fortuneOf(p, gz, ys) : AN.domainFortune(p, ys, gz, domain);
      out.push({ y, gz, god: f.god, score: f.score });
    }
    return out;
  }

  function render() {
    const saju = window.currentSaju;
    const sec = $('secGraph');
    if (!saju || !sec) return;
    const data = yearData(saju, curTab);
    const max = Math.max(...data.map(d => d.score));
    const min = Math.min(...data.map(d => d.score));

    const bars = data.map(d => {
      const h = Math.round(d.score);
      const isPeak = d.score === max, isLow = d.score === min;
      return `<div class="gcol ${selYear === d.y ? 'sel' : ''}" data-year="${d.y}" role="button" tabindex="0" aria-label="${d.y}년 상세 보기">
        ${isPeak || isLow ? `<span class="gval ${isLow ? 'low' : ''}">${d.score}</span>` : '<span class="gval ghost"></span>'}
        <div class="gbar-wrap"><div class="gbar ${isPeak ? 'peak' : ''}" style="height:${h}%"
          data-tip="${d.y}년 ${d.gz.ko} · ${d.god} · ${d.score}점 (클릭: 상세)"></div></div>
        <span class="gyear">${String(d.y).slice(2)}</span>
      </div>`;
    }).join('');

    const best = data.filter(d => d.score === max)[0];
    const low = data.filter(d => d.score === min)[0];
    const domName = TABS.find(t => t[0] === curTab)[1].slice(2);

    sec.innerHTML = `
      <h2>📈 앞으로 10년 운세 그래프</h2>
      <div class="seg graph-tabs">
        ${TABS.map(([k, label]) =>
      `<input type="radio" name="gtab" id="gt_${k}" value="${k}" ${k === curTab ? 'checked' : ''}>
           <label for="gt_${k}">${label}</label>`).join('')}
      </div>
      <div class="graph" role="img" aria-label="${domName} 10년 점수 그래프">${bars}</div>
      <p class="mt">${domName} 흐름은 <b>${best.y}년(${best.gz.ko}, ${best.god})</b>에 가장 높고,
      <b>${low.y}년(${low.gz.ko})</b>이 상대적 저점입니다.
      저점의 해는 나쁜 해가 아니라 "다지는 해"로 쓰면 다음 상승이 커집니다.</p>
      <div id="gyearDetail">${selYear ? yearDetailHtml(saju, selYear) : ''}</div>
      <p class="muted">막대를 클릭하면 그 해의 상세 풀이가 열립니다. 점수는 세운 십신·용신·합충 기반 상대 지표입니다.</p>`;

    sec.querySelector('.graph-tabs').addEventListener('change', e => {
      curTab = e.target.value;
      render();
    });
    sec.querySelector('.graph').addEventListener('click', e => {
      const col = e.target.closest('.gcol');
      if (!col) return;
      selYear = selYear === +col.dataset.year ? null : +col.dataset.year;
      render();
    });
  }

  /* 연도 상세: 세운 간지·십신·도메인별 별점과 이유 */
  function yearDetailHtml(saju, y) {
    const { p, ys } = saju;
    const idx = ((y - 4) % 60 + 60) % 60;
    const gz = M.ganzhiName(idx);
    const f = AN.fortuneOf(p, gz, ys);
    const e = M.STEM_ELEM[gz.stem];
    const flavor = e === ys.elem || e === ys.huisin ? '용신·희신의 기운이 드는 해라 전반적으로 순풍입니다.'
      : e === ys.gisin ? '기신의 기운이 섞이는 해라 확장보다 내실이 유리합니다.' : '크게 밀지도 막지도 않는 해입니다.';
    const doms = Object.entries(AN.DOMAINS).map(([k, d]) => {
      const df = AN.domainFortune(p, ys, gz, k);
      const n = AN.starsOf(df.score);
      return `<div class="w-row"><span>${d.icon} ${d.name}</span>
        <span class="w-stars">${'★'.repeat(n)}<span class="dim">${'★'.repeat(5 - n)}</span></span></div>`;
    }).join('');
    return `
      <div class="year-detail">
        <h3>${y}년 — ${gz.ko}(${gz.hanja})년 · ${f.god}운 · ${f.score}점</h3>
        <p>${flavor} ${T.TEN_GOD_FORTUNE[f.god]}${f.rel && T.REL_TEXT[f.rel] ? ' ' + T.REL_TEXT[f.rel] : ''}</p>
        <div class="widget-grid">${doms}</div>
        <p class="muted">${T.scoreComment(f.score)}</p>
      </div>`;
  }

  window.FortuneGraph = { render, yearData };
  document.addEventListener('saju:updated', render);
})();
