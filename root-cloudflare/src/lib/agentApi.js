// ========================================================
// agentApi.js — 휴버대 에이전트 봇 API (/api/ai/agent/* → backend → ai-service)
// ========================================================
// 가이드 챗봇(aiApi.js)과 달리 회원 전용이고 포인트를 쓴다 — 요청에 로그인 토큰이 붙는다.
// 대화 내용은 서버에 저장되지 않는다(이 탭의 sessionStorage 에만 남는다).
import { apiRequest, apiStream } from './api';

export const AGENT_MAX_MESSAGE = 500;

// 요금표 · 작업 목록 · 내 포인트 · AI 서버 상태 — 로그인하지 않아도 요금표는 받는다
//   { ai: 'on'|'off'|'down', costs, levelLabels, offCost, limit, tasks: [{ task, label, level, cost, description, example }], member, points }
export const fetchAgentInfo = () => apiRequest('/api/ai/agent/info');

// 요청 실행 — 이벤트(plan · step · result · token · reset · done · error)가 올 때마다 onEvent 를 부른다.
//  history: [{ role, content }] 최근 대화, maker: { "0_갑급": ["이름", ...] } 지금 커스텀 메이커 배치(분석용)
//  반환: 스트림이 열렸으면 { ok: true }, 열리기 전에 막혔으면 { ok: false, status, data: { error, code } }
export const runAgent = (message, { history = [], maker = {}, signal, onEvent } = {}) => apiStream('/api/ai/agent/run', {
  body: { message, history: history.slice(-6), maker },
  signal,
  onEvent,
});
