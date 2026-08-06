/* =========================================================
 * app.js — UI 조립 (입력 → 만세력 → 분석 → 렌더링)
 * ========================================================= */
(function () {
  'use strict';
  const M = window.Manse, AN = window.Analysis, T = window.Texts;
  const $ = id => document.getElementById(id);

  const REGIONS = [
    ['seoul', '서울/경기', 126.98], ['incheon', '인천', 126.71], ['busan', '부산', 129.08],
    ['daegu', '대구', 128.60], ['gwangju', '광주/전남', 126.85], ['daejeon', '대전/충청', 127.38],
    ['ulsan', '울산', 129.31], ['gangwon', '강원', 128.90], ['jeonbuk', '전북', 127.15],
    ['gyeongbuk', '경북', 128.75], ['gyeongnam', '경남', 128.25], ['jeju', '제주', 126.53],
    ['etc', '기타/해외 (보정 없음)', null]
  ];
  const GROUP_OF = { '비견': '비겁', '겁재': '비겁', '식신': '식상', '상관': '식상', '편재': '재성', '정재': '재성', '편관': '관성', '정관': '관성', '편인': '인성', '정인': '인성' };
  const ELEM_DO = [
    '새로운 배움과 시작의 기운(木)을 쓰세요 — 공부, 기획, 식물 기르기, 아침형 생활이 운을 살립니다.',
    '표현과 활동의 기운(火)을 쓰세요 — 발표, 운동, 사람들과 어울리는 자리가 운을 살립니다.',
    '신용과 꾸준함의 기운(土)을 쓰세요 — 저축, 규칙적인 루틴, 약속 지키기가 운을 살립니다.',
    '정리와 결단의 기운(金)을 쓰세요 — 정리정돈, 원칙 세우기, 꼼꼼한 계약 검토가 운을 살립니다.',
    '휴식과 지혜의 기운(水)을 쓰세요 — 충분한 수면, 독서, 물가 여행이 운을 살립니다.'
  ];
  const ELEM_AVOID = [
    '무리한 확장과 벌여놓기(木 과용)는 피하세요.',
    '충동적인 언행과 과열된 승부(火 과용)는 피하세요.',
    '변화를 미루는 고집과 정체(土 과용)는 피하세요.',
    '지나친 비판과 독단적 결정(金 과용)은 피하세요.',
    '우유부단한 미루기와 과음(水 과용)은 피하세요.'
  ];

  /* ---------- 초기화 ---------- */
  function fillSelect(sel, from, to, unit, selected) {
    let html = '';
    for (let v = from; v <= to; v++) html += `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}${unit}</option>`;
    sel.innerHTML = html;
  }
  const nowY = new Date().getFullYear();
  fillSelect($('bYear'), 1920, nowY, '년', 1990);
  fillSelect($('bMonth'), 1, 12, '월', 1);
  fillSelect($('bDay'), 1, 31, '일', 1);
  fillSelect($('bHour'), 0, 23, '시', 12);
  fillSelect($('bMin'), 0, 59, '분', 0);
  $('region').innerHTML = REGIONS.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('');

  document.querySelectorAll('input[name="cal"]').forEach(r =>
    r.addEventListener('change', () => $('leapWrap').classList.toggle('hidden', getVal('cal') !== 'lunar')));
  $('unknownTime').addEventListener('change', () => $('timeRow').classList.toggle('hidden', $('unknownTime').checked));

  function getVal(name) { return document.querySelector(`input[name="${name}"]:checked`).value; }

  /* ---------- 제출 ---------- */
  $('sajuForm').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('btnReset') && $('btnReset');

  function run() {
    const cal = getVal('cal');
    let y = +$('bYear').value, m = +$('bMonth').value, d = +$('bDay').value;
    let lunarInfo = null;

    if (cal === 'lunar') {
      const isLeap = getVal('leap') === '1';
      const conv = M.lunarToSolar(y, m, d, isLeap);
      if (!conv) { alert('해당 음력 날짜가 존재하지 않습니다. (윤달 여부와 날짜를 확인해 주세요)'); return; }
      lunarInfo = { year: y, month: m, day: d, isLeap };
      ({ y, m, d } = conv);
    } else {
      const dt = new Date(y, m - 1, d);
      if (dt.getMonth() !== m - 1 || dt.getDate() !== d) { alert('존재하지 않는 날짜입니다.'); return; }
      lunarInfo = null;
    }

    const region = REGIONS.find(r => r[0] === $('region').value);
    const input = {
      y, m, d,
      hour: +$('bHour').value, min: +$('bMin').value,
      gender: getVal('gender'),
      unknownTime: $('unknownTime').checked,
      lonDeg: region[2] || 126.98,
      applyTrueSolar: region[2] !== null && $('trueSolar').checked
    };

    const p = M.fourPillars(input);
    const lunar = lunarInfo || M.solarToLunar(y, m, d);
    const str = AN.strength(p);
    const ys = AN.yongsin(p, str);
    const du = M.daeun(p);
    const name = $('name').value.trim();

    renderPillars(p, lunar, name);
    renderElements(p);
    renderPersona(p);
    renderStrength(p, str, ys);
    renderLife(p, str);
    renderDaeun(p, du, ys);
    renderFortune(p, ys);
    renderSecret(p, ys);
    renderLucky(p, ys);

    window.currentSaju = { p, str, ys, du, name };

    // 오늘의 운세 위젯용 프로필 저장 (이 기기의 브라우저에만 저장됩니다)
    if (window.Widget) {
      window.Widget.saveProfile({
        name,
        solar: { ...input },
        form: {
          cal, y: $('bYear').value, m: $('bMonth').value, d: $('bDay').value,
          leap: cal === 'lunar' && lunarInfo && lunarInfo.isLeap,
          hour: $('bHour').value, min: $('bMin').value,
          unknownTime: input.unknownTime, gender: input.gender,
          region: $('region').value, trueSolar: $('trueSolar').checked
        }
      });
    }

    renderPrintCover(p, lunar, name, ys);
    if (window.trackEvent) window.trackEvent('saju-run');
    document.dispatchEvent(new CustomEvent('saju:updated'));

    $('results').classList.remove('hidden');
    updateShareURL(cal, lunarInfo, input, name);
    $('secPillars').scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- 렌더: 원국 ---------- */
  function pillarCol(gz, dayStem, isDayPillar) {
    if (!gz) return { god: '—', stemCell: '<div class="hanja">?</div>', branchCell: '<div class="hanja">?</div>', bGod: '—', stage: '—', hidden: '—' };
    const e1 = M.STEM_ELEM[gz.stem], e2 = M.BRANCH_ELEM[gz.branch];
    return {
      god: isDayPillar ? '일간(나)' : AN.tenGodOfStem(dayStem, gz.stem),
      stemCell: `<div class="hanja e${e1}">${M.STEMS_H[gz.stem]}</div><div class="muted">${M.STEMS[gz.stem]}·${M.ELEMENTS[e1][0]}</div>`,
      branchCell: `<div class="hanja e${e2}">${M.BRANCHES_H[gz.branch]}</div><div class="muted">${M.BRANCHES[gz.branch]}·${M.ELEMENTS[e2][0]}</div>`,
      bGod: AN.tenGodOfBranch(dayStem, gz.branch),
      stage: AN.twelveStage(dayStem, gz.branch),
      hidden: M.BRANCH_HIDDEN[gz.branch].map(s => M.STEMS[s]).join('·')
    };
  }
  function renderPillars(p, lunar, name) {
    const ds = p.day.stem;
    const cols = [pillarCol(p.time, ds, false), pillarCol(p.day, ds, true), pillarCol(p.month, ds, false), pillarCol(p.year, ds, false)];
    const heads = ['시주', '일주', '월주', '년주'];
    const gm = AN.gongmang(p.day.idx);
    const row = key => cols.map(c => `<td>${c[key]}</td>`).join('');
    const inp = p.input;
    const timeStr = inp.unknownTime ? '시간 모름' : `${String(inp.hour).padStart(2, '0')}:${String(inp.min).padStart(2, '0')}`;

    $('secPillars').innerHTML = `
      <h2>📜 ${name ? name + '님의 ' : ''}사주 원국</h2>
      <p class="muted">양력 ${inp.y}년 ${inp.m}월 ${inp.d}일 ${timeStr} (${inp.gender === 'M' ? '남' : '여'})
      ${lunar ? ` · 음력 ${lunar.year}년 ${lunar.isLeap ? '윤' : ''}${lunar.month}월 ${lunar.day}일` : ''}
      ${p.trueSolarCorrMin ? ` · 진태양시 보정 ${p.trueSolarCorrMin > 0 ? '+' : ''}${Math.round(p.trueSolarCorrMin)}분` : ''}</p>
      <table class="pillar-table">
        <tr><th class="rowlabel"></th>${heads.map(h => `<th>${h}</th>`).join('')}</tr>
        <tr><td class="rowlabel">십신</td>${row('god')}</tr>
        <tr><td class="rowlabel">천간</td>${row('stemCell')}</tr>
        <tr><td class="rowlabel">지지</td>${row('branchCell')}</tr>
        <tr><td class="rowlabel">십신</td>${row('bGod')}</tr>
        <tr><td class="rowlabel">십이운성</td>${row('stage')}</tr>
        <tr><td class="rowlabel">지장간</td>${row('hidden')}</tr>
      </table>
      <div class="pill-meta">
        <span>띠: <b>${M.BRANCH_ANIMALS[p.year.branch]}띠</b></span>
        <span>일주: <b>${p.day.ko}(${p.day.hanja})</b></span>
        <span>년주 납음: <b>${AN.napeum(p.year.idx)}</b></span>
        <span>공망: <b>${M.BRANCHES[gm[0]]}·${M.BRANCHES[gm[1]]}</b></span>
        <span>절기: <b>${p.lastJeol.name}</b> 이후 출생</span>
      </div>`;
  }

  /* ---------- 렌더: 오행 ---------- */
  function renderElements(p) {
    const cnt = AN.elementCount(p);
    const total = cnt.reduce((a, b) => a + b, 0);
    let bars = '';
    for (let i = 0; i < 5; i++) {
      bars += `<div class="elem-row">
        <span class="elem-name e${i}">${M.ELEMENTS[i]}</span>
        <div class="elem-bar-wrap"><div class="elem-bar b${i}" style="width:${(cnt[i] / total) * 100}%"></div></div>
        <span class="elem-cnt">${cnt[i]}</span></div>`;
    }
    let notes = '';
    cnt.forEach((c, i) => {
      if (c >= 3) notes += `<p>· ${T.ELEM_EXCESS[i]}</p>`;
      if (c === 0) notes += `<p>· ${T.ELEM_LACK[i]}</p>`;
    });
    $('secElements').innerHTML = `<h2>🌈 오행 분포</h2>${bars}
      <div class="mt">${notes || '<p class="muted">오행이 비교적 고르게 갖춰진 원국입니다. 균형 잡힌 기질을 타고났습니다.</p>'}</div>`;
  }

  /* ---------- 렌더: 성격 ---------- */
  function renderPersona(p) {
    const info = T.DAY_STEM_PERSONA[p.day.stem];
    const mGod = AN.tenGodOfBranch(p.day.stem, p.month.branch);
    $('secPersona').innerHTML = `
      <h2>${info.icon} 타고난 성격과 기질 — ${M.STEMS[p.day.stem]}${M.ELEMENTS[M.STEM_ELEM[p.day.stem]][0]} 일간</h2>
      <p><b>${info.title}</b></p>
      <p>${info.core}</p>
      <h3>강점</h3><p>${info.strength}</p>
      <h3>보완할 점</h3><p>${info.weakness}</p>
      <h3>숨겨진 재능</h3><p>${info.talent}</p>
      <h3>적성</h3><p>${info.aptitude}</p>
      <p class="muted mt">월지 ${M.BRANCHES[p.month.branch]}(${mGod})의 영향: ${T.TEN_GOD_INFO[mGod].desc}</p>`;
  }

  /* ---------- 렌더: 신강약·용신 ---------- */
  function renderStrength(p, str, ys) {
    const pct = Math.round(str.ratio * 100);
    $('secStrength').innerHTML = `
      <h2>⚖️ 신강·신약과 용신</h2>
      <div class="gauge">
        <div class="gauge-head"><span>일간의 힘</span><span class="score-num">${str.grade} (${pct}%)</span></div>
        <div class="gauge-bar-wrap"><div class="gauge-bar" style="width:${pct}%"></div></div>
      </div>
      <p class="muted">${str.wolryeong ? '월지가 일간을 도와 득령(得令)한 사주입니다.' : '월지가 일간을 돕지 않아 실령(失令)한 사주입니다.'}</p>
      <div class="chips">
        <span class="chip good">용신: ${M.ELEMENTS[ys.elem]}</span>
        <span class="chip">희신: ${M.ELEMENTS[ys.huisin]}</span>
        <span class="chip bad">기신: ${M.ELEMENTS[ys.gisin]}</span>
      </div>
      <p class="mt">${ys.reason}</p>
      <p class="muted">※ 용신 판단은 유파에 따라 달라질 수 있는 영역으로, 억부(抑扶) 원칙 중심의 간명 결과입니다.</p>`;
  }

  /* ---------- 렌더: 인생 운 ---------- */
  function godGroupCounts(p) {
    const g = { '비겁': 0, '식상': 0, '재성': 0, '관성': 0, '인성': 0 };
    const ds = p.day.stem;
    const stems = [p.year.stem, p.month.stem];
    if (p.time) stems.push(p.time.stem);
    const branches = [p.year.branch, p.month.branch, p.day.branch];
    if (p.time) branches.push(p.time.branch);
    stems.forEach(s => g[GROUP_OF[AN.tenGodOfStem(ds, s)]]++);
    branches.forEach(b => g[GROUP_OF[AN.tenGodOfBranch(ds, b)]]++);
    return g;
  }
  function renderLife(p, str) {
    const g = godGroupCounts(p);
    const cnt = AN.elementCount(p);

    let money;
    if (g['재성'] === 0) money = '원국에 재성이 뚜렷하게 드러나지 않았습니다. 이는 돈이 없다는 뜻이 아니라, 돈을 좇기보다 실력과 명예를 쌓을 때 재물이 뒤따르는 유형이라는 의미입니다. 전문성을 기르는 것이 최고의 재테크입니다.';
    else if (g['재성'] >= 3 && str.grade === '신약') money = '재성이 많은데 일간이 약한 "재다신약"의 구조입니다. 돈 버는 기회와 씀씀이는 많지만 관리가 관건이니, 큰돈은 나눠 굴리고 보증·명의 대여는 반드시 피해야 합니다.';
    else money = '재성이 적절히 자리 잡아 재물의 그릇이 안정된 편입니다. ' + (g['식상'] > 0 ? '식상이 재성을 생하는 흐름(식상생재)이 있어, 자신의 재주와 콘텐츠가 곧 수입원이 되는 구조입니다.' : '성실히 벌어 꾸준히 모으는 정공법이 가장 잘 맞습니다.');

    const topGroup = Object.entries(g).sort((a, b) => b[1] - a[1])[0][0];
    const career = `원국에서 <b>${topGroup}</b>의 기운이 가장 강합니다. ${T.CAREER_BY_GROUP[topGroup]}` +
      (g['관성'] > 0 ? ' 관성이 있어 조직 생활에서도 인정받을 수 있습니다.' : ' 관성이 약해 자율성이 보장되는 환경일수록 능력이 살아납니다.');

    const spouseGroup = p.input.gender === 'M' ? '재성' : '관성';
    const dGod = AN.tenGodOfBranch(p.day.stem, p.day.branch);
    let love = g[spouseGroup] === 0
      ? `배우자를 뜻하는 ${spouseGroup}이 원국에 뚜렷하지 않습니다. 인연이 없다는 뜻이 아니라 서두른 인연보다 늦게 만난 인연이 더 안정적인 유형입니다.`
      : `배우자의 별인 ${spouseGroup}이 자리하고 있어 인연의 흐름이 자연스러운 편입니다.`;
    love += ` 배우자 자리(일지)에는 ${dGod}이 들어, ${T.TEN_GOD_INFO[dGod].desc.replace('별입니다.', '기운이 배우자 관계에 흐릅니다.')}`;

    const maxE = cnt.indexOf(Math.max(...cnt));
    let health = `가장 왕성한 오행이 ${M.ELEMENTS[maxE]}이므로 ${T.HEALTH_MAP[maxE]}`;
    const zeroE = cnt.findIndex(c => c === 0);
    if (zeroE >= 0) health += `<br>또한 ${M.ELEMENTS[zeroE]} 기운이 비어 있어 ${T.HEALTH_MAP[zeroE]}`;

    $('secLife').innerHTML = `
      <h2>🧭 분야별 타고난 운</h2>
      <h3>💰 재물운</h3><p>${money}</p>
      <h3>💼 직업·적성운</h3><p>${career}</p>
      <h3>💞 애정·배우자운</h3><p>${love}</p>
      <h3>🩺 건강운</h3><p>${health}</p>
      <p class="muted mt">※ 건강 관련 내용은 전통 오행 배속에 따른 일반 조언으로, 의학적 진단이 아닙니다.</p>`;
  }

  /* ---------- 렌더: 대운 ---------- */
  function renderDaeun(p, du, ys) {
    const curAge = new Date().getFullYear() - p.input.y + 1; // 세는나이
    let items = '', current = null;
    for (const item of du.list) {
      const god = AN.tenGodOfStem(p.day.stem, item.pillar.stem);
      const isNow = curAge >= item.fromAge && curAge <= item.toAge;
      if (isNow) current = { ...item, god };
      items += `<div class="daeun-item ${isNow ? 'now' : ''}">
        <div class="daeun-age">${item.fromAge}~${item.toAge}세</div>
        <div class="daeun-gz"><span class="e${M.STEM_ELEM[item.pillar.stem]}">${M.STEMS_H[item.pillar.stem]}</span><span class="e${M.BRANCH_ELEM[item.pillar.branch]}">${M.BRANCHES_H[item.pillar.branch]}</span></div>
        <div class="daeun-god">${god}</div></div>`;
    }
    let curText = '';
    if (current) {
      const e = M.STEM_ELEM[current.pillar.stem];
      const flag = e === ys.elem || e === ys.huisin ? '용신·희신의 기운이 들어오는 상승 대운입니다.'
        : e === ys.gisin ? '기신의 기운이 섞여 관리가 필요한 대운입니다.' : '무난하게 흘러가는 대운입니다.';
      curText = `<p class="mt">현재 <b>${current.pillar.ko}(${current.pillar.hanja}) 대운</b> (${current.fromAge}~${current.toAge}세, ${current.god}) — ${flag} ${T.TEN_GOD_FORTUNE[current.god]}</p>`;
    }
    $('secDaeun').innerHTML = `
      <h2>🛤️ 대운 — 10년 단위 인생의 큰 흐름</h2>
      <p class="muted">${du.forward ? '순행' : '역행'} 대운 · 대운수 ${du.startAge} (세는나이 기준 대략)</p>
      <div class="daeun-scroll">${items}</div>${curText}`;
  }

  /* ---------- 렌더: 운세 ---------- */
  function fortuneBlock(title, f) {
    return `<h3>${title} — ${f.ganzhi.ko}(${f.ganzhi.hanja}) · ${f.god}</h3>
      <div class="gauge">
        <div class="gauge-head"><span>흐름 점수</span><span class="score-num">${f.score}점</span></div>
        <div class="gauge-bar-wrap"><div class="gauge-bar" style="width:${f.score}%"></div></div>
      </div>
      <p>${T.scoreComment(f.score)} ${T.TEN_GOD_FORTUNE[f.god]}</p>
      ${f.rel && T.REL_TEXT[f.rel] ? `<p class="muted">${T.REL_TEXT[f.rel]}</p>` : ''}`;
  }
  function renderFortune(p, ys) {
    const now = new Date();
    const g = M.dateGanzhi(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const fy = AN.fortuneOf(p, g.year, ys);
    const fm = AN.fortuneOf(p, g.month, ys);
    const fd = AN.fortuneOf(p, g.day, ys);
    $('secFortune').innerHTML = `
      <h2>🗓️ 지금의 운세 흐름</h2>
      ${fortuneBlock(`올해의 운세 (${now.getFullYear()}년)`, fy)}
      ${fortuneBlock('이번 달의 운세', fm)}
      ${fortuneBlock(`오늘의 운세 (${now.getMonth() + 1}/${now.getDate()})`, fd)}`;
  }

  /* ---------- 렌더: 천기누설 ---------- */
  function renderSecret(p, ys) {
    const nowYear = new Date().getFullYear();
    const cheoneulBranches = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[1,7],[2,6],[5,3],[5,3]][p.day.stem];
    const tags = { chance: [], money: [], noble: [], warn: [] };
    for (let y = nowYear; y < nowYear + 10; y++) {
      const idx = ((y - 4) % 60 + 60) % 60;
      const st = idx % 10, br = idx % 12;
      const e = M.STEM_ELEM[st];
      const god = AN.tenGodOfStem(p.day.stem, st);
      if (e === ys.elem || e === ys.huisin) tags.chance.push(y);
      if (god === '편재' || god === '정재') tags.money.push(y);
      if (cheoneulBranches.includes(br)) tags.noble.push(y);
      if ((p.day.branch + 6) % 12 === br) tags.warn.push(y);
    }
    const fmt = a => a.length ? a.map(y => `${y}년`).join(', ') : '향후 10년 내에는 뚜렷하지 않음';
    $('secSecret').innerHTML = `
      <h2>🔮 천기누설 — 앞으로 10년의 큰 시기</h2>
      <ul class="secret-list">
        <li>🌟 <b>가장 큰 기회의 시기</b> — ${fmt(tags.chance)}<br><span class="muted">용신·희신의 기운이 들어오는 해입니다. 미뤄둔 도전은 이때 꺼내세요.</span></li>
        <li>💰 <b>재물이 들어오는 시기</b> — ${fmt(tags.money)}<br><span class="muted">재성운의 해입니다. 수입원 확장에 유리하되, 커진 씀씀이도 함께 오니 관리가 필요합니다.</span></li>
        <li>🤝 <b>귀인이 나타나는 시기</b> — ${fmt(tags.noble)}<br><span class="muted">천을귀인이 드는 해로, 사람을 통해 길이 열립니다.</span></li>
        <li class="warn">⚠️ <b>변동·주의의 시기</b> — ${fmt(tags.warn)}<br><span class="muted">일지와 충(沖)하는 해입니다. 이사·이직 등 변동수가 크니 중요한 결정은 두 번 검토하세요.</span></li>
        <li>✅ <b>반드시 할 것</b> — ${ELEM_DO[ys.elem]}</li>
        <li class="warn">🚫 <b>피해야 할 것</b> — ${ELEM_AVOID[ys.gisin]}</li>
      </ul>
      <p class="muted">※ 시기 풀이는 세운의 오행·십신 흐름에 따른 전통적 해석이며, 확정된 미래가 아닌 참고용 조언입니다.</p>`;
  }

  /* ---------- 렌더: 행운 ---------- */
  function renderLucky(p, ys) {
    const L = AN.LUCKY[ys.elem];
    const now = new Date();
    const lotto = AN.lottoNumbers(p, now.getFullYear(), now.getMonth() + 1, now.getDate());
    $('secLucky').innerHTML = `
      <h2>🍀 행운 정보 (용신 ${M.ELEMENTS[ys.elem]} 기준)</h2>
      <div class="chips">
        <span class="chip">🎨 색상: ${L.color}</span>
        <span class="chip">🔢 숫자: ${L.nums.join(', ')}</span>
        <span class="chip">🧭 방향: ${L.dir}</span>
      </div>
      <p class="mt">🍚 <b>행운 음식</b>: ${L.food}</p>
      <p>🎁 <b>행운 아이템</b>: ${L.item}</p>
      <h3>🎰 오늘의 참고 번호 (재미로 보기)</h3>
      <div class="lotto-row">${lotto.map(n => `<div class="ball">${n}</div>`).join('')}</div>
      <p class="muted">※ 사주와 오늘 날짜로 만든 재미 요소일 뿐, 당첨과 무관하며 어떤 보장도 하지 않습니다. 과도한 구매는 금물!</p>`;
  }

  /* ---------- 인쇄용 표지 (철학관 리포트 스타일) ---------- */
  function renderPrintCover(p, lunar, name, ys) {
    const el = $('printCover');
    if (!el) return;
    const now = new Date();
    const inp = p.input;
    const yg = M.dateGanzhi(now.getFullYear(), 6, 15).year;
    const yearScore = AN.fortuneOf(p, yg, ys).score;
    el.innerHTML = `
      <div class="cover-inner">
        <p class="cover-deco">☯</p>
        <h1 class="cover-title">사주 명리 종합 리포트</h1>
        <p class="cover-sub">四柱命理 綜合 報告書</p>
        <div class="cover-info">
          <p><b>${name || '이름 미기재'}</b> (${inp.gender === 'M' ? '남' : '여'})</p>
          <p>양력 ${inp.y}년 ${inp.m}월 ${inp.d}일 ${inp.unknownTime ? '(시간 모름)' : String(inp.hour).padStart(2, '0') + ':' + String(inp.min).padStart(2, '0')}</p>
          ${lunar ? `<p>음력 ${lunar.year}년 ${lunar.isLeap ? '윤' : ''}${lunar.month}월 ${lunar.day}일</p>` : ''}
          <p>사주: ${p.year.hanja}년 ${p.month.hanja}월 ${p.day.hanja}일${p.time ? ' ' + p.time.hanja + '시' : ''}</p>
        </div>
        <div class="cover-score">
          <span class="cover-score-num">${yearScore}</span>
          <span class="cover-score-label">${now.getFullYear()}년 종합 운세 점수</span>
        </div>
        <p class="cover-date">발행일 ${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 · AI 사주 만세력</p>
        <p class="cover-note">본 리포트는 절기 천문 계산 기반 만세력과 전통 명리 해석에 따른 참고용 자료입니다.</p>
      </div>`;
  }

  /* ---------- 공유 / 인쇄 ---------- */
  function updateShareURL(cal, lunarInfo, input, name) {
    const q = new URLSearchParams({
      cal, y: $('bYear').value, m: $('bMonth').value, d: $('bDay').value,
      h: input.unknownTime ? 'x' : input.hour, mi: input.unknownTime ? 'x' : input.min,
      g: input.gender, r: $('region').value,
      leap: cal === 'lunar' && lunarInfo && lunarInfo.isLeap ? 1 : 0,
      ts: $('trueSolar').checked ? 1 : 0
    });
    if (name) q.set('n', name);
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }
  $('btnPrint').addEventListener('click', () => window.print());
  $('btnShare').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); alert('결과 링크가 복사되었습니다!'); }
    catch (e) { prompt('아래 링크를 복사하세요:', location.href); }
  });
  $('btnReset').addEventListener('click', () => {
    $('results').classList.add('hidden');
    history.replaceState(null, '', location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- URL 복원 (모든 스크립트의 리스너 등록 후 실행) ---------- */
  document.addEventListener('DOMContentLoaded', function restore() {
    const q = new URLSearchParams(location.search);
    if (!q.has('y')) return;
    try {
      if (q.get('cal') === 'lunar') { $('calL').checked = true; $('leapWrap').classList.remove('hidden'); }
      if (q.get('leap') === '1') $('leapY').checked = true;
      $('bYear').value = q.get('y'); $('bMonth').value = q.get('m'); $('bDay').value = q.get('d');
      if (q.get('h') === 'x') { $('unknownTime').checked = true; $('timeRow').classList.add('hidden'); }
      else { $('bHour').value = q.get('h'); $('bMin').value = q.get('mi') || 0; }
      (q.get('g') === 'F' ? $('gF') : $('gM')).checked = true;
      if (q.get('r')) $('region').value = q.get('r');
      $('trueSolar').checked = q.get('ts') !== '0';
      if (q.get('n')) $('name').value = q.get('n');
      run();
    } catch (e) { /* 잘못된 파라미터는 무시 */ }
  });
})();
