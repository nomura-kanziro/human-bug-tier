/* ======================================================================
   loading-screen.js — 사이트 전체 초기 로딩 화면 표시/숨김 제어
   ======================================================================
   HTML에 이미 삽입돼 있는 #site-loading-screen 오버레이(로고 네온 링 애니메이션)를
   페이드아웃시켜 숨긴다. 오버레이 자체는 loading-screen.css가 항상 보이는 상태로
   그려두고, 이 파일은 "언제 치울지"만 결정한다.

   ⚠️ 기준을 window의 'load' 이벤트(페이지의 이미지·CSS·폰트 등 "모든" 리소스가
   다 받아져야 발생)로 뒀다가, tier-class 페이지처럼 캐릭터 이미지가 수십 장인
   페이지에서 그 이미지가 전부 로드될 때까지 화면을 막아버려 페이지 전환이
   심하게 느리게 느껴지는 문제가 있었다(2026-09 수정). 그래서 지금은:
     - #header-placeholder가 있는 페이지(대부분의 페이지, common.js 사용):
       common.js가 header.html/footer.html을 fetch해서 삽입을 "완전히 끝낸
       직후" common.js가 window.hideSiteLoadingScreen()을 직접 호출해준다
       (common.js의 loadCommon()/fallbackLoadHeaderFooter() 참고). 즉 "헤더·
       푸터까지 자리 잡은 시점" = 페이지를 실제로 쓸 수 있는 시점을 기준으로
       삼고, 그 아래 캐릭터 이미지 수십 장이 다 받아지는 것은 기다리지 않는다
       (이미지는 브라우저가 알아서 순차적으로 채워 넣도록 둔다).
     - #header-placeholder가 없는 페이지(로그인류 5개, common.js 미사용):
       기다릴 헤더가 없으므로 DOMContentLoaded(HTML 파싱 완료 시점)에 바로 숨긴다.
     - 위 두 경로 중 무엇도 안 걸리는 예외 상황(예: common.js 로드 실패, 신호
       누락) 대비로 MAX_WAIT_MS 안전장치는 그대로 유지 — 다만 이제는 "정말
       예외 상황일 때만" 발동하면 되므로 값도 크게 줄였다.

   보정 장치:
   - MIN_SHOW_MS: 사실상 0에 가깝게 둔다. 예전에 200ms를 강제로 기다리게 했다가
     (거기에 CSS 페이드 0.5초까지 겹쳐) 실제 콘텐츠는 다 준비됐는데도 페이지
     전환마다 순수 "연출 대기 시간"만 0.5~0.7초씩 추가되는 게 체감 속도 저하의
     주범이었다(2026-09 수정). 지금은 신호가 오면 사실상 즉시 숨기고, 대신
     loading-screen.css의 짧은 페이드(0.15s)만으로 "뚝 끊기지 않는" 정도의
     최소한의 부드러움만 남긴다.
   - MAX_WAIT_MS: 정상 경로가 어떤 이유로 끝내 신호를 안 주는 경우를 대비해,
     이 시간이 지나면 무조건 강제로 숨긴다.
   - pageshow(e.persisted): 뒤로/앞으로 가기로 페이지가 bfcache에서 그대로
     복원된 경우 위 이벤트들이 다시 발생하지 않으므로, 이 경우는 즉시(트랜지션
     없이) 숨겨서 뒤로가기 할 때마다 로딩 화면이 다시 뜨는 어색함을 막는다.
   ====================================================================== */
(function () {
  var MAX_WAIT_MS = 1200;
  var MIN_SHOW_MS = 0;
  var shownAt = Date.now();
  var hidden = false;

  function removeOverlay(el) {
    if (el && el.parentNode) el.remove();
  }

  function hideLoadingScreen() {
    if (hidden) return;
    hidden = true;

    var el = document.getElementById('site-loading-screen');
    if (!el) return;

    var elapsed = Date.now() - shownAt;
    var wait = Math.max(0, MIN_SHOW_MS - elapsed);

    setTimeout(function () {
      el.classList.add('is-hidden');
      // 트랜지션(opacity/visibility) 종료 후 DOM에서 완전히 제거 —
      // 화면에서 안 보인다고 방치하면 스크린리더/탭 포커스 순서에 계속 남기 때문
      var onEnd = function () {
        el.removeEventListener('transitionend', onEnd);
        removeOverlay(el);
      };
      el.addEventListener('transitionend', onEnd);
      // transitionend가 어떤 이유로 안 걸리는 환경(트랜지션 비활성화 등) 대비 안전장치.
      // loading-screen.css의 페이드 시간(0.15s)보다 넉넉히 크게만 잡는다.
      setTimeout(function () { removeOverlay(el); }, 300);
    }, wait);
  }

  // 즉시(트랜지션 없이) 치우는 버전 — bfcache 복원 시 사용
  function hideLoadingScreenInstant() {
    hidden = true;
    removeOverlay(document.getElementById('site-loading-screen'));
  }

  // common.js가 있는 페이지: 헤더/푸터 삽입이 끝나면 common.js가 이 함수를 직접 호출한다.
  // (그전까지는 아무 리스너도 안 걸어두고 가만히 기다린다 — DOMContentLoaded에도 안 숨김)
  window.hideSiteLoadingScreen = hideLoadingScreen;

  // common.js가 아예 없는 페이지(로그인류)는 기다릴 헤더가 없으므로
  // HTML 파싱이 끝나는 즉시(이미지 로드는 기다리지 않고) 숨긴다.
  if (!document.getElementById('header-placeholder')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideLoadingScreen);
    } else {
      hideLoadingScreen();
    }
  }

  // 위 두 경로 중 무엇도 제때 신호를 못 준 예외 상황을 위한 최후 안전장치
  setTimeout(hideLoadingScreen, MAX_WAIT_MS);

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hideLoadingScreenInstant();
  });
})();
