// ========================================================
// api.js — 상태 확인 요청(웹 프론트 src/lib/api.js 와 같은 /api 를 부른다)
// ========================================================
// 가볍게 유지한다: 라이브러리 없이 fetch + AbortController 시간 제한, 응답은 필요한 값만 꺼낸다.
// 지금 뼈대 단계에서는 "연결이 되는지"만 확인한다 — 로그인·게시판 등은 다음 단계에서 같은 래퍼로 붙인다.
import { REQUEST_TIMEOUT_MS } from './config';

// 요청 하나 — { ok, status, ms, data } 또는 { ok:false, error } (예외를 밖으로 던지지 않는다)
export async function getJson(base, path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, ms: Date.now() - started, data };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err?.name === 'AbortError' ? '시간 초과' : '연결 실패' };
  } finally {
    clearTimeout(timer);
  }
}

// 확인할 항목 — 키, 화면 이름, 경로, 응답을 한 줄 요약으로 바꾸는 함수
export const CHECKS = [
  {
    key: 'api',
    label: '사이트 API',
    path: '/api/site/status',
    summarize: (r) => (r.ok && r.data?.api === 'ok' ? `정상 · DB ${r.data.db === 'connected' ? '연결됨' : r.data.db}` : null),
  },
  {
    key: 'notice',
    label: '공지 불러오기',
    path: '/api/notices?limit=1',
    summarize: (r) => (r.ok && Array.isArray(r.data) ? (r.data[0]?.title ? `최근 공지: ${r.data[0].title}` : '공지 없음') : null),
  },
  {
    key: 'ai',
    label: 'AI 도우미(휴버봇)',
    path: '/api/ai/status',
    summarize: (r) => {
      if (!r.ok || !r.data) return null;
      if (r.data.ai === 'on') return `AI 서버 ON${r.data.model ? ` · ${r.data.model}` : ''}`;
      if (r.data.ai === 'off') return 'AI 서버 OFF · 문서 답으로 동작';
      return 'AI 서비스 꺼짐';
    },
  },
  {
    key: 'agent',
    label: '에이전트 봇',
    path: '/api/ai/agent/info',
    summarize: (r) => {
      if (!r.ok || !r.data) return null;
      const p = r.data.pricing;
      const claude = r.data.claude ? 'Claude 엔진 사용 가능' : 'Claude 엔진 꺼짐';
      return `${r.data.tasks?.length || 0}가지 작업 · 무료 하루 ${p?.freeDailyLimit ?? '-'}회 · ${claude}`;
    },
  },
];

// 모든 항목을 동시에 확인한다(순서대로 기다리지 않는다 — 가장 느린 하나만큼만 걸린다)
export async function runChecks(base) {
  const results = await Promise.all(CHECKS.map(async (c) => {
    const r = await getJson(base, c.path);
    const text = c.summarize(r);
    return {
      key: c.key,
      label: c.label,
      ok: Boolean(text) && !(c.key === 'ai' && r.data?.ai === 'down'),
      text: text || r.error || `응답 오류(${r.status})`,
      ms: r.ms,
    };
  }));
  return { at: new Date(), results };
}
