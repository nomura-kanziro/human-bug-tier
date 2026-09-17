// ========================================================
// authApi.js — 인증 API (user_login/auth_api.js + 각 페이지 fetch 이식)
// ========================================================
// 바닐라의 getAuthApiBase() 는 '/api/auth' 까지 붙여서 돌려줬다. 여기서는 공용 apiRequest 를
// 그대로 쓰되 경로만 /api/auth/* 로 맞춘다(인증 헤더는 불필요 — 전부 비로그인 상태 호출).
import { apiRequest } from './api';

const auth = (path, options) => apiRequest(`/api/auth${path}`, { auth: false, ...options });

export const loginRequest = (userId, password) =>
  auth('/login', { method: 'POST', body: JSON.stringify({ userId, password }) });

export const registerRequest = (email, password, nickname) =>
  auth('/register', { method: 'POST', body: JSON.stringify({ email, password, nickname }) });

export const findIdRequest = (email) =>
  auth('/find-id', { method: 'POST', body: JSON.stringify({ email }) });

export const forgotPasswordRequest = (nickname, email) =>
  auth('/forgot-password', { method: 'POST', body: JSON.stringify({ nickname, email }) });

export const validateResetTokenRequest = (token) =>
  auth(`/validate-reset-token?token=${encodeURIComponent(token)}`);

export const resetPasswordRequest = (token, password) =>
  auth('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });

// 메일 발송 실패 원인을 사용자에게 보여줄 문구로 바꾼다.
// 서버가 여러 발송 경로(Brevo→Resend→Gmail)를 시도하고 실패 사유를 detail 에 담아 준다.
export function accountFindErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (data.code === 'EMAIL_NOT_CONFIGURED') {
    return data.error || '이메일 발송이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
  }
  if (data.code === 'EMAIL_SEND_FAILED') {
    const base = data.error || '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return data.detail ? `${base} (${data.detail})` : base;
  }
  return data.error || fallback;
}
