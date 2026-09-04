---
area: frontend
---

# 커밋 요약 — React 정식 버전 1~3단계 이식 (root-cloudflare)

## 개요

창시자 지시(2026-09-05)로 `root-cloudflare/` 의 바닐라 프론트를 **Vite + React 18 + React Router 6** 앱으로 교체했다. `RDMD/features/react-rewrite.md` 의 단계 중 **1(스캐폴드·API 클라이언트) → 2(레이아웃) → 3(공개 페이지: 홈·공식 티어 1~9·공지)** 까지 이식했고, 4단계 이후(인증·커스텀·게시판·뽑기 상세·마이페이지·문의·알림 상세·관리자)는 라우트만 확정해 `PendingPage` 자리표시자로 두었다. 바닐라 정본은 `root-render/`(Render 실무 배포)에 그대로 남아 있으며, 백엔드는 변경 없이 `dist/` 서빙 + SPA 폴백만 추가했다.

## 관련 커밋

- **commit pending** (파트별 커밋 — commit_history 참고)

## 변경된 파일 목록

- Removed: `root-cloudflare/` 바닐라 전부 (`common.js`, `header.html`, `tier-class/`, `notice/`, `custom-maker/`, `user_login/`, `admin/`, `luck-draw/`, `my-page/`, `notifications/`, `Contact_us/`, `tier-image/`, `sw.js`, `pwa-register.js` …)
- Added: `root-cloudflare/package.json`, `vite.config.js`, `index.html`, `.gitignore`
- Added: `root-cloudflare/public/manifest.webmanifest`, `public/tier-media/tier-image/**` (root-render 와 동일 자산, 359 파일)
- Added: `root-cloudflare/scripts/extract-tiers.mjs` → `src/data/tiers.json`
- Added: `root-cloudflare/src/lib/{api,paths,theme,notifications,noticeFormat,noticeApi}.js`
- Added: `root-cloudflare/src/context/AuthContext.jsx`
- Added: `root-cloudflare/src/components/{Header,Footer,ThemeToggle,SponsorButton,NotificationBell,UserProfileMenu,LoadingScreen,Layout,NoticeListItem,HomeLuckWidget}.jsx`
- Added: `root-cloudflare/src/pages/{Home,TierPage,NoticeHome,NoticeList,NoticeDetail,PendingPage,LegacyRedirect}.jsx`
- Added: `root-cloudflare/src/styles/**` (바닐라 CSS 그대로 복사: theme, loading-screen, common, Header_Footer, index-home, notice, tier-nav, tier-responsive, tier/tier1~9)
- Modified: `backend/server.js` (`resolveStaticRoot` 기본값 → `root-cloudflare/dist`, SPA 폴백, favicon 후보 경로)
- Modified: `root-cloudflare/README.md`, `RDMD/features/react-rewrite.md`, `.agents/react-rewrite/skill.md`, `.claude/skills/react-rewrite/SKILL.md`

## 주요 구현 내용

### 1. 바닐라 CSS 그대로, 마크업 클래스명 유지

새 디자인을 만들지 않고 `root-render/` 의 CSS 파일을 `src/styles/` 로 복사해 전역 import 했다. 컴포넌트는 바닐라 HTML 과 **같은 클래스·id 구조**를 그대로 출력하므로 픽셀 단위로 동일하게 보인다. 다크 모드(`[data-theme]`), 로딩 오버레이, 알림 패널/프로필 드롭다운의 `.is-open` 토글 규칙도 그대로.

### 2. 티어 페이지 — 데이터 추출 + CSS 범위 격리

- `scripts/extract-tiers.mjs` 가 `root-render/tier-class/tier1~9.html` 을 정규식으로 파싱해 `{ tier, title, rows[{ label, items[{ img, alt, name } | { break }] }] }` JSON 을 만든다(343 카드 / 30 행 = 원본과 일치 검증). **캐릭터 추가·재배치는 여전히 바닐라 HTML 에서** 하고 스크립트를 다시 돌린다.
- `tierN.css` 는 `body`/`main`/`h2` 같은 페이지 전역 규칙을 포함해 9개를 함께 import 하면 서로 덮어쓴다. `import.meta.glob(..., { query: '?inline' })` 로 문자열로 받아 `TierPage` 마운트 중에만 `<style data-tier-style>` 로 주입하고 언마운트 시 제거 — 바닐라에서 페이지마다 다른 CSS 파일을 링크하던 것과 같은 적용 범위.
- `tier-nav.js` 의 이전/다음 네비·`data-tier` 윤광은 컴포넌트 안에서 직접 렌더.

### 3. API·인증·경로 규칙 유지

- `getApiBase()`(개발 포트→`localhost:5000`, 동일 오리진→`''`, GH Pages→`GITHUB_STATIC`), `getAuthHeaders()`(`authToken`), `getAdminAuthHeaders()`(`adminAuthToken`) 를 `src/lib/api.js` 로 이식. `apiRequest()` 가 `{ ok, status, data }` 를 돌려준다.
- `AuthContext` 는 바닐라와 **같은 localStorage 키**(`user`, `authToken`, `isAdmin`, `adminName`, `profileImage`)를 읽어 root-render 와 로그인 상태를 공유한다. 관리자도 일반 유저와 같은 프로필 UI, "🛠 관리하기" 만 추가(관리자 티 안 내기 원칙 유지).
- `getBasePath()`/`fixRootLinksInElement` 는 SPA 에서 불필요 → 절대경로 + `<Link>`. 대신 서버가 `tier-image/…` 또는 `tier-media/tier-image/…` 어느 접두사로 보내도 `tierImageUrl()` 이 `/tier-media/tier-image/…` 로 정규화.
- 알림 딥링크: `resolveNotificationTarget()` 이 바닐라 `storeNotificationScrollTarget` 과 같은 sessionStorage 페이로드(`notificationScrollTarget`, `selectedPostId`, `selectedNoticeId`)를 남기고 `legacyToRoute()` 로 React 라우트를 돌려준다.

### 4. 옛 URL 호환

`/tier-class/tier5.html`, `/notice/notice-detail.html?id=…`, `/index.html` 등 바닐라 주소는 `LegacyRedirect` 가 새 라우트(`/tier/5`, `/notice/:id`)로 `replace` 리다이렉트한다. `/notice/*.html` 은 `/notice/:id` 보다 먼저 정적 라우트로 등록해 `:id` 에 잡히지 않게 했다. 서버 쪽은 확장자 없는 경로와 `.html` 요청을 `index.html` 로 폴백(`isSpaRoot` = dist/index.html 있고 header.html 없음).

### 5. backend/server.js

```
STATIC_ROOT > RENDER=true(root-render) > root-cloudflare/dist(있으면) > root-cloudflare
```
Render 배포 동작은 변하지 않는다(`RENDER=true` 분기가 먼저). 기존 주석은 문구만 갱신.

## 변경 전/후 (주요)

| 항목 | 변경 전 (바닐라) | 변경 후 (React) |
|------|------------------|-----------------|
| 헤더/푸터 | 매 페이지 `fetch(header.html)` 후 innerHTML + 경로 보정 | `Layout` 컴포넌트, fetch 없음 |
| 페이지 이동 | 전체 새로고침 | 클라이언트 라우팅(`/tier/1`, `/notice/:id`) |
| 티어 데이터 | HTML 9개에 하드코딩 | `tiers.json`(바닐라에서 생성) + `TierPage` 1개 |
| 이미지 경로 | `getBasePath()+'tier-media/tier-image/…'` | `tierImageUrl()` 절대경로 |
| 알림/프로필 상호배타 | 서로 `closeXxx()` 직접 호출 | `Header` 의 단일 `panel` state |
| 로컬 기본 정적 루트 | `root-cloudflare/` | `root-cloudflare/dist/` |

## 테스트 체크리스트 (`:5000`, `npm run build` 후)

1. `/` — 소개·퀵카드 3개(빈 곳 클릭 시 스크롤)·공지/새소식 2건씩·메이커 미리보기·행운 위젯·티어 카드 9개 ✅
2. `/tier/1` ~ `/tier/9` — 행/카드 수 원본과 동일, 1티어 보석 애니메이션, 이전/다음 네비, 제목 윤광 ✅
3. `/notice`, `/notice/all`, `/notice/news`, `/notice/:id` — 목록·개수 문구·상세 마크다운 렌더·원문 토글 ✅
4. `/tier-class/tier5.html` → `/tier/5`, `/notice/notice-detail.html?id=…` → `/notice/:id` 리다이렉트 ✅
5. 로그인 상태(localStorage `user`/`authToken`) — 아바타·벨 표시, 드롭다운/알림 패널 상호배타, 바깥 클릭 닫힘 ✅
6. 다크/라이트 토글, 자동 시간대 테마 ✅
7. 게스트 행운 뽑기 1회 → 24시간 안내 (`luckDrawGuestState`) — 바닐라와 동일 키
8. `STATIC_ROOT=root-render` 로 켜면 바닐라 그대로 동작(회귀 없음)

## 향후 개선 제안

- 4단계(인증) 이식 시 `AuthContext.refresh()` 를 로그인 성공 후 호출하도록 연결
- `PendingPage` 를 실제 페이지로 교체할 때 `legacyToRoute()` 의 대응 표를 함께 갱신
- `tiers.json` 자동 생성을 `npm run build` prebuild 훅으로 묶기(지금은 수동 `npm run extract:tiers`)
- SW/PWA 오프라인 캐시는 Vite 플러그인(`vite-plugin-pwa`)으로 재검토(현재 manifest 만 유지)

---
문서 생성일: 2026-09-05
