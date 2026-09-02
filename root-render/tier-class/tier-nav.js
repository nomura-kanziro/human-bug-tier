/**
 * 공식 티어 페이지 공통
 * 1) 이전/다음 티어표 네비 (1티어 이전·9티어 다음은 반투명 비활성)
 * 2) 등급 제목(h2)에 메인 티어 아이콘과 같은 색 윤광 (CSS data-tier)
 */
(function initTierPageNav() {
  // 파일명 tierN.html 에서 현재 티어 번호 추출
  const match = (window.location.pathname || '').match(/tier(\d)\.html$/i);
  if (!match) return;

  const current = Number(match[1]);
  if (current < 1 || current > 9) return;

  // 활성: <a> 링크 / 비활성: 클릭 안 되는 <span>
  function makeBtn(kind, label, href, enabled) {
    if (enabled) {
      const a = document.createElement('a');
      a.className = 'tier-page-nav-btn ' + kind;
      a.href = href;
      a.textContent = label;
      return a;
    }
    const span = document.createElement('span');
    span.className = 'tier-page-nav-btn ' + kind + ' is-disabled';
    span.setAttribute('aria-disabled', 'true');
    span.textContent = label;
    return span;
  }

  const nav = document.createElement('nav');
  nav.className = 'tier-page-nav';
  nav.setAttribute('aria-label', '이전·다음 티어표');

  nav.appendChild(makeBtn('prev', '← 이전 티어표', 'tier' + (current - 1) + '.html', current > 1));

  const currentEl = document.createElement('span');
  currentEl.className = 'tier-page-nav-current';
  currentEl.textContent = current + '티어';
  nav.appendChild(currentEl);

  nav.appendChild(makeBtn('next', '다음 티어표 →', 'tier' + (current + 1) + '.html', current < 9));

  function mount() {
    const main = document.querySelector('main') || document.querySelector('.tier-list');
    if (!main) return;
    if (main.querySelector('.tier-page-nav')) return;
    main.insertBefore(nav, main.firstChild);

    // 제목 윤광용 클래스·티어 번호 (색은 tier-nav.css)
    const heading = main.querySelector('h2') || main.querySelector('h1');
    if (heading) {
      heading.classList.add('tier-heading');
      heading.setAttribute('data-tier', String(current));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
