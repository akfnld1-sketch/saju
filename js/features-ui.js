/* =========================================================
 * features-ui.js — AI 상담 · 택일 · 궁합 UI 조립
 * app.js가 발행하는 saju:updated 이벤트 이후 동작
 * ========================================================= */
(function () {
  'use strict';
  const M = window.Manse, AN = window.Analysis, C = window.Consult,
    G = window.Gunghap, TK = window.Taekil;
  const $ = id => document.getElementById(id);

  function today() {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
  }

  /* ============== AI 상담 ============== */
  $('consultPresets').innerHTML = C.PRESETS
    .map(([label, q]) => `<button type="button" class="chip preset" data-q="${q}">${label}</button>`).join('');

  $('consultPresets').addEventListener('click', e => {
    const btn = e.target.closest('.preset');
    if (!btn) return;
    $('consultQ').value = btn.dataset.q;
    runConsult();
  });
  $('consultBtn').addEventListener('click', runConsult);
  $('consultQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runConsult(); } });

  function runConsult() {
    if (!window.currentSaju) return;
    const q = $('consultQ').value.trim();
    if (!q) { $('consultQ').focus(); return; }
    const r = C.answer(window.currentSaju, q, today());
    if (window.trackEvent) window.trackEvent('consult');
    $('consultA').innerHTML = `<div class="consult-answer">${r.html}</div>`;
    $('consultA').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ============== 택일 ============== */
  let curPurpose = 'contract';
  let curDays = 30;
  const PERIODS = [[1, '오늘'], [30, '30일'], [90, '3개월'], [365, '1년']];
  $('taekilPeriod').innerHTML = PERIODS
    .map(([d, label], i) =>
      `<input type="radio" name="tperiod" id="tp_${d}" value="${d}" ${d === 30 ? 'checked' : ''}>
       <label for="tp_${d}">${label}</label>`).join('');
  $('taekilPeriod').addEventListener('change', e => {
    curDays = +e.target.value;
    renderTaekil();
  });
  $('taekilPurpose').innerHTML = Object.entries(TK.PURPOSES)
    .map(([k, v], i) =>
      `<input type="radio" name="purpose" id="pp_${k}" value="${k}" ${i === 0 ? 'checked' : ''}>
       <label for="pp_${k}">${v.icon} ${v.name}</label>`).join('');
  $('taekilPurpose').addEventListener('change', e => {
    curPurpose = e.target.value;
    if (window.trackEvent) window.trackEvent('taekil');
    renderTaekil();
  });

  function renderTaekil() {
    if (!window.currentSaju) return;
    const { p, ys } = window.currentSaju;
    const purpose = TK.PURPOSES[curPurpose];
    const list = TK.scan(p, ys, today(), curPurpose, curDays);
    const long = curDays > 30;
    const topN = curDays === 1 ? 0 : long ? 10 : 3;
    const top = TK.best(list, topN);
    const topKeys = new Set(top.map(x => `${x.y}-${x.m}-${x.d}`));
    const medals = ['🥇', '🥈', '🥉'];

    const topHtml = top.map((x, i) => `
      <div class="taekil-top">
        <span class="taekil-rank">${medals[i] || (i + 1) + '위'}</span>
        <b>${long ? x.y + '년 ' : ''}${x.m}월 ${x.d}일</b> <span class="muted">(${x.ganzhi.ko}일 · ${x.god}${x.tags.length ? ' · ' + x.tags.join('·') : ''})</span>
        <span class="taekil-stars">${TK.starStr(x.stars)}</span>
      </div>`).join('');

    // 긴 기간은 ★4 이상만 목록에 표시 (숨긴 날 수 명시)
    const shown = long ? list.filter(x => x.stars >= 4) : list;
    const hiddenCnt = list.length - shown.length;
    const rows = shown.map(x => `
      <div class="taekil-day ${topKeys.has(`${x.y}-${x.m}-${x.d}`) ? 'top' : ''} ${x.stars <= 2 ? 'low' : ''}">
        <span class="td-date">${long ? String(x.y).slice(2) + '/' : ''}${x.m}/${x.d}</span>
        <span class="td-gz">${x.ganzhi.ko}</span>
        <span class="td-stars">${TK.starStr(x.stars)}</span>
        <span class="td-tags muted">${x.tags.join(' · ')}</span>
      </div>`).join('');

    const todayOnly = curDays === 1 ? (() => {
      const x = list[0];
      return `<p class="mt">오늘(${x.m}/${x.d}, ${x.ganzhi.ko}일)은 ${purpose.name}에 <b>${TK.starStr(x.stars)}</b> (${x.score}점)${x.tags.length ? ' · ' + x.tags.join('·') : ''}. ${x.stars >= 4 ? '진행하기 좋은 날입니다.' : x.stars === 3 ? '무난한 날입니다. 서두르지만 않으면 됩니다.' : '가능하면 다른 날로 미루는 편이 좋습니다.'}</p>`;
    })() : '';

    $('taekilResult').innerHTML = `
      <p class="mt">${purpose.note}</p>
      ${todayOnly}
      ${topN ? `<h3>추천 길일 TOP ${topN}</h3>${topHtml}` : ''}
      ${curDays > 1 ? `<h3>${curDays === 30 ? '30일' : curDays === 90 ? '3개월' : '1년'} 흐름${long ? ` <span class="muted">(★4 이상만 표시, ${hiddenCnt}일 생략)</span>` : ''}</h3>
      <div class="taekil-list">${rows}</div>` : ''}
      <p class="muted">※ 별점은 나의 사주 기준 상대적 흐름입니다. 별이 낮은 날을 피하는 것만으로도 택일의 절반은 성공입니다.</p>`;
  }

  /* ============== 궁합 ============== */
  function fillSelect(sel, from, to, unit, selected) {
    let html = '';
    for (let v = from; v <= to; v++) html += `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}${unit}</option>`;
    sel.innerHTML = html;
  }
  fillSelect($('pYear'), 1920, new Date().getFullYear(), '년', 1992);
  fillSelect($('pMonth'), 1, 12, '월', 1);
  fillSelect($('pDay'), 1, 31, '일', 1);
  fillSelect($('pHour'), 0, 23, '시', 12);
  fillSelect($('pMin'), 0, 59, '분', 0);

  document.querySelectorAll('input[name="pCal"]').forEach(r =>
    r.addEventListener('change', () =>
      $('pLeapWrap').classList.toggle('hidden', document.querySelector('input[name="pCal"]:checked').value !== 'lunar')));
  $('pUnknownTime').addEventListener('change', () => $('pTimeRow').classList.toggle('hidden', $('pUnknownTime').checked));

  $('gunghapForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!window.currentSaju) return;
    let y = +$('pYear').value, m = +$('pMonth').value, d = +$('pDay').value;
    if (document.querySelector('input[name="pCal"]:checked').value === 'lunar') {
      const conv = M.lunarToSolar(y, m, d, document.querySelector('input[name="pLeap"]:checked').value === '1');
      if (!conv) { alert('해당 음력 날짜가 존재하지 않습니다.'); return; }
      ({ y, m, d } = conv);
    } else {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1 || dt.getDate() !== d) { alert('존재하지 않는 날짜입니다.'); return; }
    }
    const p2 = M.fourPillars({
      y, m, d,
      hour: +$('pHour').value, min: +$('pMin').value,
      gender: document.querySelector('input[name="pGender"]:checked').value,
      unknownTime: $('pUnknownTime').checked,
      lonDeg: 126.98, applyTrueSolar: true
    });
    if (window.trackEvent) window.trackEvent('gunghap');
    renderGunghap(window.currentSaju.p, p2);
  });

  function renderGunghap(p1, p2) {
    const r = G.analyze(p1, p2);
    const items = r.items.map(x => `
      <div class="gh-item">
        <div class="gh-head"><b>${x.title}</b><span class="score-num">${x.pts}/${x.max}</span></div>
        <div class="gauge-bar-wrap"><div class="gauge-bar" style="width:${(x.pts / x.max) * 100}%"></div></div>
        <p class="gh-desc">${x.desc}</p>
      </div>`).join('');

    const marriage = r.score >= 80 ? '결혼 상대로도 매우 잘 맞는 조합입니다.'
      : r.score >= 65 ? '결혼을 생각해볼 만한 안정적인 조합입니다. 아래 갈등 요소만 미리 합의하면 좋습니다.'
        : '결혼을 서두르기보다, 아래 갈등 요소를 충분히 겪어보고 판단하는 것이 좋은 조합입니다.';

    const aspects = r.aspects.map(a => `
      <div class="w-row"><span>${a.name}</span>
        <span class="w-stars">${'★'.repeat(a.stars)}<span class="dim">${'★'.repeat(5 - a.stars)}</span></span>
      </div>`).join('');

    $('gunghapResult').innerHTML = `
      <div class="gh-score-card">
        <div class="gh-big">${r.score}<span class="gh-total">/100</span></div>
        <div><b>${r.band[0]}</b><br><span class="muted">${r.band[1]}</span></div>
      </div>
      <p class="muted">나의 일주 ${p1.day.ko}(${p1.day.hanja}) ↔ 상대 일주 ${p2.day.ko}(${p2.day.hanja}) · 상대는 나에게 ${r.god}의 인연</p>
      <h3>인연 그래프</h3>
      <div class="widget-grid">${aspects}</div>
      ${items}
      ${r.goods.length ? `<h3>잘 맞는 이유</h3><p>${r.goods.map(x => x.title.split(' ')[0]).join(', ')} 부분에서 높은 합을 이룹니다.</p>` : ''}
      ${r.conflicts.length ? `<h3>갈등 요소와 개선법</h3><p>${r.conflicts.map(x => x.desc).join(' ')}</p>` : ''}
      <h3>결혼 적합도</h3><p>${marriage}</p>
      <p class="muted">※ 궁합은 두 사람의 노력을 앞서지 못합니다. 낮은 항목은 "주의 안내판"으로만 활용하세요.</p>`;
    $('gunghapResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* 사주 갱신 시 택일 자동 렌더 + 상담 초기화 + 위젯 갱신 */
  document.addEventListener('saju:updated', () => {
    renderTaekil();
    C.resetHistory();
    $('consultA').innerHTML = '';
    $('gunghapResult').innerHTML = '';
    if (window.Widget) window.Widget.render();
  });
})();
