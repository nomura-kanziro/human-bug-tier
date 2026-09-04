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
| 5-1 커스텀 메이커(제작) | ✅ | `/custom-maker` |
| 6-1 행운 뽑기 | ✅ | `/luck-draw` |
| 4 인증 | ⏳ `PendingPage` | `/login` `/signup` `/find-account` `/reset-password` |
| 5-2 게시판 | ⏳ | `/board` `/board/*` |
| 6-2 마이페이지 | ⏳ | `/my-page` |
| 7 관리자·문의·알림상세 | ⏳ | `/admin/*` `/inquiry` `/notifications` |

옵 바닐라 주소(`/tier-class/tier1.html`, `/notice/notice-detail.html?id=…` 등)는 `LegacyRedirect` 가 새 라우트로 보낸다(알림 link 호환).

### 공식 티어표 — 한 페이지 + 내부 navbar

바닐라는 `tier1.html ~ tier9.html` 9개 페이지 + `tier1.css ~ tier9.css` 9개 스타일이었지만,
React 는 **`TierPage` 한 개**가 navbar 로 등급만 전환한다(리마운트 없음, URL 은 `replace` 로 동기화).

- 등급별로 다른 값은 전부 **CSS 변수** → `tier-board.css` 의 `.tier-scope[data-tier="N"]` 블록 **한 곳**에만 있다.
  레이아웃 규칙(.tier-row/.char/…)은 중복이 없고, 1등급 보석 연출도 선택자에 등급을 고정해 전환 시 잔상이 없다.
- 변수가 없는 등급이 들어와도 기본값(흑백)으로 그려져 깨지지 않는다.
- 등급 수·세부등급·캐릭터는 `src/data/tiers.js` 에서 파생 — 이벤트로 구성이 바뀌어도 컴포넌트를 안 고쳐도 된다.

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
   ├─ lib/                     # api · paths · theme · notifications · noticeFormat · noticeApi · makerState · loadScript
   ├─ components/              # Header · Footer · ThemeToggle · SponsorButton · NotificationBell · UserProfileMenu · LoadingScreen · Layout · NoticeListItem · HomeLuckWidget
   ├─ pages/                   # Home · TierPage · CustomMaker · LuckDraw · Notice* · PendingPage · LegacyRedirect
   ├─ data/                    # tiers.json(생성물) + tiers.js(등급·세부등급·캐릭터 풀 파생)
   └─ styles/                  # 바닐라 CSS 그대로(theme, loading-screen, common, Header_Footer, index-home, notice,
                              #  tier-nav, luck-draw, custom-maker) + tier-board.css(등급별 변수 통합, 신규)
```

## 규칙 (바닐라와 동일하게 유지)

- 이미지 경로는 `tierImageUrl()` 로만 만든다 — 서버가 `tier-image/…`·`tier-media/tier-image/…` 어느 접두사로 보내도 `/tier-media/tier-image/…` 로 정규화.
- 유저 토큰 `authToken` + `getAuthHeaders()`, 관리자 `adminAuthToken` + 서버 `requireAdmin`. 프론트만으로 관리 API 를 열지 않는다.
- 확률·포인트·제한은 서버가 계산. 프론트는 표시만.
- **티어 캐릭터 추가/재배치는 여전히 `root-render/tier-class/tierN.html` 에서** 하고 `npm run extract:tiers` → 빌드.
  공식 티어표와 커스텀 메이커 둘 다 이 데이터를 보므로 한 번에 따라온다(정의가 어긋나 꼬이지 않음).
- 등급별 색은 `tier-board.css` 의 `.tier-scope[data-tier="N"]` 블록에서만 수정한다.
- 커스텀 메이커 저장 형식(`{ "<0-based 등급>_<세부등급>": […] }`)과 localStorage 키(`customMakerTierState`)는
  바닐라·게시판 DB 와 호환되어야 하므로 바꾸지 않는다.
- 행운 뽑기 게스트 상태는 홈 위젯과 같은 키(`luckDrawGuestState`)를 공유한다.
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
| `tier-nav.js` + `tier1~9.css` + 9개 HTML | `pages/TierPage.jsx` 1개 + `styles/tier-board.css` 1개 |
| `custom-maker.js`(1300줄, tier-class HTML fetch/파싱) | `pages/CustomMaker.jsx` + `lib/makerState.js` (데이터는 tiers.js 에서 즉시) |
| `luck-draw.js` + `luck-draw-api.js` | `pages/LuckDraw.jsx` (apiRequest 재사용) |
| `index-home.js` | `Home`(QuickCard) + `HomeLuckWidget` |
