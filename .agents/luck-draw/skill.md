---
name: luck-draw
description: >
  오늘의 행운 티어 뽑기, 회원 20회/3분 쿨다운, 티어별 포인트, 이력 5건 자동삭제, 게스트 체크(24시간 안내). Canonical for ANY AI.
---

# 공통 스킬 — 행운 뽑기 (luck-draw)

## When

- `luck-draw/`, `backend/*/luckDraw*`, `backend/data/luckPool.js`, `backend/utils/kstDate.js` 변경
- 헤더 "행운 뽑기" 메뉴, `index.html` 퀵카드 관련 변경

## Code map

- `luck-draw/` (html·css·js·api·README)
- `backend/models/LuckDraw.js`(이력, 최근 5건만 유지), `backend/models/LuckProfile.js`(누적 포인트·횟수·최고티어, 삭제 안 됨)
- `backend/data/luckPool.js`, `backend/utils/kstDate.js`
- `backend/controllers/luckDrawController.js`, `backend/routes/luckDrawRoutes.js`
- `header.html`(데스크톱+사이드 드롭다운), `index.html`(퀵카드)

## Read first

- `luck-draw-기획서.md` (원 설계 문서)
- `RDMD/features/luck-draw.md`
- `luck-draw/README.md`

## 현재 (작업 전 이해)

- **1차 범위는 "오늘의 행운 티어"뿐.** 랜덤 뽑기는 UI만 있고 `(준비 중)` 유지
- 확률·캐릭터 결정은 **서버 전담**. 프론트 `Math.random()` 으로 결과를 만들지 않는다
- 스키마는 `User` 를 건드리지 않고 **별도 `LuckDraw` 컬렉션**
- **회원 제한**: 하루 최대 **20회**, 뽑기 사이 **3분 쿨다운** — 둘 다 서버(`luckDrawController.js`)가 `LuckProfile` 로 강제. 초과 시 `429 { limitReached:true }` / `429 { cooldown:true, cooldownRemainingSec }`
- **이력(`LuckDraw`)은 유저당 최근 5건만 유지** — 뽑을 때마다 초과분을 오래된 순으로 삭제(`pruneLuckHistory`)
- **누적치는 `LuckProfile`(유저당 1건)에만 저장** — `points`(포인트), `totalDraws`(누적 횟수), `tierCounts`, `bestTier`, `todayCount`/`todayDate`(일일 한도용), `lastDrawAt`(쿨다운용). **이력 삭제와 완전히 분리** — 오늘 횟수를 `LuckDraw` 문서 개수로 세면 이력이 5건으로 잘리는 순간 20회 제한이 무력화되므로 반드시 `LuckProfile` 기준으로 계산할 것
- **포인트 공식**: `getTierPoints(tier) = (9 - tier) - 5` — 9티어 -5점, 1티어 +3점, 한 단계당 1점. 공식은 `luckDrawController.js` 한 곳에만 존재, 프론트는 `/config` 의 `pointsTable` 을 표시만 함
- `LuckDraw` 인덱스는 `{userId,mode,drawDate}`, `{userId,mode,createdAt:-1}` 모두 **non-unique**. 과거엔 unique 1건짜리였다가 정책 변경됨 — 새로 배포된 환경에서 예전 unique 인덱스가 남아있으면 `dropIndex` 필요
- **게스트 24시간 제한은 서버가 강제하지 않는다.** 게스트는 계정이 없어 서버가 신원을 구분 못 함 — 프론트가 `localStorage` 로 마지막 체크 시각을 기억했다가 버튼 클릭 시 alert만 띄우고 API 호출을 막는 **UX 안내**일 뿐. 우회 가능하지만 의도된 동작(게스트 결과는 애초에 신뢰·저장 대상 아님)
- 날짜는 `getKstDateString()` (KST 자정 기준) 사용 — `toISOString()` 그대로 쓰면 한국 09시 이전에 날짜가 밀림
- 게스트 뽑기(`POST /daily`)는 계산만 하고 **DB 저장 없음** (`saved:false`)
- 권한: `optionalAuth`(뽑기·설정) / `requireAuth`(오늘 상태·기록 조회)

## Do

1. 새 로직은 `luck-draw/` 와 `backend/*luckDraw*`, `backend/data/luckPool.js` 안에만 추가
2. 기존 파일은 `header.html`(드롭다운 2곳), `index.html`(퀵카드), `backend/server.js`(마운트 1줄)만 최소 수정
3. 확률 가중치(`DAILY_TIER_WEIGHTS`)는 서버에만 존재. `/config` 응답에는 표시용 값만
4. 캐릭터 이미지 경로는 `tier-class/tierN.html` 의 실제 `<img src>` 값만 사용, 프론트에서 `getBasePath() + encodeURI(imagePath)` 로 조립
5. 경로·API: `getBasePath()` / `getApiBase()` / `getAuthHeaders()` **재사용만**
6. 회원 한도(20/일)·쿨다운(3분) 상수는 `luckDrawController.js` 한 곳에서만 관리 (`MEMBER_DAILY_LIMIT`, `MEMBER_COOLDOWN_MS`) — 프론트는 `/config` 응답의 `dailyLimit`/`cooldownSec` 를 표시용으로만 참고

## Do not

- 프론트에서 티어/캐릭터를 직접 뽑아 서버에 "이 결과 저장해줘" 요청 (신뢰 불가)
- `User` 스키마에 `tickets`/`points`/`lastDrawAt` 등 뽑기 필드 추가 (전부 `LuckProfile` 로)
- 게스트 결과를 `LuckDraw`/`LuckProfile` 에 저장 (통계 오염)
- 일일 횟수·쿨다운 판정을 `LuckDraw` 문서 개수/최신 문서로 계산 (이력이 5건으로 잘리면 무력화됨 — 반드시 `LuckProfile`)
- `profile.tierCounts[tier] = ...` 대입 후 `markModified('tierCounts')` 누락 (Mongoose가 변경 감지 못 해 저장 누락됨)
- `common.js`/`common.css` 전체 재작성
- 이벤트 바인딩에 `onclick` 신규 도입 (`luck-draw.js` 내부는 `addEventListener` 만)

## Checklist

- [ ] 비로그인 뽑기 → 결과 표시 + 미저장 배지, DB 0건
- [ ] 비로그인 24시간 내 재클릭 → alert만, API 호출 없음
- [ ] 로그인 뽑기 → 결과 + `+N P`/`-N P` 배지 + DB 1건, 버튼이 "다음 뽑기까지 mm:ss" 로 3분 비활성화
- [ ] 3분 내 재요청 → 429(cooldown), 3분 후 자동 해제
- [ ] 20회째 성공 후 재요청 → 429(limitReached)
- [ ] 6번째 뽑기 이후 `/history` 는 항상 5건, `/stats.totalDraws` 는 5로 고정 안 되고 실제 누적치
- [ ] `/today`, `/history`, `/stats` 토큰 없이 401
- [ ] KST 자정 경계에서 `drawDate`·`todayCount` 안 밀림
- [ ] GitHub Pages(`GITHUB_STATIC`) → 뽑기 버튼 비활성화 + 안내
