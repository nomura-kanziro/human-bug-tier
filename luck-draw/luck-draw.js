const LUCK_TIER_LABELS = {
  1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
  6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
};

// 서버 상수와 동일 — 회원 하루 20회 / 3분 쿨다운.
// 게스트 24시간 제한은 서버가 신원을 모르므로 프론트 localStorage 로만 안내한다(보안 아님, UX용).
const MEMBER_DAILY_LIMIT_FALLBACK = 20;
const MEMBER_COOLDOWN_SEC_FALLBACK = 180;
const GUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const LUCK_GUEST_STATE_KEY = 'luckDrawGuestState';

let cooldownTimer = null;

function isLoggedIn() {
  return Boolean(localStorage.getItem('authToken'));
}

function clearCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function startCooldownCountdown(seconds, { onTick, onDone }) {
  clearCooldownTimer();
  let remaining = Math.ceil(seconds);
  onTick(remaining);
  cooldownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearCooldownTimer();
      onDone();
      return;
    }
    onTick(remaining);
  }, 1000);
}

function guardStaticDeploy() {
  if (getApiBase() !== 'GITHUB_STATIC') return false;

  const guard = document.getElementById('static-guard');
  const btn = document.getElementById('draw-btn');
  if (guard) guard.hidden = false;
  if (btn) btn.disabled = true;
  return true;
}

function activateTabFromHash() {
  const hash = (window.location.hash || '#daily').slice(1);
  document.querySelectorAll('.luck-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === hash);
  });
  document.querySelectorAll('.luck-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === hash);
  });
}

function bindTabClicks() {
  document.querySelectorAll('.luck-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.disabled) return;
      window.location.hash = tab.dataset.tab;
      activateTabFromHash();
    });
  });
}

function renderProbabilityTable(weights) {
  const tbody = document.querySelector('#probability-table tbody');
  if (!tbody || !weights) return;

  tbody.innerHTML = '';
  Object.keys(weights)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((tier) => {
      const tr = document.createElement('tr');

      const tierCell = document.createElement('td');
      tierCell.textContent = LUCK_TIER_LABELS[tier] || `${tier}티어`;

      const percentCell = document.createElement('td');
      percentCell.textContent = `${weights[tier]}%`;

      tr.appendChild(tierCell);
      tr.appendChild(percentCell);
      tbody.appendChild(tr);
    });
}

function renderResult(result, { guest }) {
  const card = document.getElementById('result-card');
  const img = document.getElementById('result-image');
  const tierEl = document.getElementById('result-tier');
  const nameEl = document.getElementById('result-name');
  const tierLink = document.getElementById('result-tier-link');
  const guestNotice = document.getElementById('guest-notice');
  if (!card || !result) return;

  img.src = getBasePath() + encodeURI(result.imagePath);
  img.alt = result.characterName;
  tierEl.textContent = LUCK_TIER_LABELS[result.tier] || `${result.tier}티어`;
  nameEl.textContent = result.characterName;
  tierLink.href = getBasePath() + result.tierPageUrl;

  if (guestNotice) guestNotice.hidden = !guest;
  card.hidden = false;
}

function renderHistory(items) {
  const list = document.getElementById('history-list');
  if (!list) return;

  list.innerHTML = '';

  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'luck-history-empty';
    empty.textContent = '아직 기록이 없습니다.';
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'luck-history-item';
    row.textContent = `${item.drawDate} · ${LUCK_TIER_LABELS[item.tier] || item.tier + '티어'} · ${item.characterName}`;
    list.appendChild(row);
  });
}

function showLoginRequiredHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';
  const notice = document.createElement('p');
  notice.className = 'luck-history-empty';
  notice.textContent = '로그인하면 내 뽑기 기록을 볼 수 있어요.';
  list.appendChild(notice);
}

// ---- 회원: 서버가 내려주는 횟수/쿨다운 상태를 그대로 반영 ----
function renderMemberStatus(status) {
  const btn = document.getElementById('draw-btn');
  const statusEl = document.getElementById('draw-status');
  if (!btn || !statusEl) return;

  clearCooldownTimer();

  if (status.remainingToday <= 0) {
    btn.disabled = true;
    btn.textContent = '오늘 뽑기 횟수 소진 (내일 다시)';
    statusEl.textContent = `오늘 ${status.dailyLimit}/${status.dailyLimit}회를 모두 사용했습니다.`;
    return;
  }

  statusEl.textContent = `오늘 남은 횟수 ${status.remainingToday}/${status.dailyLimit}`;

  if (status.cooldownRemainingSec > 0) {
    btn.disabled = true;
    startCooldownCountdown(status.cooldownRemainingSec, {
      onTick: (sec) => { btn.textContent = `다음 뽑기까지 ${formatCountdown(sec)}`; },
      onDone: () => {
        btn.disabled = false;
        btn.textContent = '오늘의 행운 뽑기';
      },
    });
    return;
  }

  btn.disabled = false;
  btn.textContent = '오늘의 행운 뽑기';
}

// ---- 게스트: localStorage 마지막 체크 시각으로 24시간 안내만 표시 (서버 강제 아님) ----
function getGuestState() {
  try {
    const raw = localStorage.getItem(LUCK_GUEST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function setGuestState(result) {
  try {
    localStorage.setItem(LUCK_GUEST_STATE_KEY, JSON.stringify({ lastDrawAt: Date.now(), result }));
  } catch (err) {
    /* localStorage 사용 불가 환경 — 안내만 못 할 뿐 기능은 계속 동작 */
  }
}

function isGuestOnCooldown() {
  const state = getGuestState();
  if (!state) return false;
  return Date.now() - state.lastDrawAt < GUEST_COOLDOWN_MS;
}

function renderGuestStatus() {
  const statusEl = document.getElementById('draw-status');
  const state = getGuestState();

  if (!state) {
    if (statusEl) {
      statusEl.textContent = `비회원은 24시간에 한 번 체크할 수 있어요. 로그인하면 하루 ${MEMBER_DAILY_LIMIT_FALLBACK}번(${MEMBER_COOLDOWN_SEC_FALLBACK / 60}분 간격)까지 뽑을 수 있습니다.`;
    }
    return;
  }

  renderResult(state.result, { guest: true });

  const remainingMs = GUEST_COOLDOWN_MS - (Date.now() - state.lastDrawAt);
  clearCooldownTimer();

  if (remainingMs > 0 && statusEl) {
    startCooldownCountdown(remainingMs / 1000, {
      onTick: (sec) => { statusEl.textContent = `다음 체크까지 ${formatCountdown(sec)} 남음 (로그인하면 바로 가능)`; },
      onDone: () => { statusEl.textContent = '이제 다시 체크할 수 있어요.'; },
    });
  } else if (statusEl) {
    statusEl.textContent = '이제 다시 체크할 수 있어요.';
  }
}

async function loadConfig() {
  const { ok, data } = await fetchLuckConfig();
  if (ok && data) {
    renderProbabilityTable(data.weights);
  }
}

async function loadStatus() {
  if (!isLoggedIn()) {
    showLoginRequiredHistory();
    renderGuestStatus();
    return;
  }

  const todayRes = await fetchTodayLuck();
  if (todayRes.ok) {
    if (todayRes.data.lastResult) {
      renderResult(todayRes.data.lastResult, { guest: false });
    }
    renderMemberStatus(todayRes.data);
  }

  const historyRes = await fetchLuckHistory(1);
  if (historyRes.ok) {
    renderHistory(historyRes.data.items);
  }
}

async function onClickDaily() {
  const btn = document.getElementById('draw-btn');
  if (!btn || btn.disabled) return;

  // 비회원이 이미 24시간 안에 한 번 체크했다면 서버 호출 없이 바로 안내.
  if (!isLoggedIn() && isGuestOnCooldown()) {
    alert(
      `로그인하면 하루 최대 ${MEMBER_DAILY_LIMIT_FALLBACK}번(${MEMBER_COOLDOWN_SEC_FALLBACK / 60}분 간격)까지 뽑을 수 있어요!\n` +
      '비회원은 24시간에 한 번만 체크할 수 있습니다.\n' +
      '로그인하고 다시 시도하거나, 24시간 뒤에 다시 방문해주세요.'
    );
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '뽑는 중...';

  try {
    const { ok, status, data } = await drawDailyLuck();

    if (ok && data.ok) {
      renderResult(data.result, { guest: Boolean(data.guest) });
      if (data.guest) {
        setGuestState(data.result);
        renderGuestStatus();
      } else {
        loadStatus();
      }
      return;
    }

    if (status === 429) {
      alert(data.error || '지금은 뽑을 수 없습니다.');
      loadStatus();
      return;
    }

    btn.disabled = false;
    btn.textContent = originalText;
    alert(data.error || '뽑기에 실패했습니다.');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = originalText;
    if (err.message === 'GITHUB_STATIC') return;
    console.error('행운 뽑기 요청 실패:', err);
    alert('네트워크 오류로 뽑기에 실패했습니다.');
  }
}

function initLuckDrawPage() {
  bindTabClicks();
  activateTabFromHash();
  window.addEventListener('hashchange', activateTabFromHash);

  if (guardStaticDeploy()) return;

  const drawBtn = document.getElementById('draw-btn');
  if (drawBtn) {
    drawBtn.addEventListener('click', onClickDaily);
  }

  loadConfig();
  loadStatus();
}

document.addEventListener('DOMContentLoaded', initLuckDrawPage);
