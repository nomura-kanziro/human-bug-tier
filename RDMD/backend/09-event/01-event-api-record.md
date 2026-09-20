---
area: backend
---

# 커밋 요약 — 이벤트 API (`/api/events`) 신설: 매일 퀴즈 · 메모리 게임 · 티어표 공개(뼈대)

프론트 쪽 기록: [`../../frontend/13-event/01-event-page-record.md`](../../frontend/13-event/01-event-page-record.md)

## 설계 원칙 — 포인트가 걸린 기능은 전부 서버가 정한다

세 기능 모두 포인트·순위가 걸려 있어서 **판정에 필요한 값은 브라우저에서 받지 않는다.**

| 값 | 어디서 정하나 | 이유 |
|----|---------------|------|
| 퀴즈 문제·보기·정답 | 서버 | 정답을 응답에 실어 보내면 개발자 도구에서 보인다. 안 푼 문제의 `correctIndex` 는 **응답에서 뺀다** |
| 퀴즈 상금 | 서버 | 클라이언트가 금액을 보내면 그대로 조작 가능 |
| 메모리 카드 배치 | 서버 | 배치를 미리 알면 무한 클리어 |
| 메모리 기록 시간 | 서버 시계 | 프론트가 보낸 ms 는 신뢰할 수 없다 |
| 당첨자·지급 | 서버 | 〃 |

프론트가 보내는 건 **보기 번호**와 **"이 단계 다 맞췄다"는 신호**뿐이다.

---

## 1. 매일 간단 퀴즈

- 출제: `backend/data/tierCatalog.js` 가 **프론트의 `src/data/tiers.json` 을 그대로 읽는다.**
  캐릭터 342명을 백엔드에 복사해 두면 티어표를 고칠 때마다 두 곳이 어긋나므로 사본을 만들지 않았다.
  (읽기 실패 시 `[]` 를 돌려주어 서버가 죽지 않게 한다.)
- 문제: 캐릭터 1명을 뽑고 **정답 티어/급 + 다른 슬롯 2개**를 섞어 3지선다를 만든다.
  티어 슬롯은 실제 데이터에 존재하는 조합 30가지(`9티어 미묘사 인원들` 같은 변칙 포함)에서만 고른다.
- 하루 1회: `{ userId, quizDate }` 유니크 인덱스. 날짜 경계는 `utils/kstDate.js` 의 `getKstDateString()`
  (한국 시간 0시 기준).
- 상금(맞혔을 때만): 가중치 추첨. **1~5P가 60%로 가장 흔하고 금액이 커질수록 확률이 낮다.**

| 구간 | 확률 |
|------|------|
| 1~5P | 60.0% |
| 6~20P | 22.0% |
| 21~50P | 10.0% |
| 51~120P | 5.0% |
| 121~300P | 2.2% |
| 301~600P | 0.6% |
| 601~1000P | 0.2% |

포인트 지갑은 새로 만들지 않고 기존 `LuckProfile.points` 를 그대로 쓴다(행운 뽑기·포커·사다리와 같은 지갑).

## 2. 메모리 게임

- `POST /memory/start` 가 세션을 만들고 **1단계 카드 배치**만 내려준다. 다음 단계 배치는 그 단계를 통과해야 나온다.
- `POST /memory/stage` 는 "다 맞췄다"는 신고만 받고, 경과 시간은 서버가 `startedAt`/직전 통과 시각으로 계산한다.
- 봇 방지: 한 쌍당 최소 150ms(`MEMORY_MIN_MS_PER_PAIR`). 그보다 빠르면 그 판을 무효 처리한다.
- 3단계(4×4 → 6×6 → 8×8) 완주 시 `totalMs` 확정 · `status: 'done'`.
- `GET /memory/leaderboard` 는 비회원도 볼 수 있고(`optionalAuth`), 로그인 상태면 "내 최고 기록"이 함께 온다.
- `POST /memory/settle` (관리자) — 기간을 마감하고 1위에게 `MEMORY_AWARD_POINTS`(1000P)를 지급 + 알림.

## 3. 제작한 티어표 공개 — 뼈대, 관리자 전용

요청대로 **정식 발매는 하지 않는다.** 네 개 라우트 전부 `requireAdmin` 이라 일반 회원 토큰으로는 401/403 이다
(화면만 숨긴 게 아니다). 정식 오픈 시 `GET /showcase` 와 `POST /showcase/entry` 두 줄만 `requireAuth` 로
바꾸면 되도록 라우터에 주석을 남겨 뒀다.

흐름: `draft` → **접수 열기**(`open`) → 마감 시각(`deadlineAt`)이 지나면 등록 차단(`closed`)
→ 기본 **마감 + 30분**(`revealAt`, 관리자가 직접 조정 가능)에 스케줄러가 발표하거나 관리자가 "지금 결과 발표"
→ `revealed` + **참가자 전원에게 알림**.

- 알림은 `Notification` 모델에 타입 `event_result` 를 추가해 보낸다.
- 스케줄러는 서버 기동 시 `startShowcaseScheduler()` 로 돌며, 발표 시각이 지난 회차를 찾아 처리한다.
- 같은 회차에 두 번 출품하면 409(`{ showcaseId, userId }` 유니크).

---

## 주요 파일

| 파일 | 내용 |
|------|------|
| `backend/routes/eventRoutes.js` | 신규 — `/api/events` 라우터(접근 제어가 여기 한 곳에 모여 있다) |
| `backend/controllers/eventController.js` | 신규 — 출제·채점·상금 추첨·메모리 판정·공개 스케줄러 |
| `backend/data/tierCatalog.js` | 신규 — 프론트 `tiers.json` 을 읽어 캐릭터/티어 슬롯 제공 |
| `backend/models/EventQuizAttempt.js` | 신규 — 하루 1문제 기록 |
| `backend/models/EventMemorySession.js` | 신규 — 메모리 세션·단계 기록 |
| `backend/models/EventShowcase.js`, `EventShowcaseEntry.js` | 신규 — 공개 회차 / 참가 |
| `backend/models/Notification.js` | 타입 `event_result` 추가 |
| `backend/server.js` | 라우터 연결 + 공개 스케줄러 기동 |

## 확인

API 테스트 51건 통과.

- 퀴즈: 보기 3개(티어+급) 생성, 안 푼 문제에 정답 미포함, 하루 1회(재요청 409), 오답 0P / 정답 1~1000P가
  `LuckProfile.points` 에 실제 반영, 확률표 합계 100%·내림차순
- 메모리: 카드 16/36/64장, 너무 빠른 신고 거부, `totalMs` 서버 계산, 순위표, 관리자 정산 시 1000P 지급
- 공개: 일반 회원 토큰 403 / 비로그인 401, `revealAt` 자동 = 마감+30분, 중복 출품 409,
  발표 시 참가자 전원 알림 생성

테스트로 만든 임시 계정·세션·회차는 모두 삭제했다.
