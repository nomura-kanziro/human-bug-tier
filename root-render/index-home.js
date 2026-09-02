// 메인 퀵 카드: 내부 링크는 그대로, 카드 본체 클릭은 관련 섹션으로 스크롤
(function initHomeQuickCards() {
  document.querySelectorAll('.quick-card[data-scroll-target]').forEach((card) => {
    function go() {
      const sel = card.getAttribute('data-scroll-target');
      const el = sel ? document.querySelector(sel) : null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      go();
    });

    card.addEventListener('keydown', (e) => {
      if (e.target.closest('a')) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      go();
    });
  });
})();
