/**
 * 헤더 없는 페이지(로그인 등)용 PWA 등록 헬퍼
 * common.js 의 ensurePwaAssets 와 동일 목적
 *
 * common.js를 아예 불러오지 않는(또는 아직 로드가 끝나지 않은) 최소 페이지에서도
 * PWA 매니페스트·아이콘·서비스워커 등록이 빠지지 않도록, common.js의 getBasePath() 로직을
 * 이 파일 안에 독립적으로 한 번 더 구현해 둔 것. 즉 common.js와 "동일 목적, 별도 구현".
 */
(function () {
  // getBasePath()가 이미 로드되어 있으면(common.js가 함께 있는 페이지) 그걸 그대로 쓰고,
  // 없으면 아래에서 URL 경로 깊이를 직접 계산해 "../"를 몇 번 반복할지 알아낸다.
  function basePath() {
    if (typeof getBasePath === 'function') return getBasePath();
    let pathname = window.location.pathname || '/';
    // 파일명이 포함된 경로(.html 등)면 파일명을 떼고 디렉터리 경로만 남긴다
    if (pathname.includes('.')) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    }
    const segments = pathname.split('/').filter(Boolean);
    // GitHub Pages는 저장소명이 첫 세그먼트로 붙으므로(예: /repo-name/...) 한 단계 덜 올라가야 함
    const isGitHubPages = /\.github\.io$/i.test(window.location.hostname);
    let ups;
    if (isGitHubPages && segments.length > 0) {
      ups = Math.max(0, segments.length - 1);
    } else {
      ups = segments.length;
    }
    return ups > 0 ? '../'.repeat(ups) : './';
  }

  // 페이지 <head>에 PWA 필수 태그(테마색, 매니페스트, 애플 홈화면 아이콘)를 없을 때만 추가하고,
  // 서비스워커를 계산된 base 경로 기준으로 등록한다.
  function ensure() {
    const base = basePath();
    // 브라우저 UI(주소창 등) 색상을 지정하는 메타 태그 — 없으면 추가
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#111111';
      document.head.appendChild(theme);
    }
    // PWA 설치(홈 화면 추가) 정보를 담은 매니페스트 링크 — 없으면 추가
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = base + 'manifest.webmanifest';
      document.head.appendChild(link);
    }
    // iOS 홈 화면 추가 시 사용할 아이콘 — 없으면 추가
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = base + 'tier-image/pwa/icon-192.png';
      document.head.appendChild(apple);
    }
    // 서비스워커 미지원 브라우저이거나 file:// 로 직접 연 경우(로컬 더블클릭 실행)는 등록 시도 자체를 건너뜀
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    const swUrl = new URL(base + 'sw.js', window.location.href);
    const scopeUrl = new URL(base, window.location.href);
    // 페이지 load 이벤트 이후에 등록해 초기 렌더링/네트워크 요청과 경합하지 않도록 함
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(swUrl.href, { scope: scopeUrl.href }).catch(function (e) {
        console.warn('[PWA] register fail', e);
      });
    });
  }

  // DOM이 아직 준비 중이면 DOMContentLoaded를 기다렸다가, 이미 준비됐으면 바로 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }
})();
