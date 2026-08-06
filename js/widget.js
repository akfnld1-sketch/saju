/* =========================================================
 * widget.js — 오늘의 운세 홈 위젯
 * 마지막 풀이 프로필(localStorage)로 접속 즉시 오늘 운세 표시
 * ========================================================= */
(function () {
  'use strict';
  const M = window.Manse, AN = window.Analysis, T = window.Texts;
  const $ = id => document.getElementById(id);
  const KEY = 'saju_profile_v1';

  function saveProfile(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경 무시 */ }
  }
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  const DOMAIN_TIP = {
    money: '오늘은 지갑이 열리기 쉬운 날이니 지출 전 한 번 더 생각하면 득이 됩니다.',
    love: '마음을 표현하기 좋은 날입니다. 안부 연락 하나가 인연을 살립니다.',
    health: '몸이 보내는 신호에 귀 기울이고, 무리한 일정은 줄이세요.',
    career: '맡은 일을 정리해 보고하기 좋은 날입니다. 성과를 드러내세요.'
  };

  function render() {
    const prof = loadProfile();
    const card = $('widgetCard');
    if (!card) return;
    if (!prof || !prof.solar) { card.classList.add('hidden'); return; }

    const p = M.fourPillars(prof.solar);
    const str = AN.strength(p);
    const ys = AN.yongsin(p, str);
    const now = new Date();
    const g = M.dateGanzhi(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const rows = Object.entries(AN.DOMAINS).map(([key, d]) => {
      const f = AN.domainFortune(p, ys, g.day, key);
      return { key, ...d, stars: AN.starsOf(f.score), score: f.score };
    });
    const best = [...rows].sort((a, b) => b.score - a.score)[0];
    const worst = [...rows].sort((a, b) => a.score - b.score)[0];
    const L = AN.LUCKY[ys.elem];

    const starHtml = n => `<span class="w-stars">${'★'.repeat(n)}<span class="dim">${'★'.repeat(5 - n)}</span></span>`;
    card.innerHTML = `
      <div class="widget-head">
        <h2>🌅 ${prof.name ? prof.name + '님의 ' : ''}오늘의 운세 <span class="muted">(${now.getMonth() + 1}/${now.getDate()} · ${g.day.ko}일)</span></h2>
        <button type="button" class="w-link" id="widgetFull">전체 풀이 보기 →</button>
      </div>
      <div class="widget-grid">
        ${rows.map(r => `<div class="w-row"><span>${r.icon} ${r.name}</span>${starHtml(r.stars)}</div>`).join('')}
      </div>
      <p class="w-tip">💡 ${best.icon} ${best.name}이 가장 밝은 날 — ${DOMAIN_TIP[best.key]}${worst.stars <= 2 ? ` 다만 ${worst.name}은 흐림이니 ${DOMAIN_TIP[worst.key].replace('오늘은 ', '')}` : ''}</p>
      <div class="chips">
        <span class="chip">🎨 행운색 ${L.color.split('·')[0]}</span>
        <span class="chip">🔢 행운숫자 ${L.nums.join('·')}</span>
        <span class="chip">🧭 ${L.dir}</span>
      </div>`;
    card.classList.remove('hidden');

    $('widgetFull').addEventListener('click', () => {
      const f = prof.form;
      if (f) {
        (f.cal === 'lunar' ? $('calL') : $('calS')).checked = true;
        $('leapWrap').classList.toggle('hidden', f.cal !== 'lunar');
        (f.leap ? $('leapY') : $('leapN')).checked = true;
        $('bYear').value = f.y; $('bMonth').value = f.m; $('bDay').value = f.d;
        $('unknownTime').checked = !!f.unknownTime;
        $('timeRow').classList.toggle('hidden', !!f.unknownTime);
        if (!f.unknownTime) { $('bHour').value = f.hour; $('bMin').value = f.min; }
        (f.gender === 'F' ? $('gF') : $('gM')).checked = true;
        if (f.region) $('region').value = f.region;
        $('trueSolar').checked = f.trueSolar !== false;
        $('name').value = prof.name || '';
      }
      $('sajuForm').requestSubmit();
    });
  }

  window.Widget = { render, saveProfile, loadProfile };
  render();
})();
