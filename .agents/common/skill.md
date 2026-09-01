---
name: common
description: >
  common.js, header, footer, getBasePath, getApiBase, 링크 404.
  Canonical for ANY AI.
---

# 공통 스킬 — 공통 인프라

## When

- Header/Footer 404, 메뉴·로고 오류
- `getBasePath`, `getApiBase`, `getAuthHeaders` 변경
- GH Pages 서브패스 / 하위 폴더 경로

## Code map

- `root-cloudflare/common.js` (로컬·Cloudflare). Render 복제본: `root-render/common.js`
- `root-cloudflare/common.css`, `Header_Footer.css`, `header.html`, `footer.html`
- `root-cloudflare/manifest.webmanifest`, `sw.js` (PWA)
- 후원 커피 버튼: `header.html` `#header-sponsor-btn` + `common.js` `SPONSOR_PROFILE_URL` / `renderSponsorButton()`
- 유저 프로필 드롭다운(일반 유저·어드민 완전히 동일, 어드민만 "관리하기" 한 줄 추가): `common.js` `getCurrentIdentity()`, `renderUserProfile()` 이하 `toggleUserProfileMenu`/`closeUserProfileMenu*` — 상세는 `my-page/skill.md`(일반 유저), `admin/skill.md`(어드민)
- 헤더 드롭다운(프로필·알림)은 서로 열릴 때 상대방을 **명시적으로** 닫아준다(`toggleUserProfileMenu()` ↔ `toggleNotificationPanel()` 서로 호출). 버튼 클릭 핸들러가 `e.stopPropagation()` 을 쓰기 때문에 "바깥클릭 닫기" 리스너만으로는 서로를 못 닫음 — 새 헤더 드롭다운을 추가할 때 반드시 이 패턴을 따를 것. 상세: `RDMD/frontend/01-common/07-dropdown-mutual-exclusion-fix-record.md`

## Read first

- `.agents/common-rules.md` (B절)
- `RDMD/features/common-infra.md`
- `RDMD/guides/path-and-api.md`

## Do

1. 변경 전 base/API/fixRootLinks/getAuthHeaders 확인
2. 전 페이지 회귀 최소 diff
3. 내부 링크: 선행 `/` 하드코딩 지양
4. API base 분기 기존과 동일
5. `addEventListener` 유지
6. 검증: 루트, `tier-class/tier1`, `admin/comments/`, `:5000`
7. `goHome`은 항상 `index.html`. 미구현 메뉴(커스텀 메이커 이벤트·행운 뽑기의 랜덤 뽑기)는 **준비 중** 표시 — 행운 뽑기의 "오늘의 행운 티어"는 구현 완료(준비 중 아님)
8. 헤더에 새 드롭다운/패널 추가 시, 열릴 때 **기존 패널들을 명시적으로 닫는 호출**을 서로 추가 ("바깥클릭 닫기"만으로는 버튼 간 상호 배제가 안 됨 — 위 항목 참고)

## Do not

- 프로덕션에 `localhost:5000` 고정
- GH Pages에서 API 동작 가정
- header만 고치고 common 보정과 모순
- 미구현 메뉴를 빈 `#` 링크로 되돌리기

## Tasks

**A. 링크 404** — depth → getBasePath → 상대경로 + fixRootLinks  
**B. API 실패** — port → getApiBase → backend 5000  
**C. 메뉴 추가** — header/footer 상대 링크  

## Checklist

- [ ] 깊은 경로 header/footer
- [ ] 메뉴 이동 · API base 분기
- [ ] 헤더 드롭다운 여러 개 동시 오픈 안 됨(프로필↔알림 상호 배타)
