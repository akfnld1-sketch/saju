/* =========================================================
 * gunghap.js — 궁합 분석 (두 사주 비교, 결정적)
 * ========================================================= */
(function (global) {
  'use strict';
  const M = global.Manse, AN = global.Analysis;

  // 천간합: 갑기 을경 병신 정임 무계
  function stemHap(s1, s2) { return (Math.abs(s1 - s2) === 5); }
  // 원진: 자미 축오 인유 묘신 진해 사술
  const WONJIN = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 9, 9: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };

  function branchRel(b1, b2) {
    if ((b1 + 6) % 12 === b2) return '충';
    if ({ 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }[b1] === b2) return '육합';
    if (b1 % 4 === b2 % 4 && b1 !== b2) return '삼합';
    if (WONJIN[b1] === b2) return '원진';
    return null;
  }

  /* 상대 일간이 나에게 어떤 십신인지에 따른 관계 성격 */
  const REL_BY_GROUP = {
    '비겁': '친구 같은 관계입니다. 서로를 잘 이해하지만 양보와 경쟁의 경계를 정해야 오래갑니다.',
    '식상': '내가 아껴주고 표현하게 되는 관계입니다. 함께 있으면 활력이 생기지만 잔소리가 되지 않게 주의하세요.',
    '재성': '내가 주도하고 책임지게 되는 관계입니다. 챙겨주는 만큼 존중을 받아야 균형이 맞습니다.',
    '관성': '상대가 나를 이끌고 긴장하게 만드는 관계입니다. 배울 것이 많지만 눌리는 느낌은 대화로 풀어야 합니다.',
    '인성': '상대가 나를 품어주고 채워주는 관계입니다. 편안하지만 의존이 깊어지지 않게 각자의 영역을 지키세요.'
  };
  const GROUP_OF = { '비견': '비겁', '겁재': '비겁', '식신': '식상', '상관': '식상', '편재': '재성', '정재': '재성', '편관': '관성', '정관': '관성', '편인': '인성', '정인': '인성' };

  function analyze(p1, p2, type) {
    const items = [];
    let score = 0;

    /* 1) 일간 관계 (30) */
    const s1 = p1.day.stem, s2 = p2.day.stem;
    const god = AN.tenGodOfStem(s1, s2);
    const group = GROUP_OF[god];
    const e1 = M.STEM_ELEM[s1], e2 = M.STEM_ELEM[s2];
    let stemPts, stemDesc;
    if (stemHap(s1, s2)) {
      stemPts = 30; stemDesc = `두 사람의 일간 ${M.STEMS[s1]}과 ${M.STEMS[s2]}은 천간합(合)을 이루는 최상의 조합입니다. 서로에게 자연스럽게 끌리고 부족함을 메워주는 인연입니다.`;
    } else if ((e1 + 1) % 5 === e2 || (e2 + 1) % 5 === e1) {
      stemPts = 24; stemDesc = `일간 오행이 서로 생(生)해주는 관계라 함께 있을수록 기운이 살아나는 조합입니다.`;
    } else if (e1 === e2) {
      stemPts = 18; stemDesc = `일간 오행이 같아 서로를 깊이 이해하는 친구 같은 조합입니다. 다만 닮은 만큼 양보가 과제입니다.`;
    } else {
      stemPts = 12; stemDesc = `일간 오행이 극(剋)의 관계라 긴장감이 있는 조합입니다. 긴장은 자극이 되기도 하니 표현 방식이 관건입니다.`;
    }
    score += stemPts;
    items.push({ title: '일간 궁합 (마음의 합)', pts: stemPts, max: 30, desc: stemDesc + ' ' + REL_BY_GROUP[group] });

    /* 2) 일지 관계 (25) — 배우자궁 */
    const rel = branchRel(p1.day.branch, p2.day.branch);
    const relMap = {
      '육합': [25, '일지(배우자궁)가 육합을 이뤄 생활 속 호흡이 잘 맞는, 함께 살수록 좋아지는 궁합입니다.'],
      '삼합': [22, '일지가 삼합의 기운으로 통해 목표와 생활 리듬이 잘 맞는 궁합입니다.'],
      '충': [8, '일지가 충(沖)하여 생활 습관·속도가 부딪히기 쉽습니다. 각자의 공간과 규칙을 정하면 충은 오히려 활력이 됩니다.'],
      '원진': [6, '일지가 원진(怨嗔) 관계라 이유 없이 서운해지기 쉬운 조합입니다. 오해가 쌓이기 전에 바로 말로 푸는 습관이 필수입니다.']
    };
    const [bPts, bDesc] = rel ? relMap[rel] : [16, '일지가 특별한 합·충 없이 담백하게 만나, 무난하고 평온한 생활 궁합입니다.'];
    score += bPts;
    items.push({ title: '일지 궁합 (생활의 합)', pts: bPts, max: 25, desc: bDesc });

    /* 3) 오행 보완 (25) */
    const c1 = AN.elementCount(p1), c2 = AN.elementCount(p2);
    let comp = 0;
    const compNotes = [];
    for (let i = 0; i < 5; i++) {
      if (c1[i] === 0 && c2[i] >= 2) { comp++; compNotes.push(`나에게 없는 ${M.ELEMENTS[i]}을 상대가 채워줌`); }
      if (c2[i] === 0 && c1[i] >= 2) { comp++; compNotes.push(`상대에게 없는 ${M.ELEMENTS[i]}을 내가 채워줌`); }
    }
    const ePts = Math.min(25, 13 + comp * 6);
    score += ePts;
    items.push({
      title: '오행 보완 (에너지의 합)', pts: ePts, max: 25,
      desc: comp > 0 ? `서로의 빈 오행을 채워주는 상호 보완형입니다 (${compNotes.join(', ')}). 함께할 때 각자보다 강해지는 조합입니다.`
        : '서로의 오행 구성이 비슷한 편입니다. 편안하지만 둘 다 약한 부분은 함께 약하니, 그 영역(예: 재정 관리)은 규칙으로 보완하세요.'
    });

    /* 4) 띠 궁합 (10) */
    const yRel = branchRel(p1.year.branch, p2.year.branch);
    const yMap = { '육합': [10, '띠가 육합'], '삼합': [9, '띠가 삼합'], '충': [4, '띠가 충'], '원진': [3, '띠가 원진'] };
    const [yPts, yTag] = yRel ? yMap[yRel] : [7, '띠가 무난한 관계'];
    score += yPts;
    items.push({
      title: '띠 궁합 (집안·세대의 합)', pts: yPts, max: 10,
      desc: `${M.BRANCH_ANIMALS[p1.year.branch]}띠와 ${M.BRANCH_ANIMALS[p2.year.branch]}띠 — ${yTag}입니다.` +
        (yPts <= 4 ? ' 전통적으로는 꺼리는 조합이지만 일간·일지의 합이 좋으면 충분히 극복되는 요소입니다.' : '')
    });

    /* 5) 용신 지원 (10) */
    const ys1 = AN.yongsin(p1, AN.strength(p1));
    const ys2 = AN.yongsin(p2, AN.strength(p2));
    let yong = 0;
    const yongNotes = [];
    if (e2 === ys1.elem || e2 === ys1.huisin) { yong += 5; yongNotes.push('상대의 기운이 나의 용신·희신'); }
    if (e1 === ys2.elem || e1 === ys2.huisin) { yong += 5; yongNotes.push('나의 기운이 상대의 용신·희신'); }
    score += yong;
    items.push({
      title: '용신 궁합 (귀인의 합)', pts: yong, max: 10,
      desc: yong >= 10 ? '서로가 서로의 용신이 되는 귀한 조합입니다. 함께 있는 것만으로 운이 좋아지는 관계입니다.'
        : yong >= 5 ? `${yongNotes[0]}이 되어 한쪽이 다른 쪽의 귀인 역할을 하는 조합입니다.`
          : '용신 오행이 직접 오가지는 않는 담백한 조합입니다. 대신 노력한 만큼 정직하게 쌓이는 관계입니다.'
    });

    /* 총평 */
    const band = score >= 85 ? ['천생연분급', '오래 함께할수록 빛나는 궁합입니다.']
      : score >= 70 ? ['좋은 궁합', '서로 조금씩만 맞추면 아주 잘 어울리는 조합입니다.']
        : score >= 55 ? ['보통 궁합', '노력이 필요한 부분이 있지만, 관계는 사주보다 대화가 만듭니다.']
          : ['노력형 궁합', '부딪히는 지점이 분명한 만큼, 규칙을 정하면 오히려 단단해질 수 있는 조합입니다.'];

    const conflicts = items.filter(x => x.pts / x.max < 0.5);
    const goods = items.filter(x => x.pts / x.max >= 0.8);

    /* 인연 그래프: 5개 국면 별점 (항목 점수 비율에서 유도) */
    const r = items.map(x => x.pts / x.max); // [일간, 일지, 오행, 띠, 용신]
    const star = v => Math.max(1, Math.min(5, Math.round(v * 5)));
    const aspects = [
      { name: '첫 만남 · 설렘', stars: star(r[0] * 0.7 + r[3] * 0.3) },
      { name: '결혼 · 생활의 합', stars: star(r[1] * 0.6 + r[0] * 0.4) },
      { name: '재물 · 살림의 합', stars: star(r[2] * 0.5 + r[4] * 0.5) },
      { name: '갈등 회복력', stars: star(Math.min(r[1], r[3]) * 0.6 + r[0] * 0.4) },
      { name: '노후 · 동행', stars: star(r[4] * 0.6 + r[2] * 0.4) }
    ];

    return { score, band, items, conflicts, goods, god, type, aspects };
  }

  global.Gunghap = { analyze, branchRel };
})(typeof window !== 'undefined' ? window : globalThis);
