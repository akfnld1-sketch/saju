/* 신규 기능 검증: node test/features.test.js
 * 상담·궁합·택일이 결정적으로(같은 입력 = 같은 결과) 동작하는지 확인 */
require('../js/astro.js');
require('../js/manse.js');
require('../js/analysis.js');
require('../js/texts.js');
require('../js/consult.js');
require('../js/gunghap.js');
require('../js/taekil.js');
const { Manse, Analysis, Consult, Gunghap, Taekil } = globalThis;

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}`); }
}

const p1 = Manse.fourPillars({ y: 1990, m: 3, d: 15, hour: 14, min: 30, gender: 'M' });
const p2 = Manse.fourPillars({ y: 1992, m: 7, d: 20, hour: 9, min: 0, gender: 'F' });
const str = Analysis.strength(p1);
const ys = Analysis.yongsin(p1, str);
const du = Manse.daeun(p1);
const saju = { p: p1, str, ys, du, name: '' };
const base = { y: 2026, m: 8, d: 7 };

/* --- 상담: 카테고리 판별 --- */
ok('카테고리: 퇴사', Consult.detectCategory('퇴사해도 될까요?') === 'resign');
ok('카테고리: 창업', Consult.detectCategory('유튜브 시작해도 될까요?') === 'startup');
ok('카테고리: 투자', Consult.detectCategory('주식 해도 될까요?') === 'invest');
ok('카테고리: 결혼', Consult.detectCategory('결혼하면 행복할까요?') === 'marriage');
ok('카테고리: 부동산', Consult.detectCategory('집 사도 될까요?') === 'estate');
ok('카테고리: 기본값', Consult.detectCategory('안녕하세요') === 'general');

/* --- 상담: 결정성 + 내용 포함 --- */
Consult.resetHistory();
const a1 = Consult.answer(saju, '퇴사해도 될까요?', base);
Consult.resetHistory();
const a2 = Consult.answer(saju, '퇴사해도 될까요?', base);
ok('상담 결정성 (동일 세션 상태)', a1.html === a2.html);
ok('상담에 대운 포함', a1.html.includes('대운'));
ok('상담에 월운 타이밍 포함', a1.html.includes('월'));
ok('상담 면책 문구', a1.html.includes('참고'));

/* --- 월운 스캔 --- */
const ms = Consult.monthlyScan(p1, ys, 2026, 8);
ok('월운 12개월', ms.length === 12);
ok('월운 연도 넘김', ms[11].y === 2027 && ms[11].m === 7);
ok('월운 점수 범위', ms.every(x => x.score >= 30 && x.score <= 98));

/* --- 궁합 --- */
const g1 = Gunghap.analyze(p1, p2);
const g2 = Gunghap.analyze(p1, p2);
ok('궁합 결정성', JSON.stringify(g1) === JSON.stringify(g2));
ok('궁합 점수 범위', g1.score >= 0 && g1.score <= 100);
ok('궁합 항목 5개', g1.items.length === 5);
ok('궁합 항목 최대치 합 100', g1.items.reduce((a, x) => a + x.max, 0) === 100);
// 관계 판정 스팟 체크: 자-축 육합, 자-오 충, 자-미 원진, 신-자 삼합
ok('육합 판정', Gunghap.branchRel(0, 1) === '육합');
ok('충 판정', Gunghap.branchRel(0, 6) === '충');
ok('원진 판정', Gunghap.branchRel(0, 7) === '원진');
ok('삼합 판정', Gunghap.branchRel(8, 0) === '삼합');

/* --- 택일 --- */
const t1 = Taekil.scan(p1, ys, base, 'contract', 30);
const t2 = Taekil.scan(p1, ys, base, 'contract', 30);
ok('택일 결정성', JSON.stringify(t1) === JSON.stringify(t2));
ok('택일 30일', t1.length === 30);
ok('택일 별점 범위', t1.every(x => x.stars >= 1 && x.stars <= 5));
ok('택일 TOP3 정렬', (() => { const b = Taekil.best(t1, 3); return b.length === 3 && b[0].score >= b[1].score && b[1].score >= b[2].score; })());
// 이사 목적은 손없는날 태그가 계산됨 (음력 변환 경유)
const mv = Taekil.scan(p1, ys, base, 'move', 30);
ok('손없는날 태그 존재', mv.some(x => x.sonEomneun));

/* --- v3: 카테고리 확장/우선순위 --- */
ok('카테고리: 대출(금전 아님)', Consult.detectCategory('대출받아도 될까요?') === 'loan');
ok('카테고리: 유학(시험 아님)', Consult.detectCategory('유학 가도 될까요?') === 'abroad');
ok('카테고리: 자동차', Consult.detectCategory('차 사도 될까요?') === 'car');
ok('카테고리: 소송', Consult.detectCategory('소송을 해야 할까요?') === 'lawsuit');
ok('카테고리: 가족', Consult.detectCategory('부모님과의 갈등이 힘들어요') === 'family');
ok('카테고리 18종', Object.keys(Consult.CATEGORIES).length === 18);

/* --- v3: 위험도 점검 --- */
const r1 = Consult.assessRisk(saju, base);
const r2 = Consult.assessRisk(saju, base);
ok('위험도 결정성', JSON.stringify(r1) === JSON.stringify(r2));
ok('위험도 레벨 유효', ['낮음', '중간', '높음'].includes(r1.level));
Consult.resetHistory();
const la = Consult.answer(saju, '대출받아도 될까요?', base);
ok('고위험 답변에 위험도 점검 포함', la.html.includes('위험도 점검'));

/* --- v3: 질문 기억 --- */
const follow = Consult.answer(saju, '창업해도 될까요?', base);
ok('이전 질문 브리지', follow.html.includes('앞서') && follow.html.includes('대출·부채'));
Consult.resetHistory();
const fresh = Consult.answer(saju, '창업해도 될까요?', base);
ok('초기화 후 브리지 없음', !fresh.html.includes('앞서'));

/* --- v3: 분야별 운세 (재물/애정/건강/직업) --- */
const gz2026 = Manse.ganzhiName(((2026 - 4) % 60 + 60) % 60);
for (const dom of ['money', 'love', 'health', 'career']) {
  const d1 = Analysis.domainFortune(p1, ys, gz2026, dom);
  const d2 = Analysis.domainFortune(p1, ys, gz2026, dom);
  ok(`도메인 ${dom} 결정성`, d1.score === d2.score);
  ok(`도메인 ${dom} 범위`, d1.score >= 20 && d1.score <= 99);
}
ok('별점 변환', Analysis.starsOf(90) === 5 && Analysis.starsOf(30) === 1);

/* --- v3: 궁합 인연 그래프 --- */
const ga = Gunghap.analyze(p1, p2);
ok('인연 그래프 5국면', ga.aspects.length === 5);
ok('인연 그래프 별점 범위', ga.aspects.every(a => a.stars >= 1 && a.stars <= 5));

/* --- v3: 택일 장기 스캔 --- */
const t90a = Taekil.scan(p1, ys, base, 'open', 90);
const t90b = Taekil.scan(p1, ys, base, 'open', 90);
ok('택일 90일 결정성', JSON.stringify(t90a) === JSON.stringify(t90b));
ok('택일 90일 개수', t90a.length === 90);
const t365 = Taekil.scan(p1, ys, base, 'exam', 365);
ok('택일 1년 개수', t365.length === 365);
ok('택일 1년 연도 넘김', t365[364].y === 2027);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
