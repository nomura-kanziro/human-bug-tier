// luck-draw 전용 API 헬퍼.
// getApiBase() / getAuthHeaders() 는 common.js 전역 함수를 그대로 재사용한다 (재구현 금지).
// 이 파일은 "오늘의 행운 뽑기" 상세 페이지(luck-draw.js)뿐 아니라
// 메인 홈의 미니 위젯(index-home.js)에서도 그대로 <script>로 불러와 함수를 공유한다.
// 그래서 여기 함수들은 특정 화면 DOM에 의존하지 않고 순수하게 fetch 래핑만 담당한다.

// ====== 공통 요청 래퍼 ======
// 모든 luck-draw API 호출이 거치는 단일 통로.
// - apiBase: common.js의 getApiBase()가 실행 환경(로컬/배포/GitHub Pages 정적 호스팅)에 맞는
//   접두 경로를 판단해 반환한다. GitHub Pages처럼 백엔드가 없는 정적 배포에서는
//   'GITHUB_STATIC'을 던져서 호출부(luck-draw.js, index-home.js)가 "서버 필요" 안내로
//   분기하도록 한다 (실제 fetch 자체를 시도하지 않음).
// - headers: getAuthHeaders()가 localStorage.authToken이 있으면 Authorization 헤더를 자동으로
//   붙여준다. 토큰이 없으면(비회원) 헤더 없이 요청 → 백엔드가 게스트로 처리해 세션에 기록하지 않는다.
// - 응답 파싱은 실패해도 죽지 않도록 .catch(() => ({}))로 방어하고,
//   ok/status/data를 한 묶음으로 반환해 호출부가 매번 res.ok, res.status를 따로 다루지 않게 한다.
async function luckDrawRequest(path, options = {}) {
  const apiBase = getApiBase();
  if (apiBase === 'GITHUB_STATIC') {
    throw new Error('GITHUB_STATIC');
  }

  const res = await fetch(`${apiBase}/api/luck-draw${path}`, {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ====== 개별 엔드포인트 함수 ======
// 아래 4개는 실제 뽑기 흐름에서 쓰이는 얇은 래퍼. 경로/메서드만 다르고 나머지는
// luckDrawRequest 하나로 통일되어 있어, 백엔드 라우트가 바뀌면 이 파일만 고치면 된다.

// 티어별 당첨 확률(DAILY_TIER_WEIGHTS)과 티어별 지급 포인트표를 서버에서 받아온다.
// 확률/포인트는 서버 상수가 정본이므로 프론트는 하드코딩하지 않고 매 진입 시 조회해 표로 렌더링한다.
function fetchLuckConfig() {
  return luckDrawRequest('/config');
}

// "오늘의 행운 뽑기" 실행 요청. 회원이면 서버가 하루 횟수(20회)/3분 쿨다운을 검사한 뒤
// 확률표에 따라 티어를 뽑아 결과·남은 횟수·포인트 변동을 함께 응답한다.
// 비회원(토큰 없음)이면 서버가 별도 기록 없이 1회성 결과만 내려준다(게스트 쿨다운은 프론트 localStorage 책임).
function drawDailyLuck() {
  return luckDrawRequest('/daily', { method: 'POST' });
}

// 로그인 회원의 "오늘" 상태 조회 — 오늘 이미 뽑았다면 마지막 결과, 남은 횟수, 다음 뽑기까지
// 남은 쿨다운 초를 함께 받아 페이지 진입/새로고침 시 버튼·타이머 상태를 그대로 복원한다.
function fetchTodayLuck() {
  return luckDrawRequest('/today');
}

// 로그인 회원의 뽑기 이력 페이지를 가져온다(비회원은 서버에 이력이 없으므로 호출부에서 아예 건너뜀).
function fetchLuckHistory(page = 1) {
  return luckDrawRequest(`/history?page=${page}`);
}
