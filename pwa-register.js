/**
 * 헤더 없는 페이지(로그인 등)용 PWA 등록 헬퍼
 * common.js 의 ensurePwaAssets 와 동일 목적
 */
(function () {
  function basePath() {
    if (typeof getBasePath === 'function') return getBasePath();
    let pathname = window.location.pathname || '/';
    if (pathname.includes('.')) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    }
    const segments = pathname.split('/').filter(Boolean);
    const isGitHubPages = /\.github\.io$/i.test(window.location.hostname);
    let ups;
    if (isGitHubPages && segments.length > 0) {
      ups = Math.max(0, segments.length - 1);
    } else {
      ups = segments.length;
    }
    return ups > 0 ? '../'.repeat(ups) : './';
  }

  function ensure() {
    const base = basePath();
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#111111';
      document.head.appendChild(theme);
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = base + 'manifest.webmanifest';
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = base + 'tier-image/pwa/icon-192.png';
      document.head.appendChild(apple);
    }
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    const swUrl = new URL(base + 'sw.js', window.location.href);
    const scopeUrl = new URL(base, window.location.href);
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(swUrl.href, { scope: scopeUrl.href }).catch(function (e) {
        console.warn('[PWA] register fail', e);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  } else {
    ensure();
  }
})();
