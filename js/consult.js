/* =========================================================
 * consult.js — AI 사주 상담 엔진 (규칙 기반, 결정적)
 * 질문 → 카테고리 판별 → 원국·대운·세운·월운 종합 → 상담 답변 조립
 * ========================================================= */
(function (global) {
  'use strict';
  const M = global.Manse, AN = global.Analysis, T = global.Texts;

  const GROUP_OF = { '비견': '비겁', '겁재': '비겁', '식신': '식상', '상관': '식상', '편재': '재성', '정재': '재성', '편관': '관성', '정관': '관성', '편인': '인성', '정인': '인성' };

  /* ---------- 상담 카테고리 ---------- */
  const CATEGORIES = {
    resign: {
      name: '퇴사·이직', icon: '🚪', risk: 'mid',
      keywords: ['퇴사', '이직', '회사를 옮', '회사 옮', '그만두', '그만둘', '때려치'],
      groups: ['식상', '비겁'],
      high: '원국에 식상·비겁의 기운이 살아 있어, 조직 밖에서도 스스로 길을 만들 수 있는 자립형 구조입니다.',
      low: '원국은 관성·인성 중심이라 조직 안에서 인정받을 때 더 안정되는 구조입니다. 옮기더라도 소속이 있는 형태가 유리합니다.',
      advice: ['옮기기 전에 이직처 또는 6개월치 생활비를 먼저 확보하세요.', '충동적 사직서보다 "준비된 이동"이 이 사주의 승리 공식입니다.'],
      verdict: g => g ? '지금의 답답함은 성장 신호일 수 있습니다. 방향은 맞으니 시기를 고르는 것이 핵심입니다.' : '떠나는 것 자체보다 "어디로, 무엇을 준비해서"가 훨씬 중요한 시기입니다.'
    },
    startup: {
      name: '창업·사업', icon: '🏪', risk: 'high',
      keywords: ['창업', '사업', '개업', '장사', '가게', '자영업', '프랜차이즈', '유튜브', '쇼핑몰', '스마트스토어'],
      groups: ['식상', '재성'],
      high: '식상(만드는 힘)과 재성(돈의 감각)이 원국에 자리해, 자기 재주를 수익으로 바꾸는 창업형 구조입니다.',
      low: '식상·재성이 뚜렷하지 않아 단독 창업보다는 검증된 모델, 또는 파트너와 역할을 나누는 방식이 안전합니다.',
      advice: ['처음부터 크게 벌이기보다 작게 시작해 검증 후 확장하세요.', '동업 시 지분·역할을 반드시 문서로 남기세요(비겁 운에는 특히).'],
      verdict: g => g ? '준비 기간을 거친 시작이라면 도전할 만한 흐름입니다.' : '지금은 판을 벌이기보다 실력과 자금을 쌓는 준비기로 쓰는 편이 좋습니다.'
    },
    invest: {
      name: '투자·재테크', icon: '📈', risk: 'high',
      keywords: ['투자', '주식', '코인', '비트코인', '재테크', '펀드', 'ETF', '적금'],
      groups: ['재성'],
      high: '재성이 자리해 돈의 흐름을 읽는 감각은 타고난 편입니다. 다만 감각과 절제는 별개임을 기억하세요.',
      low: '재성이 뚜렷하지 않아 시세를 좇는 단기 매매보다 적립식·장기 투자가 체질에 맞습니다.',
      advice: ['총자산의 일정 비율(예: 20~30%) 상한선을 정해 두고 지키세요.', '빚내서 하는 투자(레버리지)는 이 사주에서 가장 피해야 할 형태입니다.'],
      verdict: g => g ? '기회가 보이는 흐름이나, 수익보다 "잃지 않는 규칙"을 먼저 세우세요.' : '지금은 공격적 투자보다 지키는 재테크가 맞는 흐름입니다.'
    },
    estate: {
      name: '부동산·이사', icon: '🏠', risk: 'mid',
      keywords: ['집을 사', '집 사', '부동산', '아파트', '전세', '매매', '이사', '청약', '분양'],
      groups: ['재성', '인성'],
      high: '재성(자산)과 인성(문서)의 기운이 있어 부동산 계약과 인연이 나쁘지 않은 구조입니다.',
      low: '문서운이 약한 편이라 계약 조건·등기·특약을 평소보다 두 배로 꼼꼼히 확인해야 합니다.',
      advice: ['감당 가능한 대출 상한을 먼저 정하고 매물을 보세요(순서가 반대면 위험합니다).', '계약서는 하루 묵혀 다시 읽고, 전문가 검토를 거치세요.'],
      verdict: g => g ? '실거주 목적이라면 조건이 맞을 때 진행해도 좋은 흐름입니다.' : '서두를수록 불리한 흐름이니, 시세보다 조건(위치·대출·계약)을 기준으로 판단하세요.'
    },
    love: {
      name: '연애·인연', icon: '💘',
      keywords: ['연애', '소개팅', '썸', '고백', '만나도 될', '만나볼', '헤어', '재회', '짝사랑'],
      groups: [], // 성별에 따라 동적으로
      high: '배우자의 별이 원국에 자리해 인연의 흐름이 자연스러운 편입니다.',
      low: '배우자의 별이 뚜렷하지 않은 만큼, 조급함보다 자연스러운 만남의 자리를 늘리는 것이 좋습니다.',
      advice: ['상대의 조건보다 "함께 있을 때 내 기운이 편한지"를 기준으로 보세요.', '도화·역마가 움직이는 달에는 새로운 만남의 기회가 늘어납니다.'],
      verdict: g => g ? '마음이 움직인다면 피하지 마세요. 인연은 흐름이 왔을 때 잡는 것입니다.' : '지금은 서두르기보다 나를 가꾸는 시간이 다음 인연의 질을 높여줍니다.'
    },
    marriage: {
      name: '결혼', icon: '💍',
      keywords: ['결혼', '혼인', '프로포즈', '상견례', '혼수'],
      groups: [],
      high: '배우자의 별이 자리해 결혼 후 안정을 찾아가는 구조입니다.',
      low: '배우자의 별이 뚜렷하지 않아, 결혼 시기보다 "맞는 사람인지"의 확신이 더 중요한 사주입니다.',
      advice: ['결혼은 사주보다 대화가 결정합니다 — 돈·가족·일에 대한 가치관을 미리 맞춰보세요.', '두 사람의 궁합 풀이(아래 궁합 메뉴)를 함께 참고하세요.'],
      verdict: g => g ? '흐름이 받쳐주는 시기이니, 확신이 선다면 진행해도 좋습니다.' : '시기를 늦추라는 뜻이 아니라, 준비와 확신을 먼저 채우라는 흐름입니다.'
    },
    exam: {
      name: '시험·공부', icon: '📚',
      keywords: ['시험', '공부', '자격증', '합격', '수능', '고시', '공무원', '대학원'],
      groups: ['인성'],
      high: '인성(학문·문서)의 기운이 자리해 배움이 결실로 이어지기 좋은 구조입니다.',
      low: '인성이 뚜렷하지 않아 벼락치기보다 짧게라도 매일 반복하는 방식이 성과를 만듭니다.',
      advice: ['정인·정관운이 드는 달에 시험 일정을 맞추면 유리합니다.', '컨디션 관리(수면)가 이 사주 합격 운의 절반입니다.'],
      verdict: g => g ? '문서운이 도와주는 흐름이니 목표를 명확히 하고 밀어붙이세요.' : '흐름이 약해도 준비량은 배신하지 않습니다. 기간을 넉넉히 잡으세요.'
    },
    job: {
      name: '취업·승진', icon: '💼',
      keywords: ['취업', '입사', '면접', '승진', '발령', '연봉'],
      groups: ['관성', '인성'],
      high: '관성(조직·직위)의 기운이 자리해 조직 안에서 인정받는 구조입니다.',
      low: '관성이 뚜렷하지 않아 대규모 조직보다 자율성이 큰 곳에서 능력이 더 빛납니다.',
      advice: ['정관·정인운의 달에 지원·면접 일정을 집중하세요.', '이력서에는 성과를 숫자로 적으세요 — 재성의 언어가 관성을 움직입니다.'],
      verdict: g => g ? '공적인 인정이 따르는 흐름이니 적극적으로 지원하세요.' : '문이 좁게 느껴져도 준비된 사람에게 기회는 옵니다. 지원 폭을 넓히세요.'
    },
    health: {
      name: '건강', icon: '🩺',
      keywords: ['건강', '몸이', '아프', '병원', '수술', '다이어트'],
      groups: ['비겁'],
      high: '일간의 뿌리가 있는 편이라 기본 체력은 받쳐주는 구조입니다.',
      low: '일간이 약한 편이라 무리가 누적되면 한 번에 무너질 수 있습니다. 회복 시간을 아끼지 마세요.',
      advice: ['원국에서 과다·부족한 오행의 장부(위 건강운 참고)를 정기 검진으로 챙기세요.', '충(沖)이 드는 달에는 무리한 일정과 야간 운전은 피하세요.'],
      verdict: () => '건강은 운보다 습관이 우선입니다. 아래 시기 풀이는 "더 조심할 때"의 참고로만 쓰세요.'
    },
    money: {
      name: '금전 일반', icon: '💰',
      keywords: ['돈', '적자', '월급', '용돈', '재물', '저축'],
      groups: ['재성', '식상'],
      high: '재성·식상의 기운이 있어 벌어들이는 구조 자체는 갖춰져 있습니다. 관리가 관건입니다.',
      low: '재성이 뚜렷하지 않아 "버는 재주"보다 "지키는 규칙"이 재물운의 핵심입니다.',
      advice: ['수입의 일정 비율 자동 저축부터 시작하세요.', '보증·명의 대여는 어떤 운에서도 피해야 합니다.'],
      verdict: g => g ? '돈이 움직이는 흐름이니 들어올 때 저축 비율을 늘리세요.' : '큰돈보다 새는 돈을 막는 것이 지금의 최고 전략입니다.'
    },
    loan: {
      name: '대출·부채', icon: '🏦', risk: 'high',
      keywords: ['대출', '빚', '융자', '마이너스 통장', '마이너스통장', '할부', '카드론'],
      groups: ['재성'],
      high: '재성이 자리해 돈을 굴리는 감각은 있는 편입니다. 다만 대출은 "버는 능력"이 아니라 "갚는 구조"의 문제입니다.',
      low: '재성이 뚜렷하지 않아 현금 흐름의 기복이 생기기 쉬운 구조입니다. 상환 계획 없는 대출은 특히 위험합니다.',
      advice: ['월 상환액이 월 수입의 30%를 넘지 않는 선을 지키세요.', '금리 인상·수입 공백 시나리오까지 계산한 뒤 결정하세요.'],
      verdict: g => g ? '감당 범위 안이라면 가능하지만, 지금은 현금흐름 안정성부터 점검하고 접근하는 것이 좋습니다.' : '지금 흐름에서는 대출 규모를 줄이거나 시기를 늦추는 편이 안전합니다.'
    },
    car: {
      name: '자동차', icon: '🚗', risk: 'mid',
      keywords: ['차 사도', '차사도', '자동차', '차량', '중고차', '신차', '차를 바꾸'],
      groups: ['재성'],
      high: '재성의 기운이 있어 큰 지출을 감당할 그릇은 갖춰져 있습니다. 문제는 시기와 유지비입니다.',
      low: '재성이 뚜렷하지 않아 차량은 "자산"이 아니라 "지출"임을 더 냉정하게 봐야 하는 사주입니다.',
      advice: ['차량 가격보다 5년 유지비(보험·세금·연료)를 먼저 계산하세요.', '충(沖)이 드는 달의 계약·인수는 피하고, 일지와 합이 드는 날로 잡으세요(아래 택일 참고).'],
      verdict: g => g ? '필요가 분명하다면 진행해도 좋은 흐름입니다. 인수일은 택일 메뉴로 골라보세요.' : '갖고 싶은 마음과 필요를 구분해 보세요. 흐름상 서두를 이유는 없습니다.'
    },
    family: {
      name: '가족', icon: '👨‍👩‍👧', risk: 'low',
      keywords: ['가족', '부모', '어머니', '아버지', '자녀', '아이', '형제', '자매', '시댁', '처가', '효도'],
      groups: ['인성'],
      high: '인성(부모·보살핌의 별)이 자리해 가족과의 정서적 연결이 깊은 사주입니다.',
      low: '인성이 뚜렷하지 않아 가족에게 받는 것보다 주는 역할이 많았을 수 있습니다. 그만큼 단단해진 사주입니다.',
      advice: ['가족 문제는 운보다 대화의 총량이 결정합니다. 정기적인 안부의 날을 정해보세요.', '금전이 얽힌 가족 문제는 감정과 분리해 문서로 정리하세요.'],
      verdict: () => '가족운은 끊고 맺는 운이 아니라 가꾸는 운입니다. 아래 시기 조언은 "더 살필 때"의 참고로 쓰세요.'
    },
    abroad: {
      name: '유학·해외', icon: '✈️', risk: 'mid',
      keywords: ['유학', '해외', '이민', '워킹홀리데이', '어학연수', '해외취업', '외국'],
      groups: ['인성', '식상'],
      high: '배움(인성)과 도전(식상)의 기운이 있어 낯선 환경에서 성장하는 유형입니다.',
      low: '뿌리내리는 기운이 강한 사주라, 해외행은 목적(학위·커리어)을 뾰족하게 정할수록 성공합니다.',
      advice: ['역마의 기운이 움직이는 해(신·자·진·인·오·술년 등 사주별 상이)에 이동운이 커집니다.', '떠나기 전 재정 계획을 현지 물가 기준 1.5배로 잡으세요.'],
      verdict: g => g ? '이동의 기운이 받쳐주는 흐름입니다. 준비된 유학·해외행이라면 좋은 선택입니다.' : '가는 것 자체보다 "다녀와서 무엇이 될지"를 먼저 그리고 움직이세요.'
    },
    travel: {
      name: '여행', icon: '🧳', risk: 'low',
      keywords: ['여행', '휴가', '휴양', '캠핑'],
      groups: [],
      high: '', low: '',
      advice: ['충(沖)이 드는 날의 장거리 운전은 피하고, 일지와 합이 드는 날 출발하면 좋습니다.', '용신 방향(행운 정보 참고)의 여행지가 기운을 살립니다.'],
      verdict: () => '여행은 언제나 좋은 보약입니다. 아래 시기 중 흐름 좋은 달을 고르면 더 좋습니다.'
    },
    lawsuit: {
      name: '소송·분쟁', icon: '⚖️', risk: 'high',
      keywords: ['소송', '고소', '재판', '법적', '분쟁', '합의', '변호사'],
      groups: ['관성'],
      high: '관성(법과 질서의 별)이 자리해 공적 절차에서 크게 불리하지 않은 구조입니다.',
      low: '관성이 뚜렷하지 않아 법적 다툼은 길어질수록 소모가 큰 사주입니다. 조기 합의 가능성을 먼저 검토하세요.',
      advice: ['소송은 이겨도 잃는 것이 많습니다. 실익(비용·시간·감정)을 숫자로 계산해 보세요.', '문서운(정인)이 드는 달에 서류 제출·계약 정리를 하면 유리합니다.'],
      verdict: g => g ? '절차를 밟는다면 준비를 철저히 하되, 합의의 문은 끝까지 열어두세요.' : '지금 흐름에서는 정면 대결보다 합의·중재가 실익이 큽니다.'
    },
    people: {
      name: '인간관계', icon: '🤝', risk: 'low',
      keywords: ['인간관계', '친구', '동료', '상사', '사람 때문', '사람들', '왕따', '따돌림', '갈등'],
      groups: ['비겁'],
      high: '비겁(동료의 별)이 자리해 사람이 모이는 사주입니다. 다만 가까울수록 금전 거래는 피해야 합니다.',
      low: '비겁이 적어 넓은 인맥보다 깊은 소수의 관계가 맞는 사주입니다. 관계의 수를 늘리려 애쓰지 마세요.',
      advice: ['천을귀인이 드는 해(위 천기누설 참고)에 만나는 인연을 특히 소중히 하세요.', '서운함은 3일 안에 말로 푸는 것을 원칙으로 삼으세요.'],
      verdict: () => '관계의 운은 결국 경계선 긋기입니다. 좋은 사람에게 더 주고, 소모적인 관계는 정리할 때입니다.'
    },
    general: {
      name: '종합 운세', icon: '🔮',
      keywords: [],
      groups: [],
      high: '', low: '',
      advice: ['용신 오행의 활동(위 천기누설 참고)을 생활에 자주 들이세요.'],
      verdict: () => '전반적인 흐름을 아래에 정리했습니다. 구체적인 고민(돈·직장·연애 등)으로 물으시면 더 깊게 풀어드립니다.'
    }
  };

  /* 민감 주제는 전문가 상담 안내를 함께 붙인다 */
  const PRO_NOTE = {
    health: '건강 이상 신호가 있다면 사주보다 병원 진료가 먼저입니다.',
    lawsuit: '실제 법적 대응은 반드시 변호사 등 법률 전문가와 상의하세요.',
    loan: '규모가 큰 재정 결정은 금융 전문가 상담을 함께 받으시길 권합니다.',
    invest: '투자 손실은 누구도 보장하지 못합니다. 재정 전문가의 조언을 함께 참고하세요.',
    estate: '계약 전 등기부·대출 조건은 공인중개사·법무사 확인을 거치세요.'
  };

  function detectCategory(q) {
    for (const [key, c] of Object.entries(CATEGORIES)) {
      if (c.keywords.some(k => q.includes(k))) return key;
    }
    return 'general';
  }

  /* ---------- 월운 12개월 스캔 ---------- */
  function monthlyScan(p, ys, baseY, baseM) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const total = (baseM - 1 + i);
      const y = baseY + Math.floor(total / 12), m = (total % 12) + 1;
      const g = M.dateGanzhi(y, m, 15);
      const f = AN.fortuneOf(p, g.month, ys);
      out.push({ y, m, score: f.score, god: f.god, rel: f.rel });
    }
    return out;
  }
  function fmtMonths(list) {
    return list.map(x => `${x.y !== list[0].y || true ? '' : ''}${x.m}월(${x.y})`).join(', ');
  }

  /* ---------- 위험도 점검 (고위험 질문용) ---------- */
  function assessRisk(saju, baseDate) {
    const { p, str, ys } = saju;
    const g = groupCounts(p);
    const factors = [];
    // 겁재(손재수의 별)
    const ds = p.day.stem;
    const stems = [p.year.stem, p.month.stem].concat(p.time ? [p.time.stem] : []);
    const branches = [p.year.branch, p.month.branch, p.day.branch].concat(p.time ? [p.time.branch] : []);
    const geopjae = stems.filter(s => AN.tenGodOfStem(ds, s) === '겁재').length
      + branches.filter(b => AN.tenGodOfBranch(ds, b) === '겁재').length;
    if (geopjae >= 1) factors.push('원국에 겁재(새는 돈·손재수의 별)가 있어 큰돈 거래에서 분산 관리가 필요합니다.');
    if (g['재성'] >= 3 && str.grade === '신약') factors.push('재다신약 구조라 감당 범위를 넘는 돈은 오히려 부담이 됩니다.');
    // 올해 세운
    const yg = M.dateGanzhi(baseDate.y, 6, 15).year;
    const fy = AN.fortuneOf(p, yg, ys);
    if (fy.isGi) factors.push(`올해 세운(${yg.ko})에 기신의 기운이 섞여 확장보다 방어가 유리합니다.`);
    if (fy.rel === '충(沖)') factors.push('올해는 일지와 충하는 해라 예상 밖의 변동 비용이 생기기 쉽습니다.');
    if (fy.god === '겁재' || fy.god === '편재') factors.push(`올해가 ${fy.god}운이라 돈이 크게 들고나는 해입니다. 통장을 목적별로 분리하세요.`);
    const level = factors.length >= 3 ? '높음' : factors.length >= 1 ? '중간' : '낮음';
    return { factors, level };
  }

  /* ---------- 세션 내 질문 기억 ---------- */
  let history = [];
  function resetHistory() { history = []; }
  function bridgeText(catKey, cat) {
    if (!history.length) return '';
    const last = history[history.length - 1];
    if (last.catKey === catKey) {
      return `<p class="muted">이어서 ${cat.name} 고민을 보고 계시는군요. 결론의 뼈대는 같으니, 이번에는 실행 관점을 조금 더 보탰습니다.</p>`;
    }
    const lastCat = CATEGORIES[last.catKey];
    return `<p class="muted">앞서 ${lastCat.name}을(를) 고민하셨지요. 그 흐름을 기억한 상태에서, 이번에는 ${cat.name} 관점으로 이어서 풀어드립니다.</p>`;
  }

  /* ---------- 답변 조립 ---------- */
  function answer(saju, question, baseDate) {
    const { p, str, ys, du } = saju;
    const catKey = detectCategory(question);
    const cat = CATEGORIES[catKey];
    const baseY = baseDate.y, baseM = baseDate.m;

    // 1) 원국 적성
    const g = groupCounts(p);
    let groups = cat.groups.slice();
    if (catKey === 'love' || catKey === 'marriage') groups = [p.input.gender === 'M' ? '재성' : '관성'];
    const groupSum = groups.reduce((a, gr) => a + (g[gr] || 0), 0);
    const hasAptitude = groups.length === 0 ? true : groupSum >= 2;
    const aptText = groups.length ? (hasAptitude ? cat.high : cat.low) : '';

    // 2) 대운
    const curAge = baseY - p.input.y + 1;
    const cur = du.list.find(x => curAge >= x.fromAge && curAge <= x.toAge);
    let daeunText = '';
    let daeunGood = null;
    if (cur) {
      const e = M.STEM_ELEM[cur.pillar.stem];
      const god = AN.tenGodOfStem(p.day.stem, cur.pillar.stem);
      daeunGood = e === ys.elem || e === ys.huisin ? true : e === ys.gisin ? false : null;
      const flow = daeunGood === true ? '용신의 기운이 들어와 큰 흐름이 도전을 뒷받침해 주는 시기'
        : daeunGood === false ? '기신의 기운이 섞여 무리한 확장보다 내실이 유리한 시기'
          : '크게 밀지도 막지도 않는, 하기 나름의 시기';
      daeunText = `현재 대운은 ${cur.pillar.ko}(${cur.fromAge}~${cur.toAge}세) ${god} 대운으로, ${flow}입니다. ${GROUP_OF[god] === '식상' || GROUP_OF[god] === '비겁' ? '변화·독립의 기운이 강하게 흐르는 대운이기도 합니다.' : GROUP_OF[god] === '관성' ? '책임과 소속의 기운이 강한 대운이기도 합니다.' : GROUP_OF[god] === '재성' ? '돈과 활동의 기운이 커지는 대운이기도 합니다.' : '배움과 재정비의 기운이 흐르는 대운이기도 합니다.'}`;
    }

    // 3) 세운
    const yg = M.dateGanzhi(baseY, 6, 15).year;
    const fy = AN.fortuneOf(p, yg, ys);
    const seunText = `올해(${baseY}년, ${yg.ko}년)는 ${fy.god}운으로 ${T.TEN_GOD_FORTUNE[fy.god]}` +
      (fy.rel === '충(沖)' ? ' 특히 일지와 충하는 해라 큰 변동은 두 번 검토가 필요합니다.' : '');

    // 4) 월별 타이밍
    const months = monthlyScan(p, ys, baseY, baseM);
    const sorted = [...months].sort((a, b) => b.score - a.score);
    const best = sorted.slice(0, 3).sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m));
    const worst = months.filter(x => x.score < 50);
    let timing = `앞으로 1년 중 흐름이 좋은 달은 <b>${best.map(x => `${x.y}년 ${x.m}월(${x.god})`).join(', ')}</b>입니다.`;
    if (worst.length) {
      timing += ` 반면 <b>${worst.map(x => `${x.y}년 ${x.m}월`).join(', ')}</b>은 기복이 있어, 이 시기의 결정·계약은 검토를 두 번 거치는 편이 좋습니다.`;
    } else {
      timing += ' 크게 꺼릴 달은 보이지 않는 무난한 1년입니다.';
    }

    // 5) 위험도 점검 (돈·법 관련 고위험 질문)
    const risk = (cat.risk === 'high' || cat.risk === 'mid') ? assessRisk(saju, baseDate) : null;
    const riskHtml = risk ? `
        <h3>⚠️ 위험도 점검 — ${risk.level}</h3>
        ${risk.factors.length
        ? `<ul class="consult-tips">${risk.factors.map(f => `<li>${f}</li>`).join('')}</ul>`
        : '<p>사주 구조와 올해 흐름상 특별히 겹치는 위험 요인은 보이지 않습니다. 기본 원칙만 지키면 됩니다.</p>'}` : '';

    // 6) 결론 (위험도 높으면 보수적 결론으로 강제)
    const overallGood = (daeunGood !== false) && (fy.score >= 55) && hasAptitude && !(risk && risk.level === '높음');
    let verdict = cat.verdict(overallGood);
    if (risk && risk.level === '높음') verdict += ' 지금은 "가능 여부"보다 "안전장치"를 먼저 마련할 때입니다.';

    // 7) 판단 근거 (원국/대운/세운/월운의 기여도를 그대로 공개)
    const avgMonth = Math.round(months.reduce((a, x) => a + x.score, 0) / months.length);
    const evi = [
      {
        name: '원국 (타고난 구조)',
        stars: groups.length === 0 ? 3 : Math.max(1, Math.min(5, groupSum + 1)),
        why: groups.length === 0 ? '이 질문은 특정 십신보다 전체 흐름으로 판단합니다.'
          : `${cat.name} 관련 십신(${groups.join('·')})이 원국에 ${groupSum}개 → ${hasAptitude ? '뒷받침됨' : '약함'}`
      },
      {
        name: '대운 (10년 흐름)',
        stars: daeunGood === true ? 5 : daeunGood === false ? 2 : 3,
        why: cur ? `${cur.pillar.ko} 대운 ${AN.tenGodOfStem(p.day.stem, cur.pillar.stem)} → ${daeunGood === true ? '용신·희신 (순풍)' : daeunGood === false ? '기신 (역풍, 보수적으로)' : '중립'}` : '대운 정보 없음'
      },
      {
        name: '세운 (올해)',
        stars: AN.starsOf(fy.score),
        why: `${yg.ko}년 ${fy.god}운, ${fy.score}점${fy.rel ? ` · 일지와 ${fy.rel}` : ''}`
      },
      {
        name: '월운 (12개월)',
        stars: AN.starsOf(avgMonth),
        why: `평균 ${avgMonth}점 · 최고 ${best.map(x => x.m + '월').join('·')} / 주의 ${worst.length ? worst.map(x => x.m + '월').join('·') : '없음'}`
      }
    ];
    const chain = [
      cur ? `대운 ${AN.tenGodOfStem(p.day.stem, cur.pillar.stem)}${daeunGood === false ? '(기신)' : daeunGood === true ? '(용신)' : ''}` : null,
      `세운 ${fy.god} ${fy.score}점`,
      `월운 평균 ${avgMonth}점`,
      risk ? `위험 요인 ${risk.factors.length}건` : null,
      `${overallGood ? '긍정적' : '보수적'} 판단`
    ].filter(Boolean).join(' → ');
    const starHtml = n => `<span class="w-stars">${'★'.repeat(n)}<span class="dim">${'★'.repeat(5 - n)}</span></span>`;
    const evidenceHtml = `
      <details class="evidence">
        <summary>🔍 왜 이렇게 판단했나요? (판단 근거 보기)</summary>
        <div class="widget-grid">
          ${evi.map(e => `<div class="w-row"><span>${e.name}<br><small class="muted">${e.why}</small></span>${starHtml(e.stars)}</div>`).join('')}
        </div>
        <p class="muted evi-chain">${chain}</p>
      </details>`;

    const bridge = bridgeText(catKey, cat);
    history.push({ catKey, q: question });

    return {
      category: cat, catKey, risk,
      html: `
        <p class="consult-q">Q. ${escapeHtml(question)}</p>
        ${bridge}
        <p><b>${cat.icon} ${cat.name}</b> 관점에서 사주 전체를 종합해 말씀드립니다.</p>
        ${aptText ? `<h3>타고난 구조</h3><p>${aptText} (일간 ${M.STEMS[p.day.stem]}${M.ELEMENTS[M.STEM_ELEM[p.day.stem]][0]} · ${str.grade})</p>` : ''}
        <h3>큰 흐름 (대운)</h3><p>${daeunText}</p>
        <h3>올해의 흐름 (세운)</h3><p>${seunText}</p>
        <h3>시기 조언 (월운 12개월)</h3><p>${timing}</p>
        ${riskHtml}
        <h3>정리하면</h3><p><b>${verdict}</b></p>
        <ul class="consult-tips">${cat.advice.map(a => `<li>${a}</li>`).join('')}</ul>
        ${evidenceHtml}
        <p class="muted">※ 위 상담은 명리학적 흐름 해석에 따른 참고 조언이며, 최종 결정은 현실 조건과 본인의 판단이 우선입니다.${PRO_NOTE[catKey] ? ' ' + PRO_NOTE[catKey] : ''}</p>`
    };
  }

  function groupCounts(p) {
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

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 카테고리 버튼용 프리셋 질문
  const PRESETS = [
    ['💰 돈', '올해 금전 흐름은 어떤가요? 돈 관리 어떻게 할까요?'],
    ['💼 직장', '지금 회사에서 승진이나 취업 흐름이 어떤가요?'],
    ['🚪 이직', '퇴사하고 이직해도 될까요?'],
    ['🏪 사업', '창업해도 될까요?'],
    ['📈 투자', '지금 투자해도 괜찮을까요?'],
    ['💘 연애', '연애운은 언제 들어오나요?'],
    ['💍 결혼', '결혼하면 행복할까요?'],
    ['🏠 부동산', '집을 사도 될까요? 이사 가도 될까요?'],
    ['📚 시험', '시험 합격할 수 있을까요?'],
    ['🩺 건강', '건강에서 조심할 점이 있나요?'],
    ['🏦 대출', '대출받아도 될까요?'],
    ['🤝 인간관계', '인간관계 고민이 있어요. 어떻게 풀어야 할까요?']
  ];

  global.Consult = { answer, detectCategory, monthlyScan, PRESETS, CATEGORIES, assessRisk, resetHistory };
})(typeof window !== 'undefined' ? window : globalThis);
