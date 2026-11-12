---
area: backend
feature: ai
---

# Express `/api/ai/agent` — 에이전트 봇 프록시 · 포인트 차감

> 전체 그림은 [`../../features/agent-bot.md`](../../features/agent-bot.md) · ai-service 쪽은 [`../../ai/06-agent-bot-record.md`](../../ai/06-agent-bot-record.md).
> 이 문서는 **백엔드(Express)** 쪽 기록이다. 화면은 [`../../frontend/15-ai/02-agent-bot-ui-record.md`](../../frontend/15-ai/02-agent-bot-ui-record.md).

## 관련 커밋

- `cb4e9a9` (2026-11-12) feat(backend): 에이전트 봇 프록시 /api/ai/agent — 작업 강도별 포인트 차감·환불, 스트림 전달, 전용 조회 API

## API (`backend/controllers/aiAgentController.js`, `routes/aiRoutes.js` 에 연결)

| 메서드 | 경로 | 인증 | 동작 |
|---|---|---|---|
| GET | `/api/ai/agent/info` | optionalAuth | 요금표(`costs`·`levelLabels`·`offCost`) · 한도(`limit`) · 작업 목록(강도·요금·설명·예시) · AI 서버 상태(`on`/`off`/`down`) · 회원이면 `points` |
| POST | `/api/ai/agent/run` | requireAuth(회원) | `{ message, history?, maker? }` → NDJSON 이벤트 스트림. 관리자 계정은 403 `MEMBER_ONLY` |
| GET | `/api/ai/agent/data/posts` | ai-service 전용 | `?search=&sort=likes\|recent&limit=` — 공개 글만, 제목·작성자·설명·추천·조회·날짜(배치 데이터·썸네일 제외) + `total` |
| GET | `/api/ai/agent/data/notices` | ai-service 전용 | `?search=&limit=` — 공지·새 소식(고정 먼저), 본문은 태그를 뗀 앞 300자 |

`/agent/data/*` 는 `AI_SERVICE_KEY` 가 있으면 `X-AI-Key` 가 같은 요청만, 없으면(로컬) 이 서버 안에서 직접 온 요청만 받는다(`X-Forwarded-For` 가 붙은 요청은 거절). 검색어는 정규식 문자를 이스케이프한다.

## 실행 순서 (`runAgent`)

1. 회원 확인 → DB 연결 확인 → 입력 검사(500자, history 8개, maker 60칸) → 동시 실행 검사(409 `BUSY`) → 요청 수 제한(10분 12회, 429).
2. 회원 현재 상태 조회: `LuckProfile`(포인트·총 뽑기·최고 티어·오늘 횟수) · 출석(`describeAttendance`) · 내 글 집계(`TierList` 수·추천·조회). 잔액이 최소 요금(2P) 미만이면 402 `NO_POINTS`.
3. ai-service `POST /agent/run` 호출(토큰·이메일은 넘기지 않는다) → 응답 스트림을 줄 단위로 읽어 그대로 전달.
4. `plan` 이벤트: 강도 → 요금(`AGENT_COSTS`). AI 서버 OFF 면 가벼움 요금까지만. `findOneAndUpdate({ userId, points: { $gte: cost } }, { $inc: { points: -cost } })` 로 차감(동시에 요청해도 0 밑으로 안 내려감) + 원장 `agent_bot`. 모자라면 위쪽 요청을 끊고 `error`(`NO_POINTS`).
5. `error` 이벤트 · 중간 끊김 · 시간 초과(`AI_AGENT_TIMEOUT_MS`, 기본 5분) → 환불(원장에 "(환불)") 후 `error` 에 `refunded`·`points` 를 실어 보낸다.
6. 브라우저가 연결을 끊으면 위쪽 요청도 끊는다. 이미 차감한 포인트는 돌려주지 않는다(결과를 받고 끊는 것 방지).
7. 스트림 헤더 `Content-Type: application/x-ndjson` · `Cache-Control: no-cache, no-transform` · `X-Accel-Buffering: no`, 15초마다 `ping`.

## 요금

`AGENT_COSTS = { free: 0, light: 2, normal: 4, heavy: 8 }` — 값의 정본. 화면은 `/agent/info` 로 받아 쓰고, 지식 문서는 `ai-service/tests/test_knowledge_sync.py` 가 대조한다.
기준: 오늘의 행운 티어 1회가 −4~+10P, 출석이 하루 10~50P 인 경제에서 "티어표 초안 한 번 = 출석 하루치 안쪽".

## 그 밖의 변경

- `models/LuckPointLog.js` source enum 에 `agent_bot` 추가, `controllers/adminLuckController.js` 라벨 "에이전트 봇".
- `deploy/oracle/nginx-human-bug-tier.conf` — `/api/ai/agent/run` 전용 location(`proxy_buffering off`, `proxy_read_timeout 330s`). 서버 설정에는 손으로 추가한다.
- `.env.example` — `AI_AGENT_TIMEOUT_MS`.

## 확인

스케줄러가 도는 `server.js` 대신 **에이전트 봇 라우트만 띄운 시험용 서버**(격리 포트)에서 임시 회원으로 확인했다(같은 DB 로 백엔드를 두 개 켜면 랜덤 뽑기·이벤트 스케줄러가 중복 실행되기 때문).

| 경우 | 결과(원장) |
|---|---|
| 초안 → 요약 → 브리핑 → 검색 | 20P → −8 → −4 → −4 → −2 = 2P |
| 잔액 2P 로 분석(4P)·초안(8P) | 차감 없이 `NO_POINTS` |
| ai-service 가 `plan` 뒤 `error` | −8 뒤 +8 환불 |
| ai-service 가 `plan` 뒤 연결 끊음 | −8 뒤 +8 환불 |
| AI 서버 OFF 인 무거운 작업 | −2 |
| 비로그인 `/agent/run` | 401 |
| `/agent/data/posts` 안쪽 요청 / `X-Forwarded-For` 붙은 요청 | 200 / 403 |

끝난 뒤 임시 회원·프로필·원장을 지웠다(남은 것 0건).
