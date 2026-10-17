// ========================================================
// aiApi.js — AI 도우미 API (/api/ai/* → backend 프록시 → ai-service)
// ========================================================
// 로그인 없이 쓸 수 있으므로 토큰을 붙이지 않는다(auth:false). 대화 내용은 서버에 저장되지 않는다.
import { apiRequest } from './api';

export const AI_MAX_MESSAGE = 500;

export const fetchAiQuestions = () => apiRequest('/api/ai/questions', { auth: false });

// history: [{ role: 'user' | 'assistant', content }] — 최근 대화만 보낸다(서버도 다시 자른다)
export const askAi = (message, history = []) => apiRequest('/api/ai/chat', {
  auth: false,
  method: 'POST',
  body: JSON.stringify({ message, history: history.slice(-6) }),
});
