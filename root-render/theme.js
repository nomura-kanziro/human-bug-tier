/* ======================================================================
   theme.js — 라이트/다크 테마 엔진 (전 페이지 공용)
   ======================================================================
   각 HTML <head> 맨 앞에는 이 파일과 별개로 "인라인 스크립트"가 하나 더 있는데,
   그게 document.documentElement(<html>)의 data-theme 속성을 CSS가 로드되기도
   전에 즉시 정해둬서 첫 렌더링부터 깜빡임(FOUC) 없이 올바른 테마로 보이게 한다.
   이 파일은 그 뒤를 이어 "상호작용"을 담당한다: 토글 스위치 클릭 처리, 저장된
   값 읽기/쓰기, 그리고 사용자가 한 번도 수동으로 설정한 적 없는 경우 시간이 흘러
   자동 전환 시각(오전 7시 / 밤 10시)을 지나면 탭을 켜 둔 채로도 자동으로 테마가
   바뀌도록 주기적으로 재확인하는 로직.

   저장 규칙 (localStorage.hbtTheme):
     - 'light' 또는 'dark' → 사용자가 토글 스위치를 눌러 "수동으로 고정"한 값.
       이후에는 시간이 몇 시든 이 값이 항상 우선한다(자동 전환 안 됨).
     - 값이 없음(한 번도 토글을 안 누름) → 매번 현재 시각 기준 자동값을 쓴다.
       오전 7시(07:00) ~ 밤 10시(22:00) 이전 = 라이트, 그 외(22:00~다음날 06:59) = 다크.
   ====================================================================== */
(function () {
  var STORAGE_KEY = 'hbtTheme';
  var AUTO_LIGHT_START_HOUR = 7;  // 오전 7시부터 자동 라이트
  var AUTO_DARK_START_HOUR = 22;  // 밤 10시(22시)부터 자동 다크

  // 지금 시각만 보고 자동으로 어떤 테마여야 하는지 계산 (수동 설정이 없을 때만 쓰임)
  function getAutoTheme() {
    var hour = new Date().getHours();
    return (hour >= AUTO_LIGHT_START_HOUR && hour < AUTO_DARK_START_HOUR) ? 'light' : 'dark';
  }

  // 사용자가 토글로 직접 고정해 둔 값이 있으면 반환, 없으면 null
  function getStoredTheme() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return (v === 'light' || v === 'dark') ? v : null;
    } catch (err) {
      return null; // 프라이빗 모드 등 localStorage 접근 불가 시 자동 모드로 동작
    }
  }

  // "지금 적용해야 할 테마" 최종 판단: 수동 고정값 우선, 없으면 자동(시간 기준)
  function resolveTheme() {
    return getStoredTheme() || getAutoTheme();
  }

  // 헤더의 토글 스위치(들)를 현재 테마 상태에 맞게 시각적으로 동기화.
  // header.html은 common.js가 나중에 fetch로 삽입하는 경우가 많아 버튼이 이 시점에
  // 아직 DOM에 없을 수도 있으므로, querySelectorAll이 빈 목록이어도 에러 없이 통과한다.
  function syncToggleSwitches(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var isDark = theme === 'dark';
      btn.classList.toggle('is-dark', isDark);
      btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncToggleSwitches(theme);
  }

  // 토글 스위치를 눌렀을 때: 현재 테마의 반대값으로 "수동 고정"하고 저장한다.
  // 한 번 수동으로 고르면 그 뒤로는 자동 시간 전환이 멈추고 이 값이 계속 유지된다.
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || resolveTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (err) { /* 저장 실패해도 화면 전환은 진행 */ }
    applyTheme(next);
  }

  // 수동 고정을 해제하고 다시 "자동(시간 기준)" 모드로 되돌린다.
  // 지금은 별도 UI가 없지만, 나중에 "자동으로 되돌리기" 메뉴를 추가할 때 바로 쓸 수 있도록
  // window에 공개해 둔다.
  function resetThemeToAuto() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    applyTheme(getAutoTheme());
  }

  // 수동 고정을 해 둔 적이 없는 사용자를 위한 보정: 사이트를 오전 7시 이전이나 밤 10시
  // 이전부터 켜 놓고 그 시각을 넘겨도, 탭이 다시 보이거나(visibilitychange) 일정 주기마다
  // 자동값을 다시 계산해서 반영한다. 수동 고정된 경우엔 절대 건드리지 않는다.
  function recheckIfAuto() {
    if (getStoredTheme()) return;
    applyTheme(getAutoTheme());
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') recheckIfAuto();
  });
  // 탭을 계속 켜 둔 경우를 대비한 주기적 재확인 (30분마다 — 매초/매분 단위로 볼 필요는 없음)
  setInterval(recheckIfAuto, 30 * 60 * 1000);

  // 토글 스위치 클릭을 이벤트 위임으로 처리 — header.html이 언제 삽입되든(비동기 fetch)
  // 상관없이 항상 동작하도록 버튼 자체가 아니라 document에 리스너를 건다.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    toggleTheme();
  });

  // 각 페이지 <head> 맨 앞 인라인 스크립트가 이미 data-theme을 정해 뒀을 것이므로
  // 보통은 동기화만 하면 되고, 혹시(인라인 스크립트가 빠진 페이지 등) 비어있으면
  // 여기서 한 번 더 안전하게 적용한다.
  var current = document.documentElement.getAttribute('data-theme');
  if (!current) {
    applyTheme(resolveTheme());
  } else {
    syncToggleSwitches(current);
  }

  window.toggleTheme = toggleTheme;
  window.resetThemeToAuto = resetThemeToAuto;
  // header.html은 common.js가 fetch로 나중에 삽입하므로, 토글 버튼이 삽입되는 그 시점에
  // common.js가 이 함수를 호출해서 방금 막 DOM에 들어온 버튼을 현재 테마 상태로 맞춰준다.
  window.syncThemeToggleUI = function () {
    syncToggleSwitches(document.documentElement.getAttribute('data-theme') || resolveTheme());
  };
})();
