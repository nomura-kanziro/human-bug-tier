---
name: luck-draw
description: >
  행운 뽑기 3모드(오늘의 행운 티어 · 행운 티어 포커 · 랜덤 뽑기), 회원 20회/3분 쿨다운, 티어별 포인트(0 하한),
  이력 5건 자동삭제, 포인트 원장(LuckPointLog), 게스트 체크(24시간 안내). Canonical for ANY AI.
---

# 공통 스킬 — 행운 뽑기 (luck-draw)

> 2026-10-02 현재 코드 기준으로 갱신. 바닐라 1차 서술("랜덤 뽑기 준비 중", 포인트 `(9 - tier) - 5`, 포인트 음수 가능)은 폐기.
> 프론트 작업은 `root-cloudflare/`(React)만 — `root-render/luck-draw/` 는 베타 종료·수정 금지.

## When

- `/luck-draw` 페이지, 홈 행운 위젯, 헤더 "행운 뽑기" 메뉴 변경
- `backend/controllers/luck{Draw,Poker,Ladder}Controller.js`, `backend/data/luckPool.js`, `backend/utils/kstDate.js`, 포인트 원장 변경
- 포인트를 주거나 빼는 새 기능(이벤트 상금 등)을 만들 때

## Code map

- 프론트: `root-cloudflare/src/pages/LuckDraw.jsx`(`/luck-draw`), `src/components/LuckPokerPanel.jsx`, `LuckLadderPanel.jsx`, `HomeLuckWidget.jsx`
- 서버: `backend/controllers/luckDrawController.js`(오늘의 행운 티어·`/config`·`/stats`), `luckPokerController.js`, `luckLadderController.js`(+ `startLadderScheduler`), `backend/routes/luckDrawRoutes.js`
- 모델: `LuckProfile`(회원당 지갑·누적 카운터, 삭제 안 됨), `LuckDraw`(이력, 최근 5건), `LuckPokerRound`, `LuckLadderRound`, `LuckLadderBet`, `LuckPointLog`(포인트 증감 원장)
- `backend/utils/luckPointLog.js`(`recordPointChange`), `backend/data/luckPool.js`(캐릭터 풀), `backend/utils/kstDate.js`
- 관리자 조회: `backend/controllers/adminLuckController.js`(`/api/admin/luck/*`), `root-cloudflare/src/components/AdminLuckManager.jsx`

## Read first

- `RDMD/features/luck-draw.md` (규칙 요약 — 포인트표·족보·배수·API)
- `RDMD/backend/08-luck-draw/02-luck-draw-points-retention-record.md` (왜 LuckProfile 을 따로 뒀는지)
- `RDMD/backend/08-luck-draw/03-poker-ladder-record.md`, `04-point-ledger-admin-api-record.md`
- (`luck-draw-기획서.md` 는 저장소에 없다 — 규칙 정본은 서버 컨트롤러 상수)

## 현재 (작업 전 이해)

- 확률·카드·결과·정산은 **서버 전담**. 프론트 `Math.random()` 으로 결과를 만들지 않고, 포커도 "몇 번째 후보를 골랐는지"만 보낸다.
- **포인트는 회원 지갑 `LuckProfile.points` 하나** — 3모드 + 이벤트 상금(퀴즈·메모리·티어표 공개)이 같이 쓴다. `User` 스키마에 포인트를 두지 않는다.
- **포인트 0 하한**: 모든 반영이 `Math.max(0, …)`. 응답·기록에는 **실제 반영된 증감**만 쓴다.
- **포인트표** `POINTS_TABLE = {1:+10, 2:+7, 3:+4, 4:+2, 5:+1, 6:-1, 7:-2, 8:-3, 9:-4}` — `luckDrawController.js` 한 곳이 정본, 프론트는 `/config` 의 `pointsTable` 표시만.
- **확률** `DAILY_TIER_WEIGHTS = {1:1, 2:3, 3:6, 4:19, 5:21, 6:17, 7:14, 8:12, 9:7}`(합 100) — 서버에만.
- **회원 제한**: 하루 **20회**(`MEMBER_DAILY_LIMIT`), 뽑기 사이 **3분**(`MEMBER_COOLDOWN_MS`) — `LuckProfile` 의 `todayCount`/`todayDate`/`lastDrawAt` 로 강제. 초과 시 `429 { limitReached:true }` / `429 { cooldown:true, cooldownRemainingSec }`.
- **이력 `LuckDraw` 는 회원당 최근 5건** — 뽑을 때마다 `pruneLuckHistory`. 일일 횟수를 `LuckDraw` 개수로 세면 5건으로 잘려 20회 제한이 무력화되므로 **반드시 `LuckProfile` 기준**.
- **포커**: `/poker/deal` 에서 배팅액을 **즉시 차감**하고 카드(후보 5·자동 2·딜러 5)를 미리 저장 → `/poker/play` 에서 후보 3장 선택·정산. 열린 판 회원당 1개, 정산은 `status` 원자적 선점. 승리 = 원금 + `floor(bet×배수)`, 무승부 = 원금, 패배 = 0.
- **랜덤 뽑기**: 서버 스케줄러가 5분마다 자동 정산·다음 라운드. 결과는 `luckPool` 전체 캐릭터 중 균등 1명. 라운드당 회원 1번 배팅. **배팅 시 차감하지 않고** 정산 때 승 +`round(bet×배수)` / 패 -bet (0 하한).
- **배팅 상한 = 보유 포인트 전부**(포커·랜덤 뽑기), 최소 1P.
- **포인트를 바꾸는 코드는 `LuckProfile` 저장 직후 `recordPointChange({ userId, source, delta, balanceAfter, detail, refId })` 를 부른다.** 증감 0 은 안 남기고, 실패해도 예외 없음. `source` enum 은 `models/LuckPointLog.js`.
- 관리자 토큰으로 뽑으면 지갑이 **Admin 문서 id** 로 생긴다(관리 화면 [관리자]). 회원 탈퇴는 행운 뽑기 데이터를 지우지 않는다(관리 화면 [탈퇴]).
- **게스트**: 오늘의 행운 티어만 계산해서 보여주고 저장 안 함(`saved:false`). 24시간 제한은 프론트 `localStorage` 안내일 뿐 서버 미강제(의도). 포커·랜덤 뽑기 배팅은 로그인 필수.
- 날짜는 `getKstDateString()`(KST 자정). `LuckDraw` 인덱스 `{userId,mode,drawDate}`·`{userId,mode,createdAt:-1}` 은 non-unique(예전 unique 인덱스가 남은 환경이면 `dropIndex`).

## Do

1. 확률·포인트표·족보·배수는 서버 상수 한 곳에서만 고치고, 프론트는 `/config`·`/poker/config`·`/ladder/round` 응답을 표시만
2. 포인트 증감 코드를 새로 만들면 0 하한 + 실제 증감 계산 + `recordPointChange` 까지 한 세트로
3. 이벤트 상금은 `eventController.addPoints(userId, delta, { source, detail, refId })` 를 쓴다(새 source 면 `LuckPointLog` enum 과 `adminLuckController` 의 출처 이름표에도 추가)
4. 캐릭터 이미지 경로는 `luckPool.js` 의 `imagePath` → 서버 `resolveTierMediaPath` 기준. 이미지 파일명을 바꾸면 `tiers.json` 과 `luckPool.js` 를 **둘 다** 고친다
5. 경로·API: `src/lib/api.js` 의 `getApiBase()` / `apiRequest()` 재사용

## Do not

- 프론트에서 티어/캐릭터/카드를 만들어 서버에 "이 결과 저장해줘" 요청
- `User` 스키마에 포인트·뽑기 필드 추가 (전부 `LuckProfile`)
- 게스트 결과를 `LuckDraw`/`LuckProfile` 에 저장
- 일일 횟수·쿨다운을 `LuckDraw` 문서 개수/최신 문서로 판정
- `profile.tierCounts[tier] = …` 후 `markModified('tierCounts')` 누락
- 포인트를 원장 기록 없이 바꾸기, 원장 실패로 뽑기·정산을 실패시키기
- `root-render/luck-draw/` 수정 (베타 종료)

## Checklist

- [ ] 비로그인 오늘의 행운 티어 → 결과 + 미저장, DB 0건 / 24시간 내 재클릭은 안내만
- [ ] 로그인 뽑기 → 결과 + 포인트 배지 + `LuckDraw` 1건 + 원장 1건(증감 0 이면 없음), 3분 비활성화
- [ ] 3분 내 재요청 429(cooldown), 20회 후 429(limitReached), 6번째 이후 `/history` 5건·`/stats.totalDraws` 는 실제 누적
- [ ] 포커 deal → 잔액 차감 + 원장 `poker_bet` / play → 판에 `outcome`·`payout` 저장 + 원장 `poker_payout`(패배면 없음)
- [ ] 랜덤 뽑기 배팅 → 잔액 그대로, 5분 뒤 정산 시 잔액 반영 + `LuckLadderBet.pointsDelta` + 원장 `ladder`
- [ ] 어떤 경우에도 잔액이 0 미만이 되지 않음
- [ ] `/today`, `/history`, `/stats`, `/poker/deal|play`, `/ladder/bet` 토큰 없이 401
