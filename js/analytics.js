/* =========================================================
 * analytics.js — 초경량 방문/이벤트 통계 (선택 기능)
 *
 * 기본값은 완전 비활성(아무 데이터도 전송하지 않음).
 * GoatCounter(무료, 쿠키 없음) 계정을 만든 뒤 아래 CODE에
 * 사이트 코드를 넣으면 활성화됩니다.
 *   예) CODE = 'saju' → https://saju.goatcounter.com 대시보드
 * 집계 항목: 페이지 조회 + 상담/궁합/택일 실행 횟수 (개인정보 없음)
 * ========================================================= */
(function () {
  'use strict';
  var CODE = ''; // ← GoatCounter 사이트 코드 입력 시 활성화 (비우면 완전 꺼짐)

  window.trackEvent = function () {};
  if (!CODE) return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://' + CODE + '.goatcounter.com/count');
  document.head.appendChild(s);

  window.trackEvent = function (name) {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'event/' + name, event: true });
    }
  };
})();
