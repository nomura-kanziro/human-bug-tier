// ========================================================
// api.js — API 베이스 판별 + 인증 헤더 + fetch 래퍼 (바닐라 common.js의 getApiBase/getAuthHeaders 이식)
// ========================================================
// 규칙(불변): 개발 포트(5173 등) → http://localhost:5000, 동일 오리진 → '', GitHub Pages → 'GITHUB_STATIC'
// Vite dev(5173)는 vite.config.js 프록시로 /api 를 :5000 에 넘기므로 ''(동일 오리진)로 취급해도 되지만,
// 바닐라와 동일하게 판별해 두어 프록시 없이 열어도 동작하게 한다.
export const GITHUB_STATIC = 'GITHUB_STATIC';

export function getApiBase() {
  const { protocol, hostname, port } = window.location;
  if (/\.github\.io$/i.test(hostname)) return GITHUB_STATIC;
  if (
    protocol === 'file:'
    || port === '5500' || port === '3000' || port === '5173'
    || port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }
  return '';
}

export function isStaticPreview() {
  return getApiBase() === GITHUB_STATIC;
}

// localStorage.authToken 이 있으면 Authorization: Bearer 를 붙인다 (유저 토큰 규칙).
export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('authToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}

// 관리자 토큰 규칙: adminAuthToken + 서버 requireAdmin. 프론트만으로 관리 API를 열지 않는다.
export function getAdminAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('adminAuthToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}

// 공용 요청 래퍼. 정적 미리보기(GITHUB_STATIC)면 요청 자체를 하지 않고 에러를 던진다.
// 반환: { ok, status, data } — 호출부가 res.ok/res.status 를 매번 따로 다루지 않게 한다.
export async function apiRequest(path, { auth = true, headers = {}, ...options } = {}) {
  const base = getApiBase();
  if (base === GITHUB_STATIC) throw new Error(GITHUB_STATIC);
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: auth ? getAuthHeaders(headers) : { 'Content-Type': 'application/json', ...headers },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
