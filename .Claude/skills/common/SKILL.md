---
name: common
description: >
  Header, Footer, Layout, 라우팅, getApiBase, 사이트 버전, 링크 404.
---

# Claude 스킬 — 공통 인프라

> 정본 [`.Agents/skills/common/SKILL.md`](../../../.Agents/skills/common/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- 헤더·푸터·사이드 메뉴·로고 오류, 링크 404
- `getApiBase`, `getAuthHeaders`, 라우트 변경
- 사이트 버전 표시

## Code map

- 레이아웃: `root-cloudflare/src/components/Layout.jsx`, `Header.jsx`, `Footer.jsx`, 라우트 `src/App.jsx`
- 헤더 부품: `UserProfileMenu.jsx`, `NotificationBell.jsx`, `ThemeToggle.jsx`, `SponsorButton.jsx`
- API: `src/lib/api.js`(`getApiBase`, `getAuthHeaders`, `getAdminAuthHeaders`, `apiRequest`, `adminRequest`)
- 경로: `src/lib/paths.js`(`tierImageUrl`, 바닐라 URL → React 라우트 변환), `pages/LegacyRedirect.jsx`
- 스타일: `src/styles/common.css`, `Header_Footer.css`, `design-system.css`, `theme.css`
- 사이트 버전: `Footer.jsx` `SITE_VERSION`
- PWA: `public/manifest.webmanifest`
- (바닐라 보관본·수정 금지) `root-render/common.js`, `header.html`, `footer.html`

## Read first

- `.Agents/common-rules.md` (B절)
- `RDMD/features/common-infra.md`
- `RDMD/guides/path-and-api.md`

## Do

1. 내부 이동은 React Router 절대 경로(`<Link to="/…">`). 이미지는 `tierImageUrl()`
2. API 는 `lib/api.js` 만 쓴다. 분기(개발 포트 → `localhost:5000`, 동일 오리진 → `''`, GH Pages → `GITHUB_STATIC`)를 바꾸지 않는다
3. 전 페이지에 영향이 가므로 최소 diff + 회귀 확인
4. 헤더 패널은 `Header.jsx` 의 `panel` 상태(`'profile' | 'bell' | null`) 하나로 관리한다. 새 패널도 여기에 넣어 동시에 열리지 않게 한다
5. 메뉴를 고치면 데스크톱 메뉴와 사이드 메뉴를 둘 다 확인한다
6. 미구현 메뉴는 **준비 중**(`PendingPage.jsx`)으로 표시한다

## Do not

- 프로덕션에 `localhost:5000` 고정
- GH Pages 에서 API 동작 가정
- `getBasePath` · `fixRootLinksInElement` 를 React 로 가져오기
- 미구현 메뉴를 빈 `#` 링크로 두기
- `body { text-align: center }` 같은 전역 레이아웃 회귀 유발 CSS

## Tasks

**A. 링크 404** — `App.jsx` 라우트 → 바닐라 URL 이면 `LegacyRedirect`·`paths.js` 매핑
**B. API 실패** — `getApiBase()` 결과 → backend `:5000` 실행 여부 → 응답이 HTML 이면 라우트·프록시
**C. 메뉴 추가** — `Header.jsx` 메뉴 + 사이드 메뉴 + `Footer.jsx`

## Checklist

- [ ] 데스크톱·모바일 메뉴 이동
- [ ] API base 분기
- [ ] 프로필·알림 패널이 동시에 안 열림
