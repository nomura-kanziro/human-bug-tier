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

- `common.js`, `common.css`, `Header_Footer.css`
- `header.html`, `footer.html`

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

## Do not

- 프로덕션에 `localhost:5000` 고정
- GH Pages에서 API 동작 가정
- header만 고치고 common 보정과 모순

## Tasks

**A. 링크 404** — depth → getBasePath → 상대경로 + fixRootLinks  
**B. API 실패** — port → getApiBase → backend 5000  
**C. 메뉴 추가** — header/footer 상대 링크  

## Checklist

- [ ] 깊은 경로 header/footer
- [ ] 메뉴 이동 · API base 분기
