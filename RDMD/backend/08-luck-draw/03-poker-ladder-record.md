---
area: backend
feature: luck-draw
---

# 기록 — 행운 티어 포커 · 랜덤 뽑기 (2026-09-19 ~ 09-20, 2026-10-02 사후 정리)

## 개요

오늘의 행운 티어로 모은 포인트(`LuckProfile.points`)를 거는 모드 2개를 추가했다 — **행운 티어 포커**(1:1 족보 대결)와 **랜덤 뽑기**(5분 자동 공용 라운드 배팅).
기능은 2026-09-19~20 에 들어갔지만 그때 RDMD 기록이 남지 않아, 2026-10-02 문서 전체 갱신 때 커밋 이력과 현재 코드를 대조해 이 기록을 썼다. 규칙 정본은 코드(`luckPokerController.js`·`luckLadderController.js`)이며, 요약은 [`../../features/luck-draw.md`](../../features/luck-draw.md).

## 관련 커밋

| 커밋 | 날짜 | 내용 |
|---|---|---|
| `515117f` | 09-19 | feat — 행운 티어 포커 배팅 게임 추가 |
| `3221d2a` | 09-19 | fix — 오늘의 행운 티어 포인트 0 미만 방지(모든 정산 0 하한) |
| `e953970` | 09-20 | feat — 랜덤 뽑기(사다리 게임 스타일) 추가 |
| `356652c` | 09-20 | refactor — 랜덤 뽑기를 5분 자동 공용 라운드 방식으로 재설계 |
| `9e610fe` | 09-20 | fix — 오늘의 행운 티어 티어별 당첨 확률 가중치 조정 |
| `26b31a5` | 09-20 | tweak — 랜덤 뽑기 배팅 옵션 순서·묶음 티어 배수 조정 |
| `7de57bf` | 09-20 | feat — 배팅 상한을 보유 포인트로, 패배 시 배팅액만 손실, 포커 카드 한 장씩 딜링 연출 |
| `1929a5c` | 09-20 | feat — 포커를 공개 후보 3장 직접 선택식으로 변경(4·5번째는 자동) |

## 파일

- `backend/controllers/luckPokerController.js`, `backend/models/LuckPokerRound.js`
- `backend/controllers/luckLadderController.js`, `backend/models/LuckLadderRound.js`, `backend/models/LuckLadderBet.js`
- `backend/routes/luckDrawRoutes.js`(`/poker/*`, `/ladder/*`), `backend/server.js`(서버 기동 시 `startLadderScheduler()`)
- 프론트: `root-cloudflare/src/components/LuckPokerPanel.jsx`, `LuckLadderPanel.jsx`, `src/pages/LuckDraw.jsx`

## 행운 티어 포커

- 카드 = 티어 1~9 × 무늬 5종. 유저 5장 vs 딜러 5장, 족보가 높은 쪽 승리. 족보 15종·배수는 `HANDS`.
- **2단계 요청**: `POST /poker/deal { bet }` 에서 배팅액을 차감하고 후보 5장·자동 2장·딜러 5장을 한꺼번에 뽑아 `LuckPokerRound` 에 저장 → 후보 5장만 공개. `POST /poker/play { roundId, picks }` 에서 후보 번호 3개를 받아 저장된 자동 2장을 붙여 판정.
  카드를 먼저 확정해 두므로 유저의 선택은 "어느 후보를 쓰느냐"만 바꾸고 카드 값을 바꾸지 못한다.
- 열린 판은 회원당 1개(`{userId, status:'open'}` 부분 unique 인덱스). 동시에 두 번 눌러도 새 판·중복 차감 없이 그 판을 이어 준다.
- 정산 중복 방지: `findOneAndUpdate({ status:'open' } → 'settled')` 원자적 선점.
- 지급: 승리 = 원금 + `floor(bet × 배수)`, 무승부 = 원금, 패배 = 0.

## 랜덤 뽑기

- `startLadderScheduler()` 가 5초마다 현재 라운드의 마감(5분)을 확인해 지났으면 정산하고 다음 라운드를 연다. 서버가 내려가 있던 사이 지난 라운드도 다음 확인 때 정산된다.
- 결과는 `luckPool.js` 전체 캐릭터 중 균등 1명(그래서 티어별 확률은 풀에 등록된 인원 수에 비례).
- 배팅: 라운드당 회원 1번(`{roundNo, userId}` unique), 마감 후 `409`. 묶음 ×2.5 / 홀짝 ×1.95 / 지목 ×3.25~20.
- **배팅 시 차감하지 않고** 정산 때 승리 +`round(bet × 배수)` / 패배 -bet 을 0 하한으로 반영하고, 실제 반영분을 `LuckLadderBet.pointsDelta` 에 남긴다.

## 사후 정리하며 확인한 문서 불일치 (2026-10-02 수정)

- `RDMD/features/luck-draw.md`·행운 뽑기 스킬은 바닐라 1차 기준이라 "랜덤 뽑기 준비 중", 포인트 `(9 - tier) - 5`(+3~-5), "포인트 음수 가능"이라고 적혀 있었다.
  실제로는 포인트표가 2026-08-31 `c3f6163` 부터 `{1:+10, 2:+7, 3:+4, 4:+2, 5:+1, 6:-1, 7:-2, 8:-3, 9:-4}` 였고, 09-19 부터 0 하한이다. 두 문서를 현재 코드 기준으로 다시 썼다.

## 이후 변경

- 2026-10-01 `a9df3ba` — 포커 판에 정산 결과(`outcome`·`payout`·`pointsDelta`·`playerHand`·`dealerHand`) 저장, 모든 포인트 증감을 원장 `LuckPointLog` 에 기록 → [`04-point-ledger-admin-api-record.md`](./04-point-ledger-admin-api-record.md)
