---
name: luck-draw
description: >
  오늘의 행운 티어 뽑기, 회원 20회/3분 쿨다운, 게스트 체크(24시간 안내). Canonical for ANY AI.
---

# 공통 스킬 — 행운 뽑기 (luck-draw)

## When

- `luck-draw/`, `backend/*/luckDraw*`, `backend/data/luckPool.js`, `backend/utils/kstDate.js` 변경
- 헤더 "행운 뽑기" 메뉴, `index.html` 퀵카드 관련 변경

## Code map

- `luck-draw/` (html·css·js·api·README)
- `backend/models/LuckDraw.js`, `backend/data/luckPool.js`, `backend/utils/kstDate.js`
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
- **회원 제한**: 하루 최대 **20회**, 뽑기 사이 **3분 쿨다운** — 둘 다 서버(`luckDrawController.js`)가 DB 조회로 강제. 초과 시 `429 { limitReached:true }` / `429 { cooldown:true, cooldownRemainingSec }`
- `{userId,mode,drawDate}`, `{userId,mode,createdAt:-1}` 인덱스는 **non-unique** (하루 여러 건 허용). 과거엔 unique 1건짜리였다가 정책 변경됨 — 새로 배포된 환경에서 예전 unique 인덱스가 남아있으면(수동으로 만든 적 있다면) `dropIndex` 로 제거해야 20회 정책이 실제로 동작함
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
- `User` 스키마에 `tickets`/`lastDrawAt` 등 뽑기 필드 추가
- 게스트 결과를 `LuckDraw` 에 저장 (통계 오염)
- `common.js`/`common.css` 전체 재작성
- 이벤트 바인딩에 `onclick` 신규 도입 (`luck-draw.js` 내부는 `addEventListener` 만)

## Checklist

- [ ] 비로그인 뽑기 → 결과 표시 + 미저장 배지, DB 0건
- [ ] 비로그인 24시간 내 재클릭 → alert만, API 호출 없음
- [ ] 로그인 뽑기 → 결과 + DB 1건, 버튼이 "다음 뽑기까지 mm:ss" 로 3분 비활성화
- [ ] 3분 내 재요청 → 429(cooldown), 3분 후 자동 해제
- [ ] 20회째 성공 후 재요청 → 429(limitReached)
- [ ] `/today`, `/history` 토큰 없이 401
- [ ] KST 자정 경계에서 `drawDate` 안 밀림
- [ ] GitHub Pages(`GITHUB_STATIC`) → 뽑기 버튼 비활성화 + 안내
