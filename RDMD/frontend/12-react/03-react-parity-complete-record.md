# 03 · React 정식 버전 — 바닐라 기능 100% 반영 (패리티 완료)

- 대상: `root-cloudflare/` (React + Vite)
- 기준: `root-render/` (바닐라, Render 실무 정본)
- 목표: **바닐라에 있는 기능 중 React 에 없거나 낡은 부분을 전부 반영**

---

## 1. 한 일 요약

| 구분 | 내용 |
|------|------|
| 동기화 | `npm run sync:render` 스크립트 신설 — CSS 19개 · `tier-media` · 티어 데이터 일괄 갱신 |
| 홈 | 퀵카드 아이콘(`.quick-card-icon`) 반영 |
| 커스텀 메이커 | **꾸미기(테두리 색·배경 이펙트·등급별 테마)** 이식 |
| 인증 | 로그인 · 회원가입 · 아이디/비번 찾기 · 비번 재설정 |
| 게시판 | 목록/검색 · 상세(댓글·답변·수정·삭제·신고·좋아요) · **본인 글 수정** |
| 마이페이지 | 통계 5종 + 내 게시글 + 최근 뽑기 |
| 알림 | 전체보기 페이지(탭 4개 + 정렬/읽음 필터) |
| 문의 | 작성·답변·인용 답변·수정·삭제·신고·알림 딥링크 |
| 관리자 | 로그인 · 대시보드 4섹션 · 문의 상세 |
| 버그 수정 | 이미지 경로 이중 인코딩(`%2520`) 404 |

결과: **바닐라 기능 100% 반영 완료.** 남은 항목은 8단계(React 실무 배포)뿐이며 창시자 지시 전까지 진행하지 않는다.

---

## 2. 동기화 스크립트 (`scripts/sync-from-render.mjs`)

바닐라가 정본이므로, 손으로 복사하지 않고 한 명령으로 다시 맞출 수 있게 만들었다.

```bash
cd root-cloudflare
npm run sync:render   # sync-from-render.mjs + extract-tiers.mjs
```

하는 일:

1. `root-render/**/*.css` 19개를 `src/styles/` 로 복사 (이름 충돌은 `login.css → auth-login.css` 식으로 매핑)
2. `url('tier-media/…')` → `url('/tier-media/…')` **절대경로 변환**
   - Vite 는 CSS 를 `/assets/` 로 번들하므로 상대경로가 그대로면 404 가 난다.
3. 페이지 전용 CSS 의 `body` / `html` / `*` 전역 선택자를 래퍼 클래스로 **스코프**
   - `auth-login/signup/find/admin-login` → `.auth-page`
   - `contact_us` → `.inquiry-page`
   - 바닐라는 페이지마다 문서가 달라 `body` 에 배경을 줘도 됐지만, React 는 한 앱이라 그대로 두면 전역 오염이 된다.
4. `root-render/tier-media` → `public/tier-media` 복사, manifest 의 `start_url`/`scope`/아이콘을 절대경로로 보정

> React 전용 스타일은 `src/styles/react-extra.css` 에 둔다. 이 파일은 스크립트가 덮어쓰지 않는다.

발견된 드리프트: `common.css`(698 vs 600줄), `custom-maker.css`(946 vs 657줄),
`tiers.json`(3티어 62→61명, 5티어 43→44명).

---

## 3. 새로 만든 파일

### lib

| 파일 | 역할 |
|------|------|
| `lib/tierStyle.js` | 꾸미기 — 등급별 테두리 색·배경 이펙트, 프리셋 10종, `tierStyleProps()` 로 CSS 변수 주입 |
| `lib/authApi.js` | 로그인/가입/아이디 찾기/비번 재설정 + `EMAIL_NOT_CONFIGURED` 등 에러 문구 |
| `lib/boardApi.js` | 게시글·댓글 CRUD/좋아요(PATCH)/신고, `@닉네임` 검색 파싱, 날짜 포맷 |
| `lib/adminApi.js` | 관리자 상수·포맷터·차단 만료 계산·데이터 로더 |

### components

`DecoratePanel` · `AuthShell` · `ReportModal` · `NoticeEditor` · `AdminPagination`

### pages

`Login` · `SignUp` · `FindAccount` · `ResetPassword` · `Board` · `PostDetail` · `PostEdit` ·
`MyPage` · `Notifications` · `Inquiry` · `AdminLogin` · `AdminDashboard` · `AdminCommentDetail`

---

## 4. 설계 판단

### 본인 글 수정은 메이커를 재사용

바닐라 `post_edit.html` 이 `custom-maker.js` 를 그대로 쓰는 구조였으므로 React 도 같게 했다.

```jsx
// PostEdit.jsx
return <CustomMaker key={id} editId={id} />;
```

`CustomMaker` 는 `editId` 가 있으면:
- 서버에서 글을 받아 `rematchToCatalog(tierState)` + `normalizeStyleMap(style)` 로 복원
- **localStorage 저장을 하지 않는다** (작업 중이던 내 티어표가 덮어써지는 걸 막기 위해)
- 업로드 버튼이 "수정완료"(PUT)로 바뀌고, 저장 후 상세로 이동

### 관리자 요청은 `adminRequest()` 하나로

`apiRequest(path, { admin: true })` 를 추가하고 `adminRequest` 단축 래퍼를 뒀다.
`adminAuthToken` 규칙과 서버 `requireAdmin` 은 그대로다 — 프론트 가드는 UX 용이고 최종 판단은 서버가 한다.

### innerHTML → JSX

바닐라 관리자/문의 화면은 목록을 innerHTML 로 통째로 다시 쓰고 **매 렌더마다 리스너를 재바인딩**했다.
React 는 state → JSX 재렌더라 이 재바인딩 코드가 전부 사라졌다.
바닐라가 인라인 `style="..."` 로 처리하던 것들은 `react-extra.css` 의 클래스로 옮겼다.

### 문의 페이지의 열린 입력 상자

바닐라는 `closeAllActionBoxes()` 로 DOM 을 뒤져 닫았다. React 는 `box` state **하나**만 두어
"화면에 열린 입력 상자는 항상 1개"라는 규칙이 구조적으로 보장된다.

---

## 5. 고친 버그 — 이미지 경로 이중 인코딩

`tierImageUrl()` 이 `encodeURI()` 만 하고 있었는데, DB 에는 이미 인코딩된 경로(`1%20tier/…`)가
섞여 있어 `1%2520tier/…` 가 되며 404 가 났다.

```js
let decoded = stripped;
try { decoded = decodeURI(stripped); } catch { /* 잘못된 % 시퀀스는 원문 유지 */ }
return TIER_IMAGE_ROOT + encodeURI(decoded);
```

---

## 6. 검증

```bash
cd root-cloudflare && npm run build     # 에러·경고 0
cd backend && npm start                 # 정적 루트 = root-cloudflare/dist
```

- SPA 라우트 16개 전부 200 (`/`, `/login`, `/admin`, `/admin/comment`, `/my-page`,
  `/notifications`, `/inquiry`, `/board`, `/board/edit`, `/board/post`, `/custom-maker`,
  `/luck-draw`, `/tier/1`, `/notice`, `/notice/all`, `/admin/login`)
- 브라우저 콘솔 에러 0, 실패 리소스 0
- 비로그인 가드 동작: `/my-page`·`/notifications` → 로그인 유도, `/admin`·`/admin/comment` → `/admin/login`

관리자 대시보드의 실제 데이터 조작(공지 등록·차단·신고 처리)은 관리자 계정 로그인이 필요하므로
**수동 확인 항목**으로 남겨둔다.

---

## 7. 주의

- `root-render/` 는 **건드리지 않았다.** Render 실무 배포는 그대로 바닐라다.
- React 를 실무 배포로 전환하는 건 8단계이며, 창시자 지시 전까지 하지 않는다.
- 바닐라 쪽 CSS/티어 데이터가 바뀌면 먼저 `npm run sync:render` 를 돌린 뒤 컴포넌트를 본다.
