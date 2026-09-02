/**
 * 공식 티어 페이지 공통 — tier1~9.html 전부가 이 스크립트 하나를 <script defer>로
 * 불러 쓴다(파일마다 별도 코드 없음). 즉시실행함수(IIFE)로 감싸 전역 스코프를
 * 오염시키지 않는다.
 * 1) 이전/다음 티어표 네비 (1티어 이전·9티어 다음은 반투명 비활성)
 * 2) 등급 제목(h2)에 메인 티어 아이콘과 같은 색 윤광 (CSS data-tier)
 */
(function initTierPageNav() {
  // 파일명 tierN.html 에서 현재 티어 번호 추출. 정규식으로 URL 경로 끝이
  // "tierN.html"인지 확인하므로, 이 스크립트가 다른 페이지에 실수로 로드돼도
  // match가 null이 되어 조용히 아무 일도 하지 않는다
  const match = (window.location.pathname || '').match(/tier(\d)\.html$/i);
  if (!match) return;

  const current = Number(match[1]);
  if (current < 1 || current > 9) return;

  // 이전/다음 버튼 하나를 만드는 헬퍼. enabled가 true면 실제 이동 가능한
  // <a href="tierN.html"> 링크로, false면(1티어의 이전 / 9티어의 다음) 클릭이
  // 안 되는 <span>으로 만들어 tier-nav.css의 is-disabled 스타일(반투명)을 입힌다
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

  // 네비 바 전체 = [이전 버튼] [현재 등급 표시] [다음 버튼]. 이 시점에는 아직
  // DOM에 붙이지 않고 메모리 상의 <nav> 요소만 조립해둔다(아래 mount에서 삽입)
  const nav = document.createElement('nav');
  nav.className = 'tier-page-nav';
  nav.setAttribute('aria-label', '이전·다음 티어표');

  // 현재 등급 - 1 / + 1 로 이전·다음 파일명을 계산. current가 1이면 이전 버튼은
  // enabled=false(current > 1이 false)라서 비활성 <span>이 된다
  nav.appendChild(makeBtn('prev', '← 이전 티어표', 'tier' + (current - 1) + '.html', current > 1));

  const currentEl = document.createElement('span');
  currentEl.className = 'tier-page-nav-current';
  currentEl.textContent = current + '티어';
  nav.appendChild(currentEl);

  nav.appendChild(makeBtn('next', '다음 티어표 →', 'tier' + (current + 1) + '.html', current < 9));

  // 실제로 페이지에 네비/윤광을 붙이는 부분. common.js가 header를 삽입하는 것과는
  // 별개로 이 스크립트는 페이지 자체 <main> 안에서 동작한다
  function mount() {
    const main = document.querySelector('main') || document.querySelector('.tier-list');
    if (!main) return;
    // 이미 네비가 붙어 있으면(예: 어떤 이유로 스크립트가 두 번 실행됐을 때) 중복 삽입 방지
    if (main.querySelector('.tier-page-nav')) return;
    // main의 맨 위(첫 자식 앞)에 삽입해 등급 제목(h2)보다 먼저 보이게 한다
    main.insertBefore(nav, main.firstChild);

    // 제목 윤광용 클래스·티어 번호 (색은 tier-nav.css) — data-tier 속성 값에 따라
    // tier-nav.css의 [data-tier="N"] 선택자가 CSS 변수(--tier-glow-*)를 다르게
    // 채워, 등급마다 다른 색으로 h2가 은은하게 빛나 보이게 한다
    const heading = main.querySelector('h2') || main.querySelector('h1');
    if (heading) {
      heading.classList.add('tier-heading');
      heading.setAttribute('data-tier', String(current));
    }
  }

  // defer 스크립트라 보통 DOM 파싱이 끝난 뒤 실행되지만, 혹시 defer 없이 로드되는
  // 경우(tier3~9.html의 common.js처럼)에도 안전하도록 readyState를 확인해
  // DOM이 아직 로딩 중이면 DOMContentLoaded까지 기다렸다가 mount한다
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
