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

(function initHomeLuckDraw() {
  const btn = document.getElementById('home-luck-btn');
  const statusEl = document.getElementById('home-luck-status');
  const staticEl = document.getElementById('home-luck-static');
  const loading = document.getElementById('home-luck-loading');
  const reel = document.getElementById('home-luck-reel');
  const resultBox = document.getElementById('home-luck-result');
  if (!btn || typeof luckDrawRequest !== 'function') return;

  const GUEST_KEY = 'luckDrawGuestState';
  const GUEST_MS = 24 * 60 * 60 * 1000;
  const TIER_LABELS = {
    1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
    6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
  };

  function loggedIn() {
    return Boolean(localStorage.getItem('authToken'));
  }

  function showResult(result, guest) {
    const img = document.getElementById('home-luck-img');
    const tierEl = document.getElementById('home-luck-tier');
    const nameEl = document.getElementById('home-luck-name');
    const guestEl = document.getElementById('home-luck-guest');
    if (!resultBox || !result) return;
    img.src = getBasePath() + encodeURI(result.imagePath);
    img.alt = result.characterName || '';
    tierEl.textContent = TIER_LABELS[result.tier] || `${result.tier}티어`;
    nameEl.textContent = result.characterName || '';
    if (guestEl) guestEl.hidden = !guest;
    resultBox.hidden = false;
  }

  if (typeof getApiBase === 'function' && getApiBase() === 'GITHUB_STATIC') {
    if (staticEl) staticEl.hidden = false;
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async () => {
    if (!loggedIn()) {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        const state = raw ? JSON.parse(raw) : null;
        if (state && Date.now() - state.lastDrawAt < GUEST_MS) {
          if (statusEl) statusEl.textContent = '게스트는 24시간에 한 번 체크할 수 있어요. 로그인하면 바로 가능합니다.';
          if (state.result) showResult(state.result, true);
          return;
        }
      } catch (err) { /* ignore */ }
    }

    btn.disabled = true;
    if (loading) loading.hidden = false;
    if (resultBox) resultBox.hidden = true;
    let n = 1;
    const timer = setInterval(() => {
      n = (n % 9) + 1;
      if (reel) reel.textContent = String(n);
    }, 90);

    const wait = new Promise((resolve) => setTimeout(resolve, 2200));
    let res;
    try {
      res = await drawDailyLuck();
    } catch (err) {
      res = { ok: false, data: { error: '뽑기에 실패했습니다.' } };
    }
    await wait;
    clearInterval(timer);
    if (loading) loading.hidden = true;

    if (!res.ok) {
      btn.disabled = false;
      if (statusEl) {
        if (res.data && res.data.cooldown) statusEl.textContent = '잠시 후 다시 뽑아 주세요.';
        else if (res.data && res.data.limitReached) statusEl.textContent = '오늘 횟수를 모두 썼습니다.';
        else statusEl.textContent = (res.data && res.data.error) || '뽑기에 실패했습니다.';
      }
      return;
    }

    const result = res.data.result || res.data;
    const guest = !loggedIn() || res.data.saved === false;
    showResult(result, guest);
    if (guest) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify({ lastDrawAt: Date.now(), result }));
      } catch (err) { /* ignore */ }
    }
    btn.disabled = false;
    if (statusEl) statusEl.textContent = guest ? '체크 결과입니다. 로그인하면 기록이 남아요.' : '기록이 저장되었습니다.';
  });
})();
