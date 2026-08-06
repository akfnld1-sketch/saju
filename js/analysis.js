/* =========================================================
 * analysis.js — 명리 분석 계층
 * 십신 · 십이운성 · 신살 · 공망 · 납음 · 오행 · 신강약 · 용신 · 운세
 * 모든 판단은 규칙 기반(결정적). 랜덤 없음(로또는 사주+날짜 해시 시드).
 * ========================================================= */
(function (global) {
  'use strict';
  const M = global.Manse;

  const TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

  /* ---------- 십신 ---------- */
  // 일간 vs 다른 천간
  function tenGodOfStem(dayStem, otherStem) {
    const de = M.STEM_ELEM[dayStem], oe = M.STEM_ELEM[otherStem];
    const samePolarity = (dayStem % 2) === (otherStem % 2);
    const rel = ((oe - de) + 5) % 5; // 0비겁 1식상 2재성 3관성 4인성
    return TEN_GODS[rel * 2 + (samePolarity ? 0 : 1)];
  }
  function tenGodOfBranch(dayStem, branch) {
    return tenGodOfStem(dayStem, M.BRANCH_MAIN_STEM[branch]);
  }

  /* ---------- 십이운성 ---------- */
  const STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  // 각 천간의 장생 지지 / 진행 방향(양간 순행, 음간 역행)
  const BIRTH_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 갑해 을오 병인 정유 무인 기유 경사 신자 임신 계묘
  function twelveStage(dayStem, branch) {
    const start = BIRTH_BRANCH[dayStem];
    const forward = dayStem % 2 === 0;
    const diff = forward ? ((branch - start) + 12) % 12 : ((start - branch) + 12) % 12;
    return STAGES[diff];
  }

  /* ---------- 공망 ---------- */
  function gongmang(dayIdx) {
    const xun = Math.floor(dayIdx / 10);
    const b1 = ((10 - 2 * xun) % 12 + 12) % 12;
    return [b1, (b1 + 1) % 12];
  }

  /* ---------- 납음오행 ---------- */
  const NAPEUM = [
    '해중금', '노중화', '대림목', '노방토', '검봉금', '산두화', '간하수', '성두토', '백랍금', '양류목',
    '천중수', '옥상토', '벽력화', '송백목', '장류수', '사중금', '산하화', '평지목', '벽상토', '금박금',
    '복등화', '천하수', '대역토', '차천금', '상자목', '대계수', '사중토', '천상화', '석류목', '대해수'
  ];
  function napeum(idx) { return NAPEUM[Math.floor(idx / 2)] + `(${['金','火','木','土','金','火','水','土','金','木','水','土','火','木','水','金','火','木','土','金','火','水','土','金','木','水','土','火','木','水'][Math.floor(idx / 2)]})`; }

  /* ---------- 십이신살 (년지 삼합 기준) ---------- */
  const SINSAL_NAMES = ['겁살', '재살', '천살', '지살', '년살(도화)', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살'];
  // 삼합국별 겁살 시작 지지: 신자진→사, 사유축→인, 인오술→해, 해묘미→신
  const GEOPSAL_START = { 0: 5, 1: 2, 2: 11, 3: 2, 4: 5, 5: 2, 6: 11, 7: 8, 8: 5, 9: 2, 10: 11, 11: 8 };
  function sinsalOf(yearBranch, targetBranch) {
    const start = GEOPSAL_START[yearBranch];
    return SINSAL_NAMES[((targetBranch - start) + 12) % 12];
  }

  /* ---------- 길신·흉신 ---------- */
  // 천을귀인: 일간 → 귀인 지지
  const CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
  const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }; // 양간의 양인 지지
  const GOEGANG = [16, 28, 46, 58]; // 경진 임진 경술 임술

  function specialStars(p) {
    const out = [];
    const branches = [p.year.branch, p.month.branch, p.day.branch];
    if (p.time) branches.push(p.time.branch);
    const names = ['년지', '월지', '일지', '시지'];

    const ce = CHEONEUL[p.day.stem];
    branches.forEach((b, i) => {
      if (ce.includes(b)) out.push({ name: '천을귀인', where: names[i], desc: '최고의 길신. 위기 때 귀인의 도움을 받는 자리입니다.' });
    });
    if (YANGIN[p.day.stem] !== undefined) {
      branches.forEach((b, i) => {
        if (b === YANGIN[p.day.stem]) out.push({ name: '양인살', where: names[i], desc: '강한 추진력과 승부욕. 힘을 좋은 방향으로 쓰면 큰 성취가 됩니다.' });
      });
    }
    if (GOEGANG.includes(p.day.idx)) out.push({ name: '괴강살', where: '일주', desc: '결단력과 리더십이 강한 일주. 극과 극의 기운이라 절제가 핵심입니다.' });

    // 십이신살 중 대표 3종은 위치까지 표기
    branches.forEach((b, i) => {
      const s = sinsalOf(p.year.branch, b);
      if (s === '역마살') out.push({ name: '역마살', where: names[i], desc: '이동·변화·해외와 인연이 많은 기운입니다.' });
      if (s === '년살(도화)') out.push({ name: '도화살', where: names[i], desc: '사람을 끄는 매력. 인기·예술 분야에서 강점이 됩니다.' });
      if (s === '화개살') out.push({ name: '화개살', where: names[i], desc: '예술·학문·종교적 감수성. 혼자만의 몰입에서 힘이 나옵니다.' });
    });
    return out;
  }

  /* ---------- 오행 분포 ---------- */
  function elementCount(p) {
    const cnt = [0, 0, 0, 0, 0];
    const stems = [p.year.stem, p.month.stem, p.day.stem];
    const branches = [p.year.branch, p.month.branch, p.day.branch];
    if (p.time) { stems.push(p.time.stem); branches.push(p.time.branch); }
    stems.forEach(s => cnt[M.STEM_ELEM[s]]++);
    branches.forEach(b => cnt[M.BRANCH_ELEM[b]]++);
    return cnt;
  }

  /* ---------- 신강·신약 ---------- */
  function strength(p) {
    const de = M.STEM_ELEM[p.day.stem];
    const isSupport = e => e === de || ((e + 1) % 5) === de; // 비겁 + 인성(생아)
    let score = 0, total = 0;
    const parts = [
      [M.STEM_ELEM[p.year.stem], 10], [M.STEM_ELEM[p.month.stem], 12],
      [M.BRANCH_ELEM[p.year.branch], 10], [M.BRANCH_ELEM[p.month.branch], 30],
      [M.BRANCH_ELEM[p.day.branch], 20]
    ];
    if (p.time) {
      parts.push([M.STEM_ELEM[p.time.stem], 10], [M.BRANCH_ELEM[p.time.branch], 13]);
    }
    for (const [e, w] of parts) { total += w; if (isSupport(e)) score += w; }
    const ratio = score / total;
    const grade = ratio >= 0.6 ? '신강' : ratio >= 0.45 ? '중화' : '신약';
    const wolryeong = isSupport(M.BRANCH_ELEM[p.month.branch]); // 득령 여부
    return { ratio, grade, wolryeong };
  }

  /* ---------- 용신 (억부 중심, 간이 판단) ---------- */
  function yongsin(p, str) {
    const de = M.STEM_ELEM[p.day.stem];
    const cnt = elementCount(p);
    const inseong = (de + 4) % 5, bigyeop = de;
    const siksang = (de + 1) % 5, jaeseong = (de + 2) % 5, gwanseong = (de + 3) % 5;
    let elem, reason;
    if (str.grade === '신약') {
      elem = cnt[inseong] <= cnt[bigyeop] ? inseong : bigyeop;
      reason = '일간의 힘이 약한 편이라 나를 돕는 기운(인성·비겁)이 용신이 됩니다.';
    } else if (str.grade === '신강') {
      const candidates = [[siksang, cnt[siksang]], [jaeseong, cnt[jaeseong]], [gwanseong, cnt[gwanseong]]];
      candidates.sort((a, b) => a[1] - b[1]);
      elem = candidates[0][0];
      reason = '일간의 힘이 강한 편이라 기운을 덜어내는 쪽(식상·재성·관성) 중 원국에 부족한 오행이 용신이 됩니다.';
    } else {
      // 중화: 가장 부족한 오행 보충
      let min = 0;
      for (let i = 1; i < 5; i++) if (cnt[i] < cnt[min]) min = i;
      elem = min;
      reason = '오행이 비교적 균형을 이루고 있어, 원국에서 가장 부족한 오행을 보충하는 방향이 좋습니다.';
    }
    const huisin = (elem + 4) % 5;  // 용신을 생하는 오행
    const gisin = (elem + 3) % 5;   // 용신을 극하는 오행
    return { elem, huisin, gisin, reason };
  }

  /* ---------- 지지 관계 (합·충) ---------- */
  const YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  function branchRelation(b1, b2) {
    if ((b1 + 6) % 12 === b2) return '충(沖)';
    if (YUKHAP[b1] === b2) return '합(合)';
    if (b1 % 4 === b2 % 4 && b1 !== b2) return '삼합(三合)';
    return null;
  }

  /* ---------- 운세 (년/월/일 공통 로직) ---------- */
  function fortuneOf(p, ganzhi, ys) {
    const god = tenGodOfStem(p.day.stem, ganzhi.stem);
    const branchGod = tenGodOfBranch(p.day.stem, ganzhi.branch);
    const rel = branchRelation(p.day.branch, ganzhi.branch);
    const elem = M.STEM_ELEM[ganzhi.stem];
    const isYong = elem === ys.elem || elem === ys.huisin;
    const isGi = elem === ys.gisin;
    let score = 60;
    if (isYong) score += 20;
    if (isGi) score -= 15;
    if (rel === '합(合)') score += 8;
    if (rel === '삼합(三合)') score += 5;
    if (rel === '충(沖)') score -= 12;
    score = Math.max(30, Math.min(98, score));
    return { ganzhi, god, branchGod, rel, isYong, isGi, score };
  }

  /* ---------- 분야별 운세 (재물/애정/건강/직업) ---------- */
  const DOMAINS = {
    money: { name: '재물운', icon: '💰' },
    love: { name: '애정운', icon: '💘' },
    health: { name: '건강운', icon: '🩺' },
    career: { name: '직업운', icon: '💼' }
  };
  function domainFortune(p, ys, ganzhi, domain) {
    const base = fortuneOf(p, ganzhi, ys);
    const god = base.god, bGod = base.branchGod;
    let adj = 0;
    if (domain === 'money') {
      if (god === '편재' || god === '정재' || bGod === '편재' || bGod === '정재') adj += 10;
      if (god === '겁재' || bGod === '겁재') adj -= 10;
      if (god === '식신' || god === '상관') adj += 5;
    } else if (domain === 'love') {
      const spouse = p.input.gender === 'M' ? ['편재', '정재'] : ['편관', '정관'];
      if (spouse.includes(god) || spouse.includes(bGod)) adj += 10;
      if (sinsalOf(p.year.branch, ganzhi.branch) === '년살(도화)') adj += 6;
    } else if (domain === 'health') {
      if (base.rel === '충(沖)') adj -= 6;
      if (god === '편관') adj -= 6;
      if (god === '식신') adj += 6;
    } else if (domain === 'career') {
      if (god === '정관' || bGod === '정관') adj += 10;
      if (god === '편관') adj += 6;
      if (god === '정인') adj += 8;
      if (god === '상관') adj -= 8;
    }
    const score = Math.max(20, Math.min(99, base.score + adj));
    return { ...base, score, domain };
  }
  function starsOf(score) {
    return score >= 85 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : score >= 45 ? 2 : 1;
  }

  /* ---------- 행운 정보 (용신 오행 기반) ---------- */
  const LUCKY = [
    { color: '청색·초록색', nums: [3, 8], dir: '동쪽', food: '나물·샐러드 등 신선한 채소 요리', item: '작은 화분이나 원목 소품' },
    { color: '빨간색·주황색', nums: [2, 7], dir: '남쪽', food: '따뜻한 국물 요리, 매콤한 음식', item: '캔들·조명 등 빛을 내는 물건' },
    { color: '노란색·베이지색', nums: [5, 10], dir: '남서쪽·북동쪽', food: '곡물밥·고구마 등 든든한 곡물류', item: '도자기 소품이나 노트' },
    { color: '흰색·은색', nums: [4, 9], dir: '서쪽', food: '견과류, 담백한 요리', item: '금속 액세서리나 시계' },
    { color: '검정색·남색', nums: [1, 6], dir: '북쪽', food: '생선·해조류 등 해산물', item: '수분 관련 소품(텀블러 등)' }
  ];

  /* ---------- 로또 (재미 요소, 결정적 시드) ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function lottoNumbers(p, y, m, d) {
    let seed = p.year.idx * 7 + p.month.idx * 31 + p.day.idx * 131 + (p.time ? p.time.idx * 17 : 0)
      + y * 372 + m * 31 + d;
    const rnd = mulberry32(seed);
    const set = new Set();
    while (set.size < 6) set.add(1 + Math.floor(rnd() * 45));
    return [...set].sort((a, b) => a - b);
  }

  global.Analysis = {
    TEN_GODS, tenGodOfStem, tenGodOfBranch, twelveStage, gongmang, napeum,
    sinsalOf, specialStars, elementCount, strength, yongsin,
    branchRelation, fortuneOf, LUCKY, lottoNumbers,
    DOMAINS, domainFortune, starsOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
