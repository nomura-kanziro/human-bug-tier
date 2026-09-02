// ====== "오늘의 행운 뽑기" 상세 페이지 스크립트 ======
// luck-draw.html 전용. luck-draw-api.js(공용 fetch 헬퍼)와 common.js(getBasePath, getApiBase,
// getAuthHeaders 등 전역 유틸) 로드를 전제로 동작한다.
// 큰 흐름: 회원은 서버(백엔드 LuckProfile)가 하루 횟수/쿨다운/포인트를 관리하고,
// 비회원(게스트)은 서버에 기록을 남기지 않는 대신 이 파일이 localStorage로 24시간 안내만 흉내낸다.

// 서버가 내려주는 tier 숫자(1~9)를 화면에 보여줄 한글 라벨로 변환하는 테이블.
const LUCK_TIER_LABELS = {
  1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어',
  6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어',
};

// 서버 상수와 동일 — 회원 하루 20회 / 3분 쿨다운.
// 실제 판정은 항상 서버가 하므로 이 값들은 "서버가 아직 응답하기 전"에 보여줄 안내 문구용 기본값(fallback)이다.
// 게스트 24시간 제한은 서버가 신원을 모르므로 프론트 localStorage 로만 안내한다(보안 아님, UX용).
const MEMBER_DAILY_LIMIT_FALLBACK = 20;
const MEMBER_COOLDOWN_SEC_FALLBACK = 180;
const GUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// 게스트 상태를 저장하는 localStorage 키. index-home.js의 메인 홈 미니 위젯과 동일한 키를 써서
// 두 화면(상세 페이지 ↔ 홈 위젯) 사이에 "마지막 체크 시각/결과"를 공유한다.
const LUCK_GUEST_STATE_KEY = 'luckDrawGuestState';

let cooldownTimer = null;   // 쿨다운 카운트다운용 setInterval 핸들 (회원/게스트 공용, 화면에 하나만 존재)
let luckPointsTable = {};   // 서버에서 받은 "티어별 지급 포인트" 표 (fetchLuckConfig 응답 캐시, 이력 렌더링에 재사용)
let drawReelTimer = null;   // 뽑기 로딩 중 숫자가 빠르게 바뀌는 슬롯머신 애니메이션용 setInterval 핸들

// 뽑기 버튼 클릭 후 결과를 바로 보여주지 않고 이 시간(ms)만큼 긴장감용 애니메이션을 먼저 보여준다.
// 실제 서버 응답은 훨씬 빨리 오지만, 연출을 위해 최소 이 시간만큼은 로딩 화면을 유지한다.
const DRAW_SUSPENSE_MS = 10000;

// setTimeout을 Promise로 감싼 유틸 — Promise.all([drawDailyLuck(), sleep(DRAW_SUSPENSE_MS)])처럼
// "실제 요청"과 "최소 대기 시간"을 동시에 걸어 둘 다 끝나야 다음으로 넘어가게 만들 때 쓴다.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ====== 뽑기 로딩(긴장감 연출) ======
// 버튼 클릭 직후 결과 대신 10초짜리 "슬롯머신처럼 숫자가 돌아가는" 로딩 화면을 보여준다.
// 목적은 순수 연출(서스펜스)이며, 실제 뽑기 결과와는 무관하게 항상 정해진 애니메이션만 재생한다.
function startDrawSuspense() {
  const btn = document.getElementById('draw-btn');
  const loading = document.getElementById('draw-loading');
  const reel = document.getElementById('draw-loading-reel');
  const barFill = document.getElementById('draw-loading-bar-fill');
  const resultCard = document.getElementById('result-card');

  // 뽑기 버튼은 숨기고, 이전 결과 카드가 남아있다면 같이 숨긴 뒤 로딩 블록만 보이게 전환.
  if (btn) btn.hidden = true;
  if (resultCard) resultCard.hidden = true;
  if (loading) loading.hidden = false;

  if (reel) {
    // 1~9 숫자를 90ms 간격으로 순환시켜 "슬롯이 빠르게 돌아가는" 느낌을 낸다.
    // 티어가 1~9라는 점과 맞춰, 실제 결과와 무관하게 숫자만 반복 순환한다.
    let i = 1;
    reel.textContent = '1';
    drawReelTimer = setInterval(() => {
      i = (i % 9) + 1;
      reel.textContent = String(i);
    }, 90);
  }

  if (barFill) {
    // 진행 바를 0%로 순간 리셋한 뒤, DRAW_SUSPENSE_MS 동안 선형으로 100%까지 채운다.
    // transition을 'none'으로 끊지 않고 바로 width를 0→100으로 바꾸면 브라우저가 두 변경을
    // 하나의 스타일 재계산으로 묶어버려 애니메이션이 생략될 수 있으므로,
    // 중간에 offsetHeight를 강제로 읽어(리플로우) 0% 상태를 실제로 반영시킨 다음 transition을 건다.
    barFill.style.transition = 'none';
    barFill.style.width = '0%';
    // 강제 리플로우 — 다음 transition이 0%부터 새로 시작하도록.
    // eslint-disable-next-line no-unused-expressions
    barFill.offsetHeight;
    barFill.style.transition = `width ${DRAW_SUSPENSE_MS}ms linear`;
    barFill.style.width = '100%';
  }
}

// 로딩 연출을 종료하고 원래 화면(버튼 노출)으로 되돌린다.
// onClickDaily에서 서버 응답 + 최소 대기시간이 모두 끝난 뒤, 혹은 에러 발생 시 호출된다.
function stopDrawSuspense() {
  if (drawReelTimer) {
    clearInterval(drawReelTimer);
    drawReelTimer = null;
  }

  const btn = document.getElementById('draw-btn');
  const loading = document.getElementById('draw-loading');
  if (loading) loading.hidden = true;
  if (btn) btn.hidden = false;
}

// 로그인 여부는 auth 토큰 존재로 판단 (common.js의 getAuthHeaders도 동일 키를 사용).
function isLoggedIn() {
  return Boolean(localStorage.getItem('authToken'));
}

// 진행 중인 쿨다운 카운트다운(회원/게스트 공용)을 멈춘다.
// 새로운 카운트다운을 시작하거나, 상태를 다시 그릴 때(loadStatus 등) 이전 타이머가
// 중복으로 돌지 않도록 항상 먼저 호출해 정리한다.
function clearCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

// 남은 초를 "MM:SS" 또는 1시간 이상이면 "HH:MM:SS" 형태의 문자열로 변환.
// 회원 3분 쿨다운은 MM:SS로, 게스트 24시간 대기는 HH:MM:SS로 자연스럽게 표시된다.
function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// 초 단위 카운트다운을 1초 간격으로 감소시키며 onTick(남은 초)을 호출하고,
// 0이 되면 타이머를 정리한 뒤 onDone()을 호출한다.
// 회원 쿨다운(renderMemberStatus)과 게스트 24시간 대기(renderGuestStatus) 양쪽에서
// 동일한 로직을 재사용하기 위해 콜백 기반으로 분리되어 있다.
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

// GitHub Pages 같은 "백엔드 없는 정적 배포" 환경을 감지해 안내 배지를 띄우고 뽑기 버튼을 막는다.
// getApiBase()가 'GITHUB_STATIC'을 반환하면 이 페이지의 모든 fetch가 애초에 실패할 것이므로,
// 아예 요청을 시도하지 않고 UI 단계에서 먼저 차단한다. true를 반환하면 initLuckDrawPage가
// 이후 버튼 이벤트 바인딩/데이터 로딩을 생략한다.
function guardStaticDeploy() {
  if (getApiBase() !== 'GITHUB_STATIC') return false;

  const guard = document.getElementById('static-guard');
  const btn = document.getElementById('draw-btn');
  if (guard) guard.hidden = false;
  if (btn) btn.disabled = true;
  return true;
}

// ====== 탭 전환 (오늘의 행운 티어 / 랜덤 뽑기) ======
// URL 해시(#daily, #random)를 탭 상태의 단일 진실 소스로 사용한다.
// 이렇게 하면 새로고침·뒤로가기·직접 링크 공유 시에도 어떤 탭이 선택돼 있었는지 유지되고,
// hashchange 이벤트만 구독하면 별도 상태 관리 없이 탭 UI를 동기화할 수 있다.
function activateTabFromHash() {
  const hash = (window.location.hash || '#daily').slice(1);
  document.querySelectorAll('.luck-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === hash);
  });
  document.querySelectorAll('.luck-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === hash);
  });
}

// 탭 버튼 클릭 시 해시만 바꿔주면 activateTabFromHash가 실제 표시 전환을 담당한다.
// "랜덤 뽑기" 탭처럼 disabled(준비 중)인 버튼은 클릭을 무시한다.
function bindTabClicks() {
  document.querySelectorAll('.luck-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.disabled) return;
      window.location.hash = tab.dataset.tab;
      activateTabFromHash();
    });
  });
}

// ====== 확률/포인트 표 렌더링 ======
// 서버에서 받은 weights(티어별 당첨 확률 %)와 pointsTable(티어별 지급 포인트)을
// 화면의 <table id="probability-table">에 티어 오름차순으로 채워 넣는다.
// 값 자체는 서버 상수(DAILY_TIER_WEIGHTS 등)가 정본이며, 이 함수는 그걸 그대로 표시만 한다.
function renderProbabilityTable(weights, pointsTable) {
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

      const points = pointsTable ? pointsTable[tier] : undefined;
      const pointsCell = document.createElement('td');
      pointsCell.textContent = typeof points === 'number' ? `${points >= 0 ? '+' : ''}${points}P` : '-';

      tr.appendChild(tierCell);
      tr.appendChild(percentCell);
      tr.appendChild(pointsCell);
      tbody.appendChild(tr);
    });
}

// ====== 결과 카드 렌더링 ======
// 뽑기 직후 응답이든, 페이지 재진입 시 복원된 "오늘의 마지막 결과"든, 게스트의 저장된 결과든
// 모두 이 함수 하나로 결과 카드(이미지/티어/캐릭터명/포인트 배지/게스트 안내)를 채운다.
function renderResult(result, { guest, pointsDelta } = {}) {
  const card = document.getElementById('result-card');
  const img = document.getElementById('result-image');
  const tierEl = document.getElementById('result-tier');
  const nameEl = document.getElementById('result-name');
  const tierLink = document.getElementById('result-tier-link');
  const guestNotice = document.getElementById('guest-notice');
  const pointsEl = document.getElementById('result-points');
  if (!card || !result) return;

  img.src = getBasePath() + encodeURI(result.imagePath);
  img.alt = result.characterName;
  tierEl.textContent = LUCK_TIER_LABELS[result.tier] || `${result.tier}티어`;
  nameEl.textContent = result.characterName;
  tierLink.href = getBasePath() + result.tierPageUrl;

  if (pointsEl) {
    // 방금 뽑은 결과에만 +N/-N 포인트 배지를 보여준다 (히스토리 복원 시엔 delta를 모르므로 숨김).
    if (typeof pointsDelta === 'number') {
      pointsEl.textContent = `${pointsDelta >= 0 ? '+' : ''}${pointsDelta}P`;
      pointsEl.classList.toggle('luck-result-points-minus', pointsDelta < 0);
      pointsEl.hidden = false;
    } else {
      pointsEl.hidden = true;
    }
  }

  if (guestNotice) guestNotice.hidden = !guest;
  card.hidden = false;
}

// ====== 내 뽑기 이력 렌더링 (회원 전용) ======
// 서버는 최근 N건(5건)만 유지하고 오래된 기록은 자동 삭제하는 정책이므로,
// 여기서는 받은 items를 그대로 최신순 리스트로 나열하기만 하면 된다.
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
    const points = luckPointsTable[item.tier];
    const pointsText = typeof points === 'number' ? ` · ${points >= 0 ? '+' : ''}${points}P` : '';
    row.textContent = `${item.drawDate} · ${LUCK_TIER_LABELS[item.tier] || item.tier + '티어'} · ${item.characterName}${pointsText}`;
    list.appendChild(row);
  });
}

// 비회원은 서버에 이력을 남기지 않으므로, 이력 영역에는 목록 대신 로그인 유도 문구만 보여준다.
function showLoginRequiredHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = '';
  const notice = document.createElement('p');
  notice.className = 'luck-history-empty';
  notice.textContent = '로그인하면 내 뽑기 기록을 볼 수 있어요.';
  list.appendChild(notice);
}

// ====== 회원: 서버가 내려주는 횟수/쿨다운 상태를 그대로 반영 ----
// 프론트는 남은 횟수·쿨다운을 직접 계산하지 않는다 — 오직 서버 응답(status)을 그대로 표시할 뿐이며,
// 실제 제한 판정(20회/3분)은 항상 백엔드가 수행한다. status는 /today 조회 또는 방금의
// /daily 응답(POST 결과)에서 온다. 세 가지 상태를 순서대로 처리:
// 1) 오늘 횟수 소진 → 버튼 비활성 + "내일 다시" 안내
// 2) 쿨다운 중 → 버튼 비활성 + 초 단위 카운트다운, 끝나면 자동으로 버튼 재활성화
// 3) 바로 뽑기 가능 → 버튼 활성화
function renderMemberStatus(status) {
  const btn = document.getElementById('draw-btn');
  const statusEl = document.getElementById('draw-status');
  if (!btn || !statusEl) return;

  clearCooldownTimer();

  const pointsText = typeof status.points === 'number' ? ` · 보유 포인트 ${status.points}P` : '';

  if (status.remainingToday <= 0) {
    btn.disabled = true;
    btn.textContent = '오늘 뽑기 횟수 소진 (내일 다시)';
    statusEl.textContent = `오늘 ${status.dailyLimit}/${status.dailyLimit}회를 모두 사용했습니다.${pointsText}`;
    return;
  }

  statusEl.textContent = `오늘 남은 횟수 ${status.remainingToday}/${status.dailyLimit}${pointsText}`;

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

// ====== 게스트: localStorage 마지막 체크 시각으로 24시간 안내만 표시 (서버 강제 아님) ----
// 비회원은 서버가 신원을 구분할 수 없어 진짜 서버측 제한을 걸 수 없다.
// 대신 브라우저의 localStorage에 "마지막으로 체크한 시각 + 그때의 결과"를 저장해두고,
// 24시간이 지나지 않았으면 클라이언트 단계에서 안내만 보여주는 방식으로 흉내 낸다.
// 이 값은 사용자가 개발자도구 등으로 얼마든지 지우거나 조작할 수 있으므로 "보안"이 아니라
// 순수 UX(반복 클릭 방지 안내) 목적이며, LUCK_GUEST_STATE_KEY는 홈 미니 위젯(index-home.js)과
// 동일한 키를 사용해 두 화면 간 상태를 공유한다.

// localStorage에 저장된 게스트 상태({ lastDrawAt, result })를 읽어온다.
// 저장된 적 없거나 JSON이 깨졌거나 localStorage 접근이 막힌 환경(예: 프라이빗 모드 일부)이면
// null을 반환해 호출부가 "아직 뽑은 적 없음"으로 취급하게 한다.
function getGuestState() {
  try {
    const raw = localStorage.getItem(LUCK_GUEST_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

// 게스트가 방금 뽑은 결과와 현재 시각을 localStorage에 기록한다.
// 쓰기가 실패해도(용량 초과, 접근 차단 등) 뽑기 기능 자체는 이미 끝난 상태이므로 조용히 무시한다.
function setGuestState(result) {
  try {
    localStorage.setItem(LUCK_GUEST_STATE_KEY, JSON.stringify({ lastDrawAt: Date.now(), result }));
  } catch (err) {
    /* localStorage 사용 불가 환경 — 안내만 못 할 뿐 기능은 계속 동작 */
  }
}

// 저장된 마지막 체크 시각으로부터 24시간(GUEST_COOLDOWN_MS)이 지났는지 판정.
// true면 onClickDaily가 서버 호출조차 하지 않고 바로 안내 알림을 띄운다.
function isGuestOnCooldown() {
  const state = getGuestState();
  if (!state) return false;
  return Date.now() - state.lastDrawAt < GUEST_COOLDOWN_MS;
}

// 페이지 진입 시(비로그인 상태) 게스트 상태를 화면에 반영.
// 저장된 기록이 없으면 안내 문구만, 있으면 마지막 결과를 결과 카드에 복원하고
// 남은 대기 시간을 카운트다운으로 보여준다(이미 24시간이 지났다면 바로 "다시 체크 가능" 문구).
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

// 페이지 로드시 1회: 서버의 확률/포인트 설정을 받아 luckPointsTable 캐시에 저장하고 표로 렌더링.
// luckPointsTable은 이후 renderHistory에서 각 이력 항목 옆에 획득 포인트를 표시할 때도 재사용된다.
async function loadConfig() {
  const { ok, data } = await fetchLuckConfig();
  if (ok && data) {
    luckPointsTable = data.pointsTable || {};
    renderProbabilityTable(data.weights, luckPointsTable);
  }
}

// 페이지 로드시 1회: 로그인 여부에 따라 완전히 다른 경로로 현재 상태를 복원한다.
// - 비회원: 서버에 물어볼 것이 없으므로(이력 없음) 로그인 유도 문구 + localStorage 기반 게스트 상태만 표시.
// - 회원: /today로 "오늘 이미 뽑았는지/남은 횟수/쿨다운"을 확인해 버튼·결과 카드를 복원하고,
//   /history로 최근 이력 목록을 받아 채운다. 두 요청은 순차 실행이지만 서로 독립적이라
//   실패해도(ok=false) 다른 쪽 렌더링에는 영향을 주지 않는다.
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

// ====== 뽑기 버튼 클릭 핸들러 (핵심 흐름) ======
// 순서: (게스트 쿨다운 선제 체크) → 로딩 연출 시작 → 서버 요청 + 최소 대기시간 동시 진행
//       → 결과 반영 → (회원이면) 최신 상태/이력 재조회.
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

  btn.disabled = true;
  startDrawSuspense();

  try {
    // 실제 결과는 즉시 오지만, 긴장감을 위해 DRAW_SUSPENSE_MS 만큼은 무조건 로딩을 보여준다.
    const [{ ok, status, data }] = await Promise.all([drawDailyLuck(), sleep(DRAW_SUSPENSE_MS)]);
    stopDrawSuspense();

    if (ok && data.ok) {
      if (data.guest) {
        // 서버가 "이건 비회원 응답"이라고 표시해준 경우 — 서버는 이 결과를 어디에도 저장하지 않으므로
        // 프론트가 setGuestState로 localStorage에 대신 기록해 24시간 안내를 이어갈 수 있게 한다.
        renderResult(data.result, { guest: true });
        setGuestState(data.result);
        renderGuestStatus();
        btn.disabled = false;
        return;
      }

      // 방금 응답에 이미 최신 횟수/쿨다운/포인트가 들어있으므로 /today 재요청 없이 바로 반영.
      renderResult(data.result, { guest: false, pointsDelta: data.pointsDelta });
      renderMemberStatus({
        remainingToday: data.remainingToday,
        dailyLimit: data.dailyLimit,
        cooldownRemainingSec: data.cooldownRemainingSec,
        points: data.totalPoints,
      });

      const historyRes = await fetchLuckHistory(1);
      if (historyRes.ok) renderHistory(historyRes.data.items);
      return;
    }

    if (status === 429) {
      // 서버가 최종적으로 "지금은 안 됨"(횟수 소진/쿨다운 중)이라고 거부한 경우.
      // 프론트의 사전 체크(게스트 쿨다운 등)를 통과했더라도 서버가 최종 권위를 가지므로,
      // loadStatus()를 다시 불러 화면을 서버 기준 최신 상태로 맞춘다.
      alert(data.error || '지금은 뽑을 수 없습니다.');
      loadStatus();
      return;
    }

    // 그 외 실패(서버 오류 등) — 버튼을 다시 눌러볼 수 있게 원상 복구.
    btn.disabled = false;
    alert(data.error || '뽑기에 실패했습니다.');
  } catch (err) {
    stopDrawSuspense();
    btn.disabled = false;
    // luckDrawRequest가 GITHUB_STATIC 환경에서 던지는 예외는 guardStaticDeploy가 이미
    // 버튼을 막아뒀어야 정상이므로 여기선 조용히 무시(방어적 처리)하고, 그 외 네트워크 오류만 안내한다.
    if (err.message === 'GITHUB_STATIC') return;
    console.error('행운 뽑기 요청 실패:', err);
    alert('네트워크 오류로 뽑기에 실패했습니다.');
  }
}

// ====== 페이지 초기화 ======
// DOMContentLoaded 시 1회 실행. 탭 바인딩 → 정적 배포 가드 → 뽑기 버튼 바인딩 → 초기 데이터 로딩 순.
// guardStaticDeploy()가 true를 반환하면(백엔드 없는 정적 배포) 이후 버튼 이벤트 바인딩과
// 서버 데이터 로딩(loadConfig/loadStatus)을 아예 건너뛴다 — 어차피 실패할 요청이기 때문.
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
