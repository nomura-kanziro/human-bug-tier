// ============================================================
// 메인 홈 (index.html) — 퀵 카드 스크롤 + 행운 뽑기 위젯
// ============================================================

// 퀵 카드: 안쪽 <a>는 페이지 이동, 카드 빈 곳 클릭은 data-scroll-target 섹션으로 스크롤
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

// 오늘의 행운 티어 — luck-draw-api.js 와 같은 API·게스트 키
(function initHomeLuckDraw() {
  const btn = document.getElementById('home-luck-btn');
  const statusEl = document.getElementById('home-luck-status');
  const staticEl = document.getElementById('home-luck-static');
  const placeholder = document.getElementById('home-luck-placeholder');
  const loading = document.getElementById('home-luck-loading');
  const reel = document.getElementById('home-luck-reel');
  const resultBox = document.getElementById('home-luck-result');
  if (!btn || typeof luckDrawRequest !== 'function') return;

  // 비로그인 게스트는 서버에 기록을 남기지 않으므로, 대신 브라우저 localStorage에
  // "마지막으로 뽑은 시각 + 그때 결과"를 저장해 24시간 이내 재클릭 시 서버 호출 없이 안내만 보여준다.
  // 뽑기 상세 페이지(luck-draw.html)도 동일한 키를 사용해 두 화면 간 게스트 상태를 공유한다.
  const GUEST_KEY = 'luckDrawGuestState'; // 뽑기 페이지와 동일
  const GUEST_MS = 24 * 60 * 60 * 1000;
  const TIER_LABELS = {
    1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
    6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
  };

  function loggedIn() {
    return Boolean(localStorage.getItem('authToken'));
  }

  // 안내 문구. 빈 문자열이면 숨김 (레이아웃 점프 방지)
  function setStatus(text) {
    if (!statusEl) return;
    const t = (text || '').trim();
    statusEl.textContent = t;
    statusEl.hidden = !t;
  }

  // 스테이지 한 칸만 표시: 기본 ? / 뽑는 중 릴 / 결과 카드
  function showStage(which) {
    if (placeholder) placeholder.hidden = which !== 'placeholder';
    if (loading) loading.hidden = which !== 'loading';
    if (resultBox) resultBox.hidden = which !== 'result';
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
    showStage('result');
  }

  // GH Pages 등 API 없음: 정적 호스팅에는 백엔드가 없어 실제 뽑기가 불가능하므로
  // 안내 문구만 보여주고 버튼을 아예 비활성화해 클릭이 되지 않게 막는다.
  if (typeof getApiBase === 'function' && getApiBase() === 'GITHUB_STATIC') {
    if (staticEl) staticEl.hidden = false;
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async () => {
    // 게스트: 24시간 안이면 서버 호출 없이 안내 + 마지막 결과
    if (!loggedIn()) {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        const state = raw ? JSON.parse(raw) : null;
        if (state && Date.now() - state.lastDrawAt < GUEST_MS) {
          setStatus('게스트는 24시간에 한 번 체크할 수 있어요. 로그인하면 바로 가능합니다.');
          if (state.result) showResult(state.result, true);
          return;
        }
      } catch (err) { /* ignore */ }
    }

    btn.disabled = true;
    setStatus('');
    showStage('loading');
    // 슬롯머신처럼 1~9 숫자가 90ms마다 빠르게 순환하는 릴 애니메이션 (실제 뽑기 결과와는 무관한 연출용)
    let n = 1;
    const timer = setInterval(() => {
      n = (n % 9) + 1;
      if (reel) reel.textContent = String(n);
    }, 90);

    // 릴과 API를 맞추려고 최소 2.2초 대기 — 서버 응답이 그보다 빨리 와도 애니메이션이 너무 짧게
    // 끊기지 않도록 Promise.all처럼 두 작업(wait, drawDailyLuck)이 모두 끝날 때까지 기다린다.
    const wait = new Promise((resolve) => setTimeout(resolve, 2200));
    let res;
    try {
      res = await drawDailyLuck();
    } catch (err) {
      res = { ok: false, data: { error: '뽑기에 실패했습니다.' } };
    }
    await wait;
    clearInterval(timer);

    if (!res.ok) {
      btn.disabled = false;
      showStage('placeholder');
      if (res.data && res.data.cooldown) setStatus('잠시 후 다시 뽑아 주세요.');
      else if (res.data && res.data.limitReached) setStatus('오늘 횟수를 모두 썼습니다.');
      else setStatus((res.data && res.data.error) || '뽑기에 실패했습니다.');
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
    setStatus(guest ? '체크 결과입니다. 로그인하면 기록이 남아요.' : '기록이 저장되었습니다.');
  });
})();
