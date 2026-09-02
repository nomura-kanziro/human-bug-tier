---
name: luck-draw
description: >
  행운 뽑기, 오늘의 행운 티어, 회원 20회/3분 쿨다운, 티어별 포인트, 이력 5건 자동삭제,
  게스트 24시간, LuckDraw, LuckProfile, luckPool, kstDate. Use when /luck-draw.
---

# Claude 스킬 — 행운 뽑기

## When

- `luck-draw/` 페이지·API, 오늘의 행운 티어 뽑기 로직
- 포인트·이력 보관(5건 제한)·마이페이지 통계 관련 변경
- 헤더 "행운 뽑기" 메뉴, `index.html` 퀵카드·메인 위젯 (`index-home.js`)

## Code map

- `luck-draw/luck-draw.html|css|js|luck-draw-api.js`
- `backend/models/LuckDraw.js`(이력, 최근 5건만), `backend/models/LuckProfile.js`(누적 카운터, 삭제 안 됨)
- `backend/data/luckPool.js`, `backend/utils/kstDate.js`
- `backend/controllers/luckDrawController.js`, `backend/routes/luckDrawRoutes.js`

## Read first

- `.agents/luck-draw/skill.md` (정본, 최우선)
- `luck-draw-기획서.md`
- `RDMD/features/luck-draw.md`
- `RDMD/backend/08-luck-draw/02-luck-draw-points-retention-record.md` (왜 LuckProfile을 따로 뒀는지)
- `luck-draw/README.md`

## Do

1. `.agents/luck-draw/skill.md` 와 모순 없이 작업 (정본 우선)
2. 1차 범위 = 오늘의 행운 티어만. 랜덤 뽑기는 `(준비 중)` 유지
3. 확률·결과·포인트 결정은 서버(`luckDrawController.js`)에서만
4. **회원**: 하루 20회 + 3분 쿨다운을 서버가 `LuckProfile`(`buildStatusFromProfile`)로 강제, 초과 시 429(`limitReached`/`cooldown`)
5. **일일 횟수·쿨다운은 반드시 `LuckProfile` 기준**으로 판정 — `LuckDraw`(이력) 문서 개수로 세면 이력이 5건으로 잘리는 순간 20회 제한이 무력화됨
6. **포인트**: `getTierPoints(tier) = (9 - tier) - 5` (9티어 -5 ~ 1티어 +3). 이 함수 하나만 소스, 프론트는 `/config.pointsTable` 표시만
7. 뽑을 때마다 `pruneLuckHistory()` 로 `LuckDraw` 를 최근 5건만 남기고 정리, `LuckProfile.points`/`totalDraws`/`bestTier`/`tierCounts` 는 그대로 누적
8. `profile.tierCounts[tier] = ...` 대입 후 `profile.markModified('tierCounts')` 를 `save()` 전에 반드시 호출 (Object/Mixed 필드라 자동 감지 안 됨)
9. **게스트**: 서버는 rate limit 없음(계정 없음) — 프론트 `localStorage`(`luckDrawGuestState`)로 24시간 안내만, 초과 시 alert 후 API 미호출. 포인트도 적립 안 됨
10. 게스트는 체크만(`saved:false`, DB 미저장), 로그인만 `LuckDraw`+`LuckProfile` 갱신
11. 날짜는 `getKstDateString()` 사용
12. 경로/API: `getBasePath()` / `getApiBase()` / `getAuthHeaders()` 재사용
13. `LuckDraw` 인덱스는 **non-unique** — 배포 환경에 예전 unique 인덱스가 남아 있으면 `dropIndex` 필요 (한 번 발생했던 실수, 재발 주의)

## Do not

- `User` 스키마에 뽑기/포인트 필드 추가 (전부 `LuckProfile` 로)
- 게스트 결과 DB 저장
- 프론트에서 확률·포인트 계산 후 서버에 전송(신뢰 불가) — 서버가 전부 계산
- `common.js`/`common.css` 전체 재작성, `luck-draw.js`에 `onclick` 신규 도입
- 회원 한도/쿨다운/포인트 상수를 프론트와 서버 두 곳에서 각각 정의(서버가 유일한 소스, 프론트는 `/config` 표시용 값만 사용)
- 일일 횟수 판정에 `LuckDraw.countDocuments()` 재도입 (이력 5건 제한과 충돌 — 반드시 `LuckProfile`)

## Checklist

- [ ] 비로그인 뽑기 동작(`saved:false`), 24시간 내 재클릭 시 alert만 뜨고 네트워크 요청 없음
- [ ] 로그인 뽑기 → 결과 카드에 `+N P`/`-N P` 배지 + DB 저장 + 버튼 3분 카운트다운
- [ ] 3분 내 재요청 429(cooldown), 20회째 이후 429(limitReached)
- [ ] 6번째 뽑기 이후 `/history` 는 항상 5건, `/stats.totalDraws` 는 실제 누적치(5로 고정 안 됨)
- [ ] `/today`, `/history`, `/stats` 401 확인
- [ ] GITHUB_STATIC 가드
- [ ] header.html(데스크톱+사이드) · index.html 링크·메인 위젯 정상
