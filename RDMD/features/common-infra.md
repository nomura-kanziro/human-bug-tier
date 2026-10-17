# 공통 인프라 (React: Layout · Header · Footer · 경로 · API · 테마 · 인증)

모든 화면이 공유하는 **레이아웃 · 경로 · API Base · 인증 헤더 · 테마 · 계절 배경** 규칙입니다.

> 2026-10-18 React(`root-cloudflare/`) 기준으로 다시 썼다. 예전 문서는 바닐라(`common.js` · `header.html` 동적 삽입 · `getBasePath()`) 기준이었고,
> 그 방식은 `root-render/`(베타 종료, 수정 금지)에만 남아 있다. 바닐라 시절 기록은 `RDMD/frontend/01-common/` · `09-deploy-path/` 에 있다.

## 관련 파일 (`root-cloudflare/`)

| 파일 | 역할 |
|------|------|
| `index.html` | 진입 HTML. **React 가 뜨기 전에** 테마(`data-theme`)와 계절 배경(`data-season`)을 먼저 붙이는 인라인 스크립트, 정적 로딩 오버레이, 폰트(Pretendard), manifest 링크 |
| `src/main.jsx` | `BrowserRouter` → `AuthProvider` → `LoadingScreen` · `SeasonalBackdrop` · `App` · `GuideMode`. 전역 CSS 불러오는 순서(`design-system`·`app-shell`·`guide`·`season` 이 뒤쪽 — 페이지 CSS 를 덮어야 해서 순서를 바꾸지 않는다) |
| `src/App.jsx` | 라우트 정의(아래 표) |
| `src/components/Layout.jsx` | 헤더 + `<Outlet/>` + 푸터. 라우트가 바뀌면 맨 위로 스크롤(해시가 있으면 그 요소로) |
| `src/components/Header.jsx` | 데스크톱 드롭다운 5개 · 모바일 사이드 메뉴 · 테마 스위치 · 후원 버튼 · 알림 벨 · 프로필 · 사이드 메뉴 맨 아래 계정 영역 |
| `src/components/Footer.jsx` | 소개 · 바로가기(둘러보기: 공식 티어표·커스텀 메이커·커스텀 게시판 / 이용 안내: **가이드**·**AI 도우미**·행운 뽑기·공지사항·문의하기) · **`SITE_VERSION`**(수동 관리) |
| `src/lib/api.js` | `getApiBase()` · `getAuthHeaders()` · `getAdminAuthHeaders()` · `apiRequest()` · `adminRequest()` · `isStaticPreview()` |
| `src/lib/paths.js` | 캐릭터 이미지 경로(`tierImageUrl`) · 로고 · 바닐라 URL → React 라우트(`legacyToRoute`) |
| `src/context/AuthContext.jsx` | 로그인 신원·프로필 사진·자동 로그아웃 |
| `src/lib/theme.js` | 라이트/다크 + 서울 시각 자동 전환 |
| `src/lib/season.js` · `components/SeasonalBackdrop.jsx` · `styles/season.css` | 계절 배경(이벤트 디자인) |
| `src/pages/LegacyRedirect.jsx` | 옛 바닐라 `*.html` 주소 → 새 라우트, 그 외 404 |
| `public/manifest.webmanifest` | PWA 홈 화면 설치(아이콘·시작 주소). **서비스 워커는 없다**(바닐라의 `sw.js` 는 React 판에 없음) |
| `functions/api/[[path]].js` | Cloudflare Pages Function — `/api/*` 를 Oracle 서버로 프록시 |
| `vite.config.js` | 개발(5173)에서 `/api`·`/health` 를 `:5000` 으로 프록시, 빌드 결과 `dist/` |

## 라우트 (`App.jsx`)

| 구분 | 경로 |
|------|------|
| 단독 페이지(공용 헤더/푸터 없음) | `/login` `/signup` `/find-account` `/reset-password` `/admin/login` |
| 공용 Layout 안 | `/` · `/tier`→`/tier/1` · `/tier/:n` · `/notice` `/notice/all` `/notice/news` `/notice/:id` · `/custom-maker` · `/luck-draw` · `/event` · `/guide` · `/ai` · `/board` `/board/post` `/board/edit` · `/my-page` · `/notifications` · `/inquiry` · `/admin` `/admin/comment` |
| 옛 주소 | `/notice/notice.html` 등 → `LegacyRedirect`. 알 수 없는 경로는 404 |

## 핵심 규칙

### 1. 경로

- 서브패스 배포가 없으므로 사이트 루트 기준 절대 경로(`/tier/1`, `/tier-media/...`)를 쓴다(Vite `base: '/'`). 바닐라의 `getBasePath()` · `fixRootLinksInElement` 는 React 판에 없다.
- 캐릭터 이미지는 `tierImageUrl()` 로만 만든다(`/tier-media/tier-image/` + 인코딩, 이미 인코딩된 `%20` 중복 방지). 파일은 `public/tier-media/tier-image/` → 빌드 시 `dist/` 로 복사.
- 이동은 `<Link>`·`navigate()`. 서버가 내려 주는 옛 형식 링크(알림 `link` 등)는 `legacyToRoute()` 로 변환.

### 2. API Base — `getApiBase()`

| 조건 | 반환값 |
|------|--------|
| `*.github.io` | `'GITHUB_STATIC'` (API 호출 스킵 — 정적 미리보기) |
| `file:` 또는 포트 `5500, 3000, 5173, 8080, 4200, 8000` | `http://localhost:5000` |
| 그 외(:5000 통합, 정식 주소, Pages) | `''` (상대 경로 `/api/...`) |

Cloudflare Pages(`human-bug-tier.com`)에서는 `''` 이므로 요청이 Pages 로 오고, Pages Function 이 Oracle 서버로 넘긴다(Express 는 Pages 에 없음).

### 3. 인증 헤더

- 회원: `localStorage.authToken` + `getAuthHeaders()` → `Authorization: Bearer`. 관리자: `adminAuthToken` + `getAdminAuthHeaders()` + 서버 `requireAdmin`.
- `apiRequest(path, { auth, admin, ... })` 는 `{ ok, status, data }` 를 돌려준다(예외 대신 값). AI 도우미처럼 토큰이 필요 없는 요청은 `auth:false`.
- 다른 기기에서 닉네임을 바꾸면 옛 토큰은 서버가 401(`NICKNAME_CHANGED`)로 거부 → 세션 키를 지우고 한 번만 안내한다.

### 4. 로그인 신원 (`AuthContext`)

- 저장 키: `user`(JSON nickname/email) · `authToken` · `isAdmin` · `adminName` · `adminAuthToken` · `profileImage`(이 브라우저에만) · `loginAt` · `lastActiveAt`.
- 관리자도 회원과 같은 신원 형태로 다뤄 프로필 UI 가 같다(관리자 티 안 내기).
- 토큰 서버 만료는 회원 7일 / 관리자 24시간이지만, **활동 없이 1시간이 지나면 클라이언트가 먼저 자동 로그아웃**한다(활동 시각은 탭끼리 공유).

### 5. 테마 (`theme.js` + `index.html` 인라인 스크립트)

- 자동 규칙: **서울 시각 07:00~22:00 라이트, 그 외 다크**(브라우저 시간대는 보지 않는다).
- 헤더 스위치로 수동 선택하면 **다음 자동 전환 시각(07/22시)까지만** 유지되고 자동으로 돌아온다. 저장 `hbtTheme = {"t","u"}`.
- ⚠ `index.html` 의 인라인 스크립트(첫 렌더 전 깜빡임 방지)가 같은 규칙을 **복제**하고 있다 — 규칙을 바꾸면 두 곳을 같이 고친다.
- 색은 CSS 변수(`theme.css`, `html[data-theme="dark"]`)로만 쓴다.

### 6. 계절 배경 (이벤트 디자인)

- 관리자가 켠 값(`none|halloween|christmas`)을 `GET /api/site/settings` 로 받아 `<html data-season>` 에 붙인다(페이지를 열 때 + 30분마다·탭 복귀 시 재확인). 마지막 값을 `localStorage.hbtSeason` 에 기억해 `index.html` 이 먼저 적용한다.
- 장식은 `position:fixed; z-index:-1; pointer-events:none` 이라 본문 클릭에 영향이 없고, 단독 페이지(로그인류)에도 깔린다. 상세 [`../frontend/07-admin/13-event-design-record.md`](../frontend/07-admin/13-event-design-record.md).

### 7. 헤더 · 사이드 메뉴

- 메뉴 정의 `MENUS` 한 곳을 데스크톱·사이드 메뉴가 같이 쓴다: 공지·소식 / 티어표(1~9) / 커스텀 메이커(제작하기·게시판) / 이벤트(퀴즈·티어표 공개·메모리 게임) / 행운 뽑기(오늘의 행운 티어·포커·랜덤 뽑기). 데스크톱 드롭다운은 **클릭**으로 열고 닫는다(바깥 클릭·Esc·항목 선택 시 닫힘). 모바일 사이드 메뉴는 클릭 아코디언.
- 우측: 테마 스위치 · 후원(커피) · (로그인: 알림 벨 + 프로필 / 비로그인: 로그인 버튼) · 햄버거. 알림 패널과 프로필 드롭다운은 동시에 열리지 않는다.
- **사이드 메뉴 맨 아래 계정 영역**(1.0.2): 비로그인 = 로그인 버튼, 로그인 = 프로필 요약 + 프로필 보기·내 게시글·(관리자) 관리하기·로그아웃. [`../frontend/01-common/14-side-menu-account-mobile-header-record.md`](../frontend/01-common/14-side-menu-account-mobile-header-record.md)
- 모바일(768px 이하)은 로그인·후원 버튼·테마 스위치(32×18)·햄버거를 줄여 헤더 비중을 낮췄다.
- 가이드 모드·AI 도우미는 **헤더가 아니라 푸터**에서 들어간다.

### 8. 전역 오버레이

| 컴포넌트 | 역할 |
|---|---|
| `LoadingScreen` | `index.html` 의 정적 오버레이를 앱이 그려진 직후 치운다(일부러 지연을 만들지 않음) |
| `SeasonalBackdrop` | 계절 배경 SVG 층 |
| `GuideMode` | 가이드 모드 오버레이(켜졌을 때만) — [`../frontend/14-guide/01-guide-mode-record.md`](../frontend/14-guide/01-guide-mode-record.md) |

## 화면 추가 시 필수 체크

1. `App.jsx` 에 라우트 추가(공용 헤더/푸터가 필요하면 `<Route element={<Layout />}>` 안에)  
2. 이미지는 `tierImageUrl()`, API 는 `apiRequest()`(회원) / `adminRequest()`(관리자)  
3. 색은 CSS 변수만(라이트·다크 둘 다 확인), 모바일(390px) 확인  
4. 페이지 머리말에 `<header>` 태그를 쓰지 않는다(사이트 헤더 전역 스타일이 걸린다) — `<div>`  
5. 사이트 안내가 바뀌었으면 **`ai-service/knowledge/*.md`** 도 고친다([ai-service.md](./ai-service.md))

## 장애 대응

| 증상 | 확인 |
|------|------|
| API 가 "없는 API입니다"(404) | **:5000 서버가 옛 코드로 떠 있음** → 재시작(Node 는 시작할 때만 코드를 읽는다) |
| API CORS / 연결 실패 | 프론트 포트 vs backend 5000, `getApiBase()` |
| 로그인 후 401 | `authToken`, `apiRequest` 사용 여부, 닉네임 변경으로 토큰 무효 |
| 새로 만든 섹션이 안 보임 | 해당 API 가 실패해 섹션을 숨기는 화면(마이페이지 출석판 등) — Network 탭 확인 |
| 테마·배경이 한 번 깜빡임 | `index.html` 인라인 스크립트와 `theme.js`/`season.js` 규칙 불일치 |
| 정식 주소에서만 API 실패 | Pages Function(`functions/api/[[path]].js`)·Pages 환경변수 `API_ORIGIN`, Oracle 서버 상태(`/health`) |

## 관련 기록

- `frontend/01-common/` — 헤더·푸터·테마·로딩·디자인 시스템·사이드 메뉴 기록
- `frontend/09-deploy-path/` — 경로·API Base·Cloudflare Pages
- `frontend/12-react/` — 바닐라 → React 이식
