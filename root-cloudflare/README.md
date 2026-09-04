# root-cloudflare — 정식 버전 React 프론트 (Vite + React 18 + React Router 6)

2026-09-05 창시자 지시로 이 폴더의 바닐라 프론트를 **React 앱으로 교체**했다.  
바닐라 전체 기능은 `root-render/`(Render 실무 배포)에 그대로 있다. 기획 정본: `RDMD/features/react-rewrite.md`.

| 환경 | 정적 루트 |
|------|-----------|
| 로컬 `cd backend && npm start` (기본) | **`root-cloudflare/dist/`** (빌드 결과. 없으면 이 폴더 자체 → 아무것도 안 보임, 먼저 빌드) |
| 로컬에서 Render 화면 확인 | `STATIC_ROOT=root-render` |
| Render.com (`RENDER=true`) | `root-render/` (바닐라, 실무) |
| Cloudflare Pages | **작업 중지** (이 폴더를 그대로 올리면 안 됨 — dist 를 올려야 함) |

## 실행

```bash
# 1) React 빌드 (변경할 때마다)
cd root-cloudflare
npm install
npm run build          # → dist/

# 2) 서버 (프론트 + API 통합, :5000)
cd ../backend
npm start
```

→ http://localhost:5000/ — `backend/server.js` 가 `dist/` 를 서빙하고, 파일이 없는 경로(`/tier/1`, `*.html`)는 `index.html` 로 폴백해 클라이언트 라우터가 처리한다.

개발 중 HMR 이 필요하면 `npm run dev` (5173). `/api` 는 vite.config.js 프록시로 `:5000` 에 전달되므로 backend 도 함께 켠다.

## 이식 현황 (react-rewrite.md 단계)

| 단계 | 상태 | 라우트 |
|------|------|--------|
| 1 스캐폴드·API 클라이언트 | ✅ | `src/lib/api.js`(getApiBase/getAuthHeaders/apiRequest) |
| 2 레이아웃(헤더/푸터/알림/프로필/테마/로딩) | ✅ | `src/components/` |
| 3 공개 페이지 | ✅ | `/` · `/tier/:n` · `/notice` · `/notice/all` · `/notice/news` · `/notice/:id` |
| 4 인증 | ⏳ `PendingPage` | `/login` `/signup` `/find-account` `/reset-password` |
| 5 커스텀·게시판 | ⏳ | `/custom-maker` `/board` `/board/*` |
| 6 뽑기·마이페이지 | ⏳ (홈 위젯만 완료) | `/luck-draw` `/my-page` |
| 7 관리자·문의·알림상세 | ⏳ | `/admin/*` `/inquiry` `/notifications` |

옛 바닐라 주소(`/tier-class/tier1.html`, `/notice/notice-detail.html?id=…` 등)는 `LegacyRedirect` 가 새 라우트로 보낸다(알림 link 호환).

## 구조

```
root-cloudflare/
├─ index.html              # 테마 FOUC 방지 인라인 스크립트 + #root
├─ vite.config.js          # /api → :5000 프록시, outDir dist
├─ public/
│  ├─ manifest.webmanifest
│  └─ tier-media/tier-image/   # 캐릭터·로고·PWA 아이콘 (root-render 와 동일 경로 규칙)
├─ scripts/extract-tiers.mjs   # root-render/tier-class/tierN.html → src/data/tiers.json
└─ src/
   ├─ main.jsx / App.jsx       # 전역 CSS import, 라우트
   ├─ context/AuthContext.jsx  # localStorage(user/authToken/isAdmin/adminName/profileImage) 신원
   ├─ lib/                     # api · paths(tierImageUrl, legacyToRoute) · theme · notifications · noticeFormat · noticeApi
   ├─ components/              # Header · Footer · ThemeToggle · SponsorButton · NotificationBell · UserProfileMenu · LoadingScreen · Layout · NoticeListItem · HomeLuckWidget
   ├─ pages/                   # Home · TierPage · NoticeHome · NoticeList · NoticeDetail · PendingPage · LegacyRedirect
   ├─ data/tiers.json          # 공식 1~9티어 데이터 (생성물)
   └─ styles/                  # 바닐라 CSS 그대로(theme, loading-screen, common, Header_Footer, index-home, notice, tier-nav, tier-responsive, tier/tier1~9.css)
```

## 규칙 (바닐라와 동일하게 유지)

- 이미지 경로는 `tierImageUrl()` 로만 만든다 — 서버가 `tier-image/…`·`tier-media/tier-image/…` 어느 접두사로 보내도 `/tier-media/tier-image/…` 로 정규화.
- 유저 토큰 `authToken` + `getAuthHeaders()`, 관리자 `adminAuthToken` + 서버 `requireAdmin`. 프론트만으로 관리 API 를 열지 않는다.
- 확률·포인트·제한은 서버가 계산. 프론트는 표시만.
- **티어 캐릭터 추가/재배치는 여전히 `root-render/tier-class/tierN.html` 에서** 하고 `npm run extract:tiers` → 빌드. (React 데이터는 바닐라 정본에서 생성)
- `tierN.css` 는 `body`/`main` 규칙을 포함하므로 전역 import 하지 않고 `TierPage` 가 마운트 중에만 `<style>` 로 주입한다.
- `.char` 마크업(`img + span`)은 커스텀 메이커 파싱 구조이므로 바꾸지 않는다.

## 이식 시 참고 (바닐라 → React 대응)

| 바닐라 | React |
|--------|-------|
| `common.js` loadCommon/헤더 fetch | `Layout` + `Header` 컴포넌트 (fetch 없음) |
| `getBasePath()` / `fixRootLinksInElement` | 불필요 — 절대경로 `/…` + `<Link>` |
| `renderUserProfile` / `renderNotificationBell` | `UserProfileMenu` / `NotificationBell` (상호배타는 `Header` 의 `panel` state) |
| `theme.js` | `useTheme()` 훅 |
| `loading-screen.js` | `LoadingScreen` (마운트 직후 페이드) |
| `notice.js` | `lib/noticeFormat.js` + `lib/noticeApi.js` + `pages/Notice*.jsx` |
| `tier-nav.js` | `TierPage` 안 `NavBtn` + `data-tier` |
| `index-home.js` | `Home`(QuickCard) + `HomeLuckWidget` |
