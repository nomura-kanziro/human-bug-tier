---
name: luck-draw
description: >
  행운 뽑기, 오늘의 행운 티어, 회원 20회/3분 쿨다운, 게스트 24시간, LuckDraw, luckPool, kstDate. Use when /luck-draw.
---

# Claude 스킬 — 행운 뽑기

## When

- `luck-draw/` 페이지·API, 오늘의 행운 티어 뽑기 로직
- 헤더 "행운 뽑기" 메뉴, `index.html` 퀵카드

## Code map

- `luck-draw/luck-draw.html|css|js|luck-draw-api.js`
- `backend/models/LuckDraw.js`, `backend/data/luckPool.js`, `backend/utils/kstDate.js`
- `backend/controllers/luckDrawController.js`, `backend/routes/luckDrawRoutes.js`

## Read first

- `.agents/luck-draw/skill.md` (정본, 최우선)
- `luck-draw-기획서.md`
- `RDMD/features/luck-draw.md`
- `luck-draw/README.md`

## Do

1. `.agents/luck-draw/skill.md` 와 모순 없이 작업 (정본 우선)
2. 1차 범위 = 오늘의 행운 티어만. 랜덤 뽑기는 `(준비 중)` 유지
3. 확률·결과 결정은 서버(`luckDrawController.js`)에서만
4. **회원**: 하루 20회 + 3분 쿨다운을 서버가 DB 조회로 강제(`getMemberDrawStatus`), 초과 시 429(`limitReached`/`cooldown`)
5. **게스트**: 서버는 rate limit 없음(계정 없음) — 프론트 `localStorage`(`luckDrawGuestState`)로 24시간 안내만, 초과 시 alert 후 API 미호출
6. 게스트는 체크만(`saved:false`, DB 미저장), 로그인만 `LuckDraw` 저장
7. 날짜는 `getKstDateString()` 사용
8. 경로/API: `getBasePath()` / `getApiBase()` / `getAuthHeaders()` 재사용
9. 인덱스는 **non-unique** — 배포 환경에 예전 unique 인덱스가 남아 있으면 `dropIndex` 필요 (한 번 발생했던 실수, 재발 주의)

## Do not

- `User` 스키마에 뽑기 필드 추가
- 게스트 결과 DB 저장
- 프론트에서 확률 계산·`Math.random()` 결과 전송
- `common.js`/`common.css` 전체 재작성, `luck-draw.js`에 `onclick` 신규 도입
- 회원 한도/쿨다운 상수를 프론트와 서버 두 곳에서 각각 정의(서버가 유일한 소스, 프론트는 `/config` 표시용 값만 사용)

## Checklist

- [ ] 비로그인 뽑기 동작(`saved:false`), 24시간 내 재클릭 시 alert만 뜨고 네트워크 요청 없음
- [ ] 로그인 뽑기 → DB 저장 + 버튼 3분 카운트다운
- [ ] 3분 내 재요청 429(cooldown), 20회째 이후 429(limitReached)
- [ ] `/today`, `/history` 401 확인
- [ ] GITHUB_STATIC 가드
- [ ] header.html(데스크톱+사이드) · index.html 링크 정상
