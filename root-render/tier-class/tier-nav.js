(function initTierPageNav() {
  const match = (window.location.pathname || '').match(/tier(\d)\.html$/i);
  if (!match) return;

  const current = Number(match[1]);
  if (current < 1 || current > 9) return;

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
