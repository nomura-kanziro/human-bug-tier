---
area: backend
---

# 커밋 요약 — 제작한 티어표 공개 정식 오픈: 출품 · 투표 · 접수 시작 예약 · 자동 집계/직접 선정 발표

프론트 기록: [`../../frontend/13-event/03-showcase-launch-record.md`](../../frontend/13-event/03-showcase-launch-record.md)

## 요청

> 접수 상태가 되면 티어표 공개 페이지에서 직접 이벤트용 티어표를 제작해서 올리거나, 이미 올린 게시글을 가지고 참가하게.
> 우승자는 관리자가 직접 뽑거나, 자동으로 투표에서 가장 표를 받은 쪽에 포인트를 주는 방식으로.
> 관리자 페이지에서는 **접수 시작 예약**(날짜를 직접 골라 그날 열리게), 참여한 유저 중 직접 우승자 선정 또는 결과 공개일에 자동으로 투표 수를 계산해 발표.

이전에는 "뼈대만 · 관리자 전용"이었다(`01`, `02` 기록). 이번에 **회원에게 정식 공개**했다 — 참가·투표 라우트가 `requireAuth` 로 바뀐 이유다.

## 회차 상태 흐름

```
draft ──예약──▶ scheduled ──opensAt 도래(자동)──▶ open ──deadlineAt 도래(자동)/닫기──▶ closed ──revealAt 도래(자동)/발표──▶ revealed
  └─지금 열기────────────────────────────────────▲                     (투표는 closed 에서도 revealAt 까지 계속)
```

| 규칙 | 내용 |
|------|------|
| 동시에 진행할 수 있는 회차 | **하나뿐**(scheduled/open/closed). 다른 회차의 예약·열기는 409 |
| 예약 | 작성 중 회차 + **마감 시각 필수** + 접수 시작이 **미래** + 시작<마감. 그 시각에 스케줄러(1분 주기)나 조회 시 자동으로 open |
| 지금 열기 | 마감 시각 필수(미래). 공개 시각이 비었으면 마감+30분 |
| 접수 닫기 | open→closed. 공개 시각이 없거나 지났으면 지금+30분(투표할 시간을 남김) |
| 수정 | draft/scheduled/open/closed(발표 후 불가). 이미 시작된 회차의 시작·마감 시각은 고정 |
| 삭제 | draft/scheduled 만 |

## 회원 기능

| 동작 | 라우트 | 규칙 |
|------|--------|------|
| 현황 조회 | `GET /showcase` (`optionalAuth`) | 진행 중 회차 → 없으면 가장 최근 발표 회차. **draft 는 숨김**. `viewer`(내 출품·내 투표·canEnter/canVote) 포함 |
| 내 게시글 목록 | `GET /showcase/my-posts` | 내 **공개** 글만(이메일 우선·없으면 닉네임 — 기존 소유권 기준), 가벼운 필드만 |
| 출품 | `POST /showcase/entry {tierListId}` | 접수 중·마감 전 / **내 글만**(403) / **공개 글만**(400) / 1인 1작품(409) |
| 출품 취소 | `POST /showcase/entry/cancel` | 접수 중에만. 그 작품에 모인 표도 함께 삭제, 선정돼 있었으면 해제 |
| 투표 | `POST /showcase/vote {entryId}` | open 또는 closed(공개일 전). **1인 1표**: 다른 작품이면 표가 이동, 같은 작품이면 취소. **내 작품 불가**(400) |

- **참가·투표 자격**: 이메일 인증을 마친 일반 회원만. 관리자 계정·미인증 계정은 403(표 몰아주기 방지).
- **투표 수는 발표 전에 회원에게 내려주지 않는다**(눈치 투표 방지) — 서버가 필드 자체를 뺀다. 관리자에게는 항상 보인다. 발표 후에는 득표순 순위와 함께 공개.
- 투표 수는 별도 카운터 없이 `EventShowcaseVote` 를 집계해서 구한다(어긋날 일이 없다).

## 관리자 기능 (모두 `requireAdmin`)

| 라우트 | 용도 |
|--------|------|
| `GET /showcase/admin?id=` | 최근 10건 목록(참가/투표 수, **선정 대기 여부**) + 선택 회차의 출품작·표 수(표 많은 순) |
| `POST /showcase/save` | 생성/수정 `{ id?, title, description, opensAt, deadlineAt, revealAt, awardPoints, winnerMode }` — 시각 순서·상금(1~1,000,000P 정수) 검증 |
| `POST /showcase/status` | `{ id, action: schedule / unschedule / open / close / select / reveal / delete, entryId? }` |

옛 `POST /showcase`(관리자 저장)·`POST /showcase/reveal` 은 위 두 라우트로 대체되어 사라졌다.

## 우승자 결정 · 발표

- `winnerMode: 'votes'` — 결과 공개일에 **표가 가장 많은 작품**이 우승(동률은 먼저 출품한 작품). 표가 하나도 없으면 우승자 없이 종료(`resultNote` 에 사유).
- `winnerMode: 'manual'` — 관리자가 참가작을 **직접 선정**(`select`)해야 한다. 선정 전에는 **공개일이 지나도 자동 발표하지 않고 "선정 대기"** 로 기다린다(출품작이 없으면 그냥 종료).
- 어느 방식이든 관리자가 `selectedEntryId` 를 골라 두면 **그 작품이 표 수보다 우선**한다. `reveal` 에 `entryId` 를 주면 지금 그 작품으로 발표.
- 직접 선정 방식에서 선정 없이 `reveal` 하면 400("우승 작품을 먼저 선정").
- 발표(`revealShowcaseDoc`): 상태를 **원자적으로 revealed 로 선점**(`findOneAndUpdate`)한 뒤 우승자 지갑(`LuckProfile.points`)에 상금 지급 — 스케줄러와 관리자 버튼(또는 버튼 두 번)이 동시에 와도 **상금은 한 번만** 나간다.
- 알림: 우승자에게 "🏆 우승 — 상금 NNNP", **출품자·투표자 전원**에게 "결과 발표"(닉네임 기준 중복 제거).

## 그 밖의 변경

- `profileController.propagateNickname`: 닉네임을 바꾸면 **출품작·투표·메모리 기록의 표시 닉네임도 함께 갱신**(알림 수신자를 닉네임으로 찾기 때문). `EventMemorySession` 모델 주석에는 "갱신한다"고 적혀 있었지만 실제로는 빠져 있던 것을 바로잡았다.
- 스케줄러 `startEventScheduler`: 예약 시각 도래(scheduled→open) 단계를 추가.

## 주요 파일

| 파일 | 내용 |
|------|------|
| `backend/models/EventShowcase.js` | `scheduled` 상태, `opensAt/openedAt`, `awardPoints`, `winnerMode`, `selectedEntryId`, 우승자 상세 |
| `backend/models/EventShowcaseVote.js` | 신규 — 투표(회차당 1인 1표 유니크) |
| `backend/controllers/eventController.js` | 티어표 공개 절 재작성(조회·출품·취소·투표·관리·발표·스케줄러) |
| `backend/routes/eventRoutes.js` | 회원/관리자 라우트 분리 |
| `backend/controllers/profileController.js` | 이벤트 닉네임 전파 |

## 확인

API 테스트 94건 통과 — 접근 제어(401/403) · 입력 검증 · **예약 → 실제 시간 경과로 자동 open → 자동 closed → 자동 발표** · 남의 글/비공개 글/중복 출품 거부 ·
미인증·관리자 계정 거부 · 1인 1표·이동·취소·내 작품 금지 · 출품 취소 시 표 삭제 · 투표 수 은닉 · 마감 후 투표 유지 · 자동 집계 우승 + 상금 + 알림(우승자/참가자/투표자) ·
관리자 직접 선정이 표 수보다 우선 · **동시 발표 시 상금 1회** · 직접 선정 방식의 선정 대기 · 무투표/무출품 종료 · 삭제/닫기 규칙. 기존 이벤트 API 테스트 회귀 통과.

알려진 것: 우승자는 1명(상금도 1명분)이다. 투표 수 기반이므로 "신뢰도"는 별도 가중치 없이 이메일 인증 회원의 1인 1표로 갖췄다(계정 나이·활동량 가중은 하지 않음).
회차 진행 중에 원본 게시글을 삭제하면 출품작 카드의 "티어표 보기" 링크는 사라진 글을 가리킨다(제목·썸네일은 복사본이라 화면은 유지).
