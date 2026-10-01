---
area: backend
feature: luck-draw
---

# 커밋 요약 — 포인트 증감 원장(LuckPointLog) + 관리자 행운 뽑기 조회 API

## 요청

> 관리자 전용 페이지에 "행운 뽑기 관리" — 행운 뽑기 3개를 이용하는 사람들의 기록을 유저마다 확인, 플레이하는 사용자의 포인트 내역 확인.

## 관련 커밋

- `a9df3ba` (2026-10-01) feat(admin): 행운 뽑기 관리 신설 — 회원별 뽑기 기록과 포인트 증감 원장 조회
- 화면: [`../../frontend/07-admin/12-admin-luck-manager-record.md`](../../frontend/07-admin/12-admin-luck-manager-record.md)

## 왜 원장이 필요했나

`LuckProfile` 은 **현재 잔액만** 들고 있어서 "언제 무엇으로 얼마가 바뀌었는지"를 알 방법이 없었다. 기존 기록도 부족했다.

| 출처 | 기존 기록 | 한계 |
|---|---|---|
| 오늘의 행운 티어 | `LuckDraw` | 회원당 최근 5건만 남고, 포인트 증감 필드가 없다 |
| 포커 | `LuckPokerRound` | 배팅액만 있고 승패·지급액을 저장하지 않았다(계산 후 응답만) |
| 랜덤 뽑기 | `LuckLadderBet.pointsDelta` | 이것만 실제 증감이 남아 있었다 |
| 이벤트 상금 3종 | 각 이벤트 문서 | 지갑 기준 흐름으로 모아 볼 수 없다 |

## 구현

**원장** — `models/LuckPointLog.js`: `userId`, `source`, `delta`(실제 반영 증감), `balanceAfter`(직후 잔액), `detail`(한 줄 설명, 200자), `refId`(관련 문서), `createdAt`. 인덱스 `{userId:1, createdAt:-1}`.

**기록 함수** — `utils/luckPointLog.js` `recordPointChange()`: 증감 0 은 남기지 않고, **실패해도 예외를 던지지 않는다**(로그만). 원장 때문에 뽑기·정산·상금 지급이 실패하면 안 되기 때문.

**연결한 7곳** (모두 `LuckProfile` 저장 직후):

| source | 위치 | 설명 예 |
|---|---|---|
| `daily_tier` | `luckDrawController.drawDailyTier` | "오늘의 행운 티어 5티어 · 캐릭터" |
| `poker_bet` | `luckPokerController.dealPoker` | "행운 티어 포커 배팅 500P" |
| `poker_payout` | `luckPokerController.playPoker` | "행운 티어 포커 승리 (트리플 vs 딜러 원페어) · 배팅 1000P" |
| `ladder` | `luckLadderController.settleRound` | "랜덤 뽑기 811회차 묶음 4~6티어 승리 (결과 5티어 · 캐릭터)" |
| `quiz` | `eventController.answerQuiz` | "매일 퀴즈 정답 상금 (날짜 · 캐릭터)" |
| `memory_award` | 메모리 기록 정산 | "메모리 기록 이벤트 1위 상금 [회차명]" |
| `showcase_award` | 티어표 공개 발표 | "티어표 공개 우승 상금 [회차명]" |

- 이벤트 쪽은 공용 `addPoints(userId, delta, log)` 에 선택 인자 `log` 를 추가했다.
- 랜덤 뽑기 설명용 `betLabel(betType, betValue)`("묶음 4~6티어"·"홀수 티어"·"3티어 지목")을 `luckLadderController` 에서 내보낸다.

**포커 판 결과 저장** — `LuckPokerRound` 에 `outcome`(win/lose/push)·`payout`·`pointsDelta`·`playerHand`·`dealerHand` 추가. `playPoker` 정산 뒤 `updateOne` 으로 채운다(실패해도 응답은 그대로). 그 전에 정산된 판은 null.

**관리자 API** — `controllers/adminLuckController.js`, `routes/adminRoutes.js`(모두 `requireAdmin`, 조회 전용):

| 메서드·경로 | 내용 |
|---|---|
| `GET /api/admin/luck/users?q=&page=` | 지갑(LuckProfile) 목록 20개씩, 최근 활동(`updatedAt`) 순. 닉네임·관리자 이름 부분 검색. 회원별 보유 포인트·행운 티어 횟수·최고 티어·포커 판수·랜덤 뽑기 배팅 수, 전체 지갑 수·포인트 합계 |
| `GET /api/admin/luck/users/:userId` | 프로필 누적값, 오늘의 행운 티어 기록(최대 5), 포커 판·랜덤 뽑기 배팅 최근 50개(+전체 수), 랜덤 뽑기 회차 결과 |
| `GET /api/admin/luck/users/:userId/points?page=` | 원장 30개씩 최신순 + 출처별 건수·얻음·사용 합계 |

**지갑 주인 판별** — `resolveAccounts(ids)`: 회원(`User`)에서 못 찾으면 관리자(`Admin`)에서 찾고, 둘 다 없을 때만 탈퇴로 본다. 관리자 토큰으로 뽑으면 `req.auth.sub` 가 Admin 문서 id 라 지갑이 관리자 id 로 생기기 때문(처음 구현은 회원만 찾아 관리자를 "(탈퇴 회원)"으로 잘못 표시 — 같은 날 수정, 같은 커밋에 포함). 응답에 `accountType: 'member'|'admin'|'deleted'`.

## 확인

- 운영 DB 에 읽기 전용으로 붙어 컨트롤러 3개 직접 호출: 지갑 4개(회원 2·관리자 1·탈퇴 1), 포커 133판(최근 50 표시), 랜덤 뽑기 7건, 잘못된 id 400, 없는 회원 404, 검색 결과 없음 0.
- `recordPointChange` 를 가짜 모델로: 0 증감 건너뜀, 설명 200자 자름, DB 오류에도 예외 없음.
- 배포 후 운영 3개 주소에서 비로그인 요청 401(경로 존재).
- **배포 전이라 실제 뽑기로 원장이 쌓이는 것은 확인하지 못했다.** 원장은 배포(2026-10-01) 이후 증감부터 쌓인다.

## 남은 점

- 회원 탈퇴가 행운 뽑기 데이터(지갑·기록·원장)를 지우지 않는다(기존 동작). 운영 DB 에 회원·관리자 어디에도 없는 지갑 1개(`…732670`, 2026-09-20 생성, 기록 0건)가 있다.
- 랜덤 뽑기는 배팅 시 차감하지 않아, 배팅 후 정산 전에 포인트를 다른 곳에 쓰면 패배 차감이 배팅액보다 작게 반영될 수 있다.
