// luck-draw 전용 API 헬퍼.
// getApiBase() / getAuthHeaders() 는 common.js 전역 함수를 그대로 재사용한다 (재구현 금지).

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

function fetchLuckConfig() {
  return luckDrawRequest('/config');
}

function drawDailyLuck() {
  return luckDrawRequest('/daily', { method: 'POST' });
}

function fetchTodayLuck() {
  return luckDrawRequest('/today');
}

function fetchLuckHistory(page = 1) {
  return luckDrawRequest(`/history?page=${page}`);
}
