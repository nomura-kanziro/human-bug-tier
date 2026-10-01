# 행운 뽑기 (luck-draw)

기획 원본: `luck-draw-기획서.md` — 저장소에 올라온 적이 없는 파일이다(예전 링크도 깨져 있었음). 규칙 정본은 아래 서버 코드.  
코드(현행 React): `root-cloudflare/src/pages/LuckDraw.jsx`(`/luck-draw`), `src/components/LuckPokerPanel.jsx`·`LuckLadderPanel.jsx`·`HomeLuckWidget.jsx`  
서버: `backend/controllers/luckDrawController.js`·`luckPokerController.js`·`luckLadderController.js`, `backend/routes/luckDrawRoutes.js`, `backend/data/luckPool.js`

> 이 문서는 2026-10-02 기준 코드와 대조해 다시 썼다. 바닐라(`root-render/luck-draw/`) 시절 서술(포인트 +3~-5, "랜덤 뽑기 준비 중", 포인트 음수 허용)은 더 이상 맞지 않는다.

## 한 줄 요약

모드 3개 — **오늘의 행운 티어**(뽑아서 포인트 적립) · **행운 티어 포커**(포인트를 걸고 족보 대결) · **랜덤 뽑기**(5분마다 자동으로 열리는 공용 라운드에 배팅).
확률·카드·결과·포인트 정산은 전부 서버가 정하고, 프론트는 표시만 한다. 포인트는 회원별 지갑 `LuckProfile.points` 하나를 세 모드와 이벤트 상금이 함께 쓴다.

## 포인트 공통 규칙

- **0 밑으로 내려가지 않는다**(2026-09-19 `fix(luck-draw): 오늘의 행운 티어 포인트 0 미만 방지`). 모든 정산이 `Math.max(0, …)` 로 반영하고, 실제로 반영된 증감만 기록·응답한다.
- **배팅 상한 = 지금 가진 포인트 전부**(포커·랜덤 뽑기 공통). 별도 고정 상한은 없다. 최소 배팅 1P.
- **증감 원장**: 포인트가 바뀔 때마다 `LuckPointLog` 에 1건(출처·증감·직후 잔액·설명). 2026-10-01 추가 — 그 전 증감은 원장에 없다. 관리자 페이지 "행운 뽑기 관리"에서 본다([admin.md](./admin.md)).
- 이벤트 상금(매일 퀴즈·메모리 기록 1위·티어표 공개 우승)도 같은 지갑에 더해지고 원장에 남는다.

## 1. 오늘의 행운 티어

| 동작 | 비로그인 | 로그인(회원·관리자) |
|------|:---:|:---:|
| 뽑기 | O (계산만, 저장 안 함) | O (저장) |
| 하루 최대 횟수 | 24시간 1회 — 프론트 안내만, 서버 미강제 | **20회** (서버 강제, KST 자정 초기화) |
| 뽑기 간 대기 | 없음 | **3분** (서버 강제) |
| 포인트 | 없음 | 티어별 증감 |

- `POST /api/luck-draw/daily` → 서버가 가중치 `DAILY_TIER_WEIGHTS = {1:1, 2:3, 3:6, 4:19, 5:21, 6:17, 7:14, 8:12, 9:7}`(합 100 → 그대로 %)로 티어를 뽑고, 그 티어의 캐릭터 풀(`luckPool.js`)에서 1명을 고른다.
- 한도 초과 `429 { limitReached:true }`, 대기 중 `429 { cooldown:true, cooldownRemainingSec }`.

**티어별 포인트** (`POINTS_TABLE`, `luckDrawController.js` 한 곳이 정본 — 프론트는 `/config` 의 `pointsTable` 을 표시만):

| 티어 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 포인트 | +10 | +7 | +4 | +2 | +1 | -1 | -2 | -3 | -4 |

**데이터**
- `LuckDraw`(이력, 화면 표시용): 회원당 **최근 5건만** 유지 — 뽑을 때마다 초과분을 오래된 순으로 삭제(`pruneLuckHistory`).
- `LuckProfile`(회원당 1건, 삭제 안 됨): `points`, `totalDraws`, `tierCounts`, `bestTier`, `todayCount`/`todayDate`, `lastDrawAt`. 하루 횟수·쿨다운·통계·마이페이지가 전부 이 문서 기준.

> **왜 카운터를 따로 뒀나**: "일일 횟수"를 `LuckDraw` 문서 개수로 세면 이력을 5건으로 자르는 순간 무너진다(항상 5로 고정돼 20회 제한이 무력화됨). 그래서 표시용 이력과 집계용 카운터를 분리했다. 상세: [`../backend/08-luck-draw/02-luck-draw-points-retention-record.md`](../backend/08-luck-draw/02-luck-draw-points-retention-record.md)

## 2. 행운 티어 포커 (로그인 전용)

- 카드 = 티어 1~9(1이 가장 높음) × 무늬 5종(다이아몬드·하트·클로버·스페이드·휴먼버그대학교 마크). 캐릭터 이미지는 쓰지 않는다.
- **두 단계**: ① `POST /poker/deal { bet }` — 배팅액을 **바로 차감**(에스크로)하고 후보 5장·자동 2장·딜러 5장을 전부 미리 뽑아 저장, 후보 5장만 공개. 진행 중인 판이 있으면 새 판 대신 그 판을 이어 준다. ② `POST /poker/play { roundId, picks }` — 후보 중 **3장을 고르면** 서버가 미리 뽑아 둔 2장을 붙여 5장으로 딜러와 비교·정산.
- 프론트가 보내는 것은 "몇 번째 후보를 골랐는지"뿐이라 카드 값을 조작할 수 없다. 같은 판 중복 정산은 `status` 원자적 선점으로 막는다.
- **정산**: 승리 = 원금 + 배팅액 × 족보 배수(내림), 무승부(같은 족보·같은 끗수) = 원금, 패배 = 0. 순증감 = 승리 +배팅×배수 / 무승부 0 / 패배 -배팅.
- 족보 15종(낮음 → 높음, 배수): 탑 1.5 · 원페어 1.95 · 투페어 2.5 · 트리플 2.95 · 스트레이트 3.25 · 풀 하우스 3.5 · 플러시 4.25 · 백 스트레이트(9·8·7·6+1) 5 · 마운틴(1~5) 5.5 · 4카드 6 · 5카드 7 · 하우스 플러시 7.5 · 스트레이트 플러시 8 · 백 스트레이트 플러시 8.5 · 로얄 스트레이트 플러시(마운틴+플러시) 9. 정본은 `luckPokerController.js` `HANDS`.
- 판 기록 `LuckPokerRound`: 카드·배팅·고른 후보·상태. 2026-10-01부터 정산 결과(`outcome`·`payout`·`pointsDelta`·`playerHand`·`dealerHand`)도 저장 — 그 전 판은 비어 있다.

## 3. 랜덤 뽑기 (배팅은 로그인 전용, 조회는 누구나)

- 서버 타이머가 **5분마다 라운드를 자동으로** 마감·정산하고 다음 라운드를 연다(`startLadderScheduler`, 5초마다 확인). 유저가 버튼을 눌러 뽑는 게 아니다. 서버가 잠시 내려가 있었으면 다음 확인 때 밀린 라운드를 정산하고 이어 간다.
- 결과 = `luckPool.js` 전체 캐릭터 중 1명(이름·티어·홀짝).
- 라운드당 회원 **1번만** 배팅(`{roundNo, userId}` unique). 마감 시각이 지나면 `409`.
- **배팅 종류와 배수**: 묶음 티어(1~3 / 4~6 / 7~9) ×2.5 · 홀짝 티어 ×1.95 · 같은 티어 지목 ×(1티어 20 / 2·3티어 12 / 4~6티어 6 / 7~9티어 3.25). 정본은 `luckLadderController.js` `GROUP_MULT`·`PARITY_MULT`·`EXACT_MULT`.
- **포커와 다른 점 — 배팅할 때 차감하지 않는다.** 배팅 시에는 "보유 포인트 ≥ 배팅액"만 검사하고, 라운드 정산 때 승리 +배팅×배수 / 패배 -배팅을 한 번에 반영한다(0 하한). 그래서 배팅 후 정산 전에 다른 곳에서 포인트를 쓰면 패배 시 실제 차감액이 배팅액보다 작을 수 있다.
- 데이터: `LuckLadderRound`(회차·시작/마감·결과), `LuckLadderBet`(회차·배팅 종류·금액·배수·결과·실제 증감 `pointsDelta`).

## API (`/api/luck-draw`, 정본 `backend/routes/luckDrawRoutes.js`)

| 메서드 | 경로 | 권한 | 용도 |
|--------|------|------|------|
| GET | `/config` | optionalAuth | 확률·포인트표·한도 표시값 |
| POST | `/daily` | optionalAuth | 오늘의 행운 티어 뽑기 |
| GET | `/today` | requireAuth | 오늘 남은 횟수·쿨다운·마지막 결과 |
| GET | `/history` | requireAuth | 최근 기록(5건) |
| GET | `/stats` | requireAuth | 마이페이지 누적 통계 |
| GET | `/poker/config` | optionalAuth | 족보·배수 표시값 |
| POST | `/poker/deal` | requireAuth | 포커 배팅·카드 받기 |
| POST | `/poker/play` | requireAuth | 후보 3장 선택·정산 |
| GET | `/ladder/round` | optionalAuth | 현재 라운드·내 배팅·최근 결과 |
| POST | `/ladder/bet` | requireAuth | 현재 라운드에 배팅 |

관리자 조회 API(`/api/admin/luck/*`)는 [admin.md](./admin.md).

## 알려진 점

- 배팅 상한이 "보유 포인트 전부"라 이기면 포인트가 크게 불어난다. 2026-10-01 운영 DB 기준 지갑 4개의 합계가 약 55억 9천만 P였다(랜덤 뽑기 1회 +5,955,567P 기록 포함).
- 회원 탈퇴(`DELETE /api/admin/users/:id`)는 `LuckProfile`·`LuckDraw`·포커·랜덤 뽑기·원장 데이터를 지우지 않는다 — 관리 화면에서 [탈퇴]로 표시된다.
- 관리자 계정으로 뽑으면 지갑이 관리자(Admin) id 로 생긴다 — 관리 화면에서 [관리자]로 표시된다.

## 기록

- 오늘의 행운 티어: [`../backend/08-luck-draw/01-luck-draw-record.md`](../backend/08-luck-draw/01-luck-draw-record.md), [`02-…-points-retention-record.md`](../backend/08-luck-draw/02-luck-draw-points-retention-record.md)
- 포커·랜덤 뽑기: [`../backend/08-luck-draw/03-poker-ladder-record.md`](../backend/08-luck-draw/03-poker-ladder-record.md)
- 포인트 원장·관리 API: [`../backend/08-luck-draw/04-point-ledger-admin-api-record.md`](../backend/08-luck-draw/04-point-ledger-admin-api-record.md)
- 메인 위젯·화면: [`../frontend/10-luck-draw/`](../frontend/10-luck-draw/)

관련 스킬: `.agents/luck-draw/skill.md`, `.claude/skills/luck-draw/SKILL.md`
