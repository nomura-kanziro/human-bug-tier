---
name: common
description: >
  common.js, header, footer, getBasePath, getApiBase, 링크 404, 네비게이션,
  경로 보정. Use when /common or header/footer/path bugs.
---

# Claude 스킬 — 공통 인프라

## When

- Header/Footer 404, 메뉴·로고 링크 오류
- `getBasePath`, `getApiBase`, `getAuthHeaders` 변경
- GH Pages 서브패스 / 하위 폴더 경로

## Code map

- `common.js`, `common.css`, `Header_Footer.css`
- `header.html`, `footer.html`

## Read first

- `RDMD/features/common-infra.md`
- `RDMD/guides/path-and-api.md`
- `common.js` 핵심 함수

## Do

1. 변경 전 base/API/fixRootLinks/getAuthHeaders 동작 확인
2. 전 페이지 회귀 최소 diff
3. 내부 링크: 선행 `/` 하드코딩 지양
4. API base 분기 기존과 동일 (로컬 포트 / GH Pages / 동일 오리진)
5. 이벤트: `addEventListener` (onclick 재도입 금지)
6. 검증: 루트, `tier-class/tier1`, `admin/comments/` 깊은 경로, `:5000`

## Do not

- 프로덕션에 `localhost:5000` 고정
- GH Pages에서 API 동작 가정
- header만 고치고 common 보정과 모순

## Tasks

**A. 링크 404** — 깊이 확인 → getBasePath → header 상대경로 + fixRootLinks  
**B. API 실패** — port/hostname → getApiBase → backend 5000 → auth_api/admin_api 일치  
**C. 메뉴 추가** — header(+footer) 상대 링크 → 이벤트 재바인딩 → 사이드/데스크탑 둘 다  

## Checklist

- [ ] 2단 이상 하위 폴더에서 header/footer
- [ ] 메뉴 이동
- [ ] API base 분기 유지
