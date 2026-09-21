---
area: backend
---

# 커밋 요약 — 메모리 게임 "기록 이벤트(회차)": 관리자가 열고 닫고 정산

프론트 기록: [`../../frontend/13-event/02-admin-event-management-record.md`](../../frontend/13-event/02-admin-event-management-record.md)

## 요청

> 티어표 공개 같은 건 관리자 전용 페이지에서 관리하고, 메모리 게임 기록 이벤트도 관리자 페이지에서 관리자가 직접 열 수 있도록.

## 무엇이 바뀌었나

이전에는 메모리 게임이 **언제나 열려 있었고** "정산 안 된 완주 기록 전부"가 암묵적인 한 기간이었다
(`POST /memory/settle` 한 번이 기간을 닫음). 이제는 **관리자가 회차(`EventMemoryPeriod`)를 만들고 열어야** 게임이 시작되며,
그 회차 동안의 완주 기록만 순위에 들어간다.

### 회차 상태

```
draft(작성 중) ──열기──▶ open(진행 중) ──닫기 / 자동 마감──▶ closed(마감·정산 대기) ──정산──▶ settled(정산 완료)
       └─삭제                         └────────── 진행 중에 바로 정산 ──────────┘
```

| 규칙 | 내용 |
|------|------|
| 동시에 열 수 있는 회차 | **하나뿐** (순위·상금이 섞이지 않게). 이미 열린 게 있으면 409 |
| 게임 시작 | 열린 회차가 있을 때만. 없으면 `409 { code: 'NO_OPEN_PERIOD' }` |
| 1위 상금 | 기본 1000P, **1000P 이상의 정수**(요구사항 "1000 이상"), 상한 1,000,000P(오타 방지) |
| 자동 마감 | `endsAt`(선택)이 지나면 **닫히기만** 한다. **상금은 자동 지급하지 않는다** — 포인트가 나가는 일이라 관리자가 정산을 눌러야 한다 |
| 수정 | `draft`·`open` 만. 진행 중 회차의 마감 시각을 과거로는 못 바꿈. 마감/정산된 회차는 409 |
| 열기 | `draft` 만. 마감 시각이 이미 지난 회차는 400 |
| 삭제 | `draft` 만 |

### 순위·판 처리

- 순위는 **회차 단위**(`EventMemorySession.periodId`)이고 **한 사람당 최고 기록 하나**만 올라온다(같은 기록이면 먼저 끝낸 사람이 앞).
  전에는 같은 사람의 여러 기록이 순위를 채울 수 있었다.
- 판이 진행되는 도중 회차가 닫히거나 마감 시각을 넘기면, 그 판의 단계 신호는 `409 { code: 'PERIOD_CLOSED' }` 로 거부되고 판은 삭제된다.
  회차를 닫을 때도 끝나지 않은 판은 정리한다.
- 공개 순위 API(`GET /memory/leaderboard`)는 **열린 회차가 있으면 그것을, 없으면 가장 최근에 끝난 회차의 최종 순위**를 돌려주고
  `period`(제목·상태·상금·우승자)와 `canPlay` 를 함께 내려 프론트가 "진행 중 아님"을 그릴 수 있게 한다.

### 정산

1위(가장 빠른 기록) 지갑(`LuckProfile.points`)에 회차의 상금을 지급하고, 1위 기록에 `settledAt/awardedPoints` 를 찍고,
`Notification`(`event_result`, 링크 `/event#memory`)을 보낸다. 알림이 실패해도 상금 지급은 이미 끝났으므로 정산은 성공으로 돌려준다.
완주 기록이 하나도 없으면 상금 없이 `settled`(winner=null)로 종료해 회차가 영원히 정산 대기로 남지 않게 한다.
이미 정산한 회차를 다시 정산하면 409 라 **상금이 중복 지급되지 않는다**.

## API

모두 `requireAdmin`(관리자 토큰) — 일반 회원 403 / 무인증 401.

| 메서드·경로 | 용도 |
|-------------|------|
| `GET /api/events/memory/admin` | 최근 회차 10건 + 회차별 참가자 수·상위 3 + 상금 한도 |
| `POST /api/events/memory/period` | 회차 생성/수정 `{ id?, title, description, awardPoints, endsAt }` |
| `POST /api/events/memory/period/status` | `{ id, action: 'open' / 'close' / 'settle' / 'delete' }` |

**제거**: `POST /api/events/memory/settle` (기간 개념이 회차로 바뀌어 없앰 — 호출하면 404).

## 티어표 공개

백엔드 API 는 그대로(전부 `requireAdmin`). 관리 **화면**만 이벤트 페이지에서 관리자 페이지로 옮겼다.

## 주요 파일

| 파일 | 내용 |
|------|------|
| `backend/models/EventMemoryPeriod.js` | 신규 — 회차(제목·상태·상금·마감·우승자) |
| `backend/models/EventMemorySession.js` | `periodId` 추가 + 회차별 순위 인덱스 |
| `backend/controllers/eventController.js` | 메모리 섹션 재작성(회차·순위·정산), `startShowcaseScheduler` → `startEventScheduler`(티어표 공개 + 회차 자동 마감) |
| `backend/routes/eventRoutes.js` | 회차 관리 라우트 3개, `/memory/settle` 제거 |
| `backend/server.js` | 스케줄러 이름 변경 반영 |

## 확인

API 테스트 62건 통과 — 열린 회차 없음 → 시작 409 · 관리자 접근 제어 401/403 · 입력 검증(제목 / 상금 999·소수·문자·상한 / 마감 형식) ·
동시 2회차 열기 409 · 실제 3단계 플레이가 회차에 묶여 저장 · 한 사람 최고 기록 1개 · 진행 중 수정 · 닫기 시 진행 중인 판 정리 ·
마감된 회차의 살아 있는 판 무효 · 정산으로 설정 상금 지급/알림/중복 정산 불가 · 마감 시각 자동 종료(상금 자동 지급 없음) ·
기록 없는 회차 정산 · 진행 중 바로 정산 · 삭제/알 수 없는 동작. 기존 이벤트 API 테스트(퀴즈·티어표 공개)도 회귀 통과.

알려진 것: 관리자 화면의 "최근 회차" 목록은 10건까지만 보여 준다. 회차 도입 이전에 쌓인 기록(`periodId` 없음)은 어느 회차 순위에도 들어가지 않는다.
