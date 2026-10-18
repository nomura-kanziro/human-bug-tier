---
area: backend
feature: ai
---

# Express `/api/ai` — AI 전용 서비스(ai-service) 프록시

> AI 기능 전체 그림은 [`../../ai/01-ai-service-record.md`](../../ai/01-ai-service-record.md). 이 문서는 **백엔드(Express)** 쪽 기록.
> 화면은 [`../../frontend/15-ai/01-ai-helper-page-record.md`](../../frontend/15-ai/01-ai-helper-page-record.md).

## 관련 커밋

- `4e50a22` (2026-10-18) feat(ai): Express /api/ai 프록시 — 입력 검사·IP당 요청 제한·공유 키·AI 서비스 장애 격리

## 왜 프록시인가

브라우저가 AI 서비스(Python)를 직접 부르지 않는다. AI 서비스는 서버 안쪽 `127.0.0.1:8000` 에만 열고, 바깥 요청은 항상 Express `/api/ai` 로 받아 **먼저 검사·제한**한 뒤 넘긴다(LLM 비용·남용 방지). Cloudflare Pages 의 `/api/*` → Oracle 프록시를 그대로 쓰므로 Pages 쪽 변경은 없다.

## API (`backend/routes/aiRoutes.js`, `server.js` 에 `app.use('/api/ai', aiRoutes)`)

| 메서드 | 경로 | 동작 |
|---|---|---|
| GET | `/api/ai/questions` | ai-service `/questions?count=3` 결과 → `{ ok, questions: [3개] }` |
| POST | `/api/ai/chat` | `{ message, history? }` → `{ ok, answer, mode: 'llm'\|'fallback'\|'fixed', sources: [최대 6] }` |

공개(로그인 불필요). 대화는 **저장하지 않는다**(메모리 상 요청 처리만).

## 검사·제한

| 항목 | 값 |
|---|---|
| 질문 | 1~500자(공백 제거 후), 비면 400 |
| 이전 대화 | `role` 이 `user`/`assistant` 이고 내용이 있는 것만, **최근 12개**, 각 2000자까지 |
| 요청 수 | IP 당 **10분에 20번**(메모리 `Map`, 10분마다 오래된 IP 정리). 넘으면 **429** + `retryAfterSec` + "N분 뒤에 다시" 문구. 서버 재시작 시 초기화(pm2 `instances 1` 전제) |
| 공유 키 | `AI_SERVICE_KEY` 가 있으면 `X-AI-Key` 헤더로 붙여 보냄(AI 서비스가 같은 값만 받음) |
| 타임아웃 | 기본 **3분**(`AI_TIMEOUT_MS`, 0 이면 제한 없음). 처음엔 45초였는데 로컬 LLM 이 GPU 상황에 따라 한 답에 30초 넘게 걸려 자주 503 이 나서 늘렸다(2026-10-18). 운영에서 Cloudflare 를 거치면 프록시 자체 제한(약 100초)이 따로 있다 |
| 장애 | AI 서비스 꺼짐·오류·시간 초과 → **503** `{ error: 'AI 도우미가 잠시 쉬는 중이에요…', unavailable: true }`. 사이트의 다른 기능은 영향 없음 |

## 환경 변수 (`backend/.env.example` 에 주석 추가)

| 키 | 기본 | 설명 |
|---|---|---|
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | AI 서비스 주소 |
| `AI_TIMEOUT_MS` | 180000 | AI 답을 기다리는 최대 시간(ms), 0 이면 제한 없음 |
| `AI_SERVICE_KEY` | (없음) | `ai-service/.env` 와 **같은 값**. 운영에서는 반드시 설정 |

## 확인

- 실제 uvicorn(AI 서비스) + 실제 `aiRoutes.js` 로: 질문·추천 질문 정상, 빈 질문 400, AI 서비스에 키 없이 직접 호출하면 401, **21번째 요청부터 429**.
- **백엔드 재시작이 필요하다** — 새 라우트라 재시작 전에는 "없는 API입니다"(404).
