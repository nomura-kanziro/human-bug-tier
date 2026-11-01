# 전체 기능 맵

> ⛔ **2026-09-19 창시자 지시 — 프론트 작업은 `root-cloudflare/`(React)에만 한다.**  
> `root-render/`(바닐라, Render)는 **베타 버전에서 업데이트 종료 → 수정 금지**(보관용).  
> `backend/` 는 공용 API 서버라 계속 작업한다. 정본: [`../../.Agents/common-rules.md`](../../.Agents/common-rules.md) ０항  
> React 이식 현황: [react-rewrite.md](./react-rewrite.md) — 바닐라 기능 100% 반영 완료.

> 2026-10-18 현행 코드 기준으로 다시 썼다(예전 판은 바닐라 `index.html`·`custom-maker/` 폴더 기준이었다).

## 서비스 한눈에

```
 방문자 ─▶ https://human-bug-tier.com (Cloudflare Pages: React 빌드본 + /api 프록시)
                │                                   │ /api/*
                │                                   ▼
                │                  Oracle Cloud VM — nginx(HTTPS) → Node/Express :5000 → MongoDB Atlas
                │                                          │ /api/ai/*
                │                                          ▼
                │                          ai-service (FastAPI :8000, 내부 전용) — LangGraph · RAG · Claude
                ▼
   React 화면 (root-cloudflare/src/pages)
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ 홈 / · 공식 티어표 /tier/:n · 커스텀 메이커 /custom-maker · 게시판 /board │
   │ 행운 뽑기 /luck-draw · 이벤트 /event · 마이페이지 /my-page               │
   │ 공지 /notice · 알림 /notifications · 문의 /inquiry                       │
   │ 가이드 /guide(+ 가이드 모드) · AI 도우미 /ai                             │
   │ 로그인·가입·찾기·재설정 · 관리자 /admin                                   │
   └──────────────────────────────────────────────────────────────────────────┘
```

로컬 전체 체험은 `backend` 한 개(`:5000`)가 React 빌드(`root-cloudflare/dist`)와 API 를 같이 서빙한다. AI 도우미까지 보려면 `ai-service` 를 따로 띄운다.

## 폴더 ↔ 기능 대응

| 폴더 / 파일 | 기능 | 주요 사용자 |
|-------------|------|-------------|
| `root-cloudflare/src/pages/Home.jsx` | 홈(퀵 카드·공지·메이커 미리보기·행운 위젯·공식 티어표 카드) | 전체 |
| `root-cloudflare/src/components/Layout·Header·Footer.jsx`, `lib/api·paths·theme.js`, `context/AuthContext.jsx` | 공통 UI·경로·API Base·인증·테마 — [common-infra.md](./common-infra.md) | 전체 |
| `src/pages/TierPage.jsx` + `src/data/tiers.json` | 공식 1~9티어 — [tier-class.md](./tier-class.md) | 방문자 |
| `src/pages/CustomMaker.jsx`, `PostEdit.jsx`, `DecoratePanel.jsx` | 티어 제작·꾸미기·PNG/PDF·본인 글 수정 — [custom-maker.md](./custom-maker.md) | 회원·방문자 |
| `src/pages/Board.jsx`, `PostDetail.jsx` | 게시판·상세·댓글·추천·신고 | 회원 |
| `src/pages/Login·SignUp·FindAccount·ResetPassword.jsx` | 회원·인증 — [auth.md](./auth.md) | 방문자→회원 |
| `src/pages/NoticeHome·NoticeList·NoticeDetail.jsx` | 공지·새 소식 — [notice.md](./notice.md) | 전체 / 작성은 Admin |
| `src/pages/Inquiry.jsx` | 문의 — [inquiry.md](./inquiry.md) | 전체 / 답변 Admin |
| `src/pages/Notifications.jsx`, `components/NotificationBell.jsx` | 알림 — [notifications.md](./notifications.md) | 회원 |
| `src/pages/LuckDraw.jsx` + 포커·랜덤 뽑기 패널 | 행운 뽑기 3모드 + 포인트 — [luck-draw.md](./luck-draw.md) | 방문자(체크)·회원(저장·배팅) |
| `src/pages/EventPage.jsx` + `Event*Panel.jsx` | 이벤트(매일 퀴즈·티어표 공개·메모리 게임) | 회원 |
| `src/pages/MyPage.jsx` + `AttendanceBoard.jsx` | 마이페이지·프로필·출석판 — [my-page.md](./my-page.md) | 회원 |
| `src/pages/Guide.jsx` + `components/GuideMode.jsx` | 가이드 페이지 + 게임식 가이드 모드 | 방문자 |
| `src/pages/AiHelper.jsx` + **`ai-service/`** | AI 도우미(휴버봇·추천 질문) — [ai-service.md](./ai-service.md) | 방문자 |
| `src/pages/AdminDashboard.jsx` + `Admin*.jsx` | 관리자 통합 관리(공지·문의·신고·차단·이벤트 관리·행운 뽑기 관리·이벤트 디자인) — [admin.md](./admin.md) | Admin |
| `src/components/SeasonalBackdrop.jsx`, `lib/season.js` | 계절 배경(할로윈·크리스마스, 관리자가 켬) | 전체 |
| `backend/` | API + 정적 서빙(`dist`) — [backend-api.md](./backend-api.md) | 서버 |
| `ai-service/` | **AI 전용 서비스**(Python FastAPI · LangChain · LangGraph · RAG) — Express `/api/ai` 뒤에서만 호출 | 서버 |
| `root-cloudflare/functions/api/[[path]].js` | Cloudflare Pages `/api` 프록시 | 서버 |
| `backend/deploy/oracle/` | Oracle VM 배포 스크립트 | 운영 |
| `root-render/` | ⛔ 바닐라 베타(보관, 수정 금지) | — |
| `RDMD/` | 개발 기록·가이드·기능 문서 | 개발자 |

## 사용자 여정 (시연 흐름)

1. **홈** → 퀵 카드로 섹션 이동, 공지·메이커 미리보기·행운 위젯, 공식 티어표 카드  
2. **가이드**(푸터 → 가이드) → 가이드 모드를 켜고 한 줄 안내를 따라 사이트 한 바퀴. 왼쪽 아래 ✕ 로 종료  
3. **공식 티어표** → 1~9티어 캐릭터 열람(◀ ▶ 로 티어 전환)  
4. **커스텀 메이커** → 드래그(또는 모바일 탭)로 배치 → 꾸미기(테두리·이펙트·이펙트 색) → PNG/PDF 저장  
5. **(로그인)** → 게시판 업로드·댓글·추천·**본인 글 수정**, 로그인할 때마다 **출석체크** 포인트(마이페이지 출석판)  
6. **행운 뽑기·이벤트** → 포인트를 모으고(뽑기·퀴즈·출석) 포커·랜덤 뽑기에 배팅, 티어표 공개·메모리 게임 참여  
7. **AI 도우미**(푸터 → AI 도우미) → 티어·사이트 이용법을 물어봄(추천 질문 3개)  
8. **문의하기** → 관리자 답변 대기  
9. **관리자** → 공지 작성·수정·핀, 문의 답변, 신고·차단 처리, 이벤트 관리, 행운 뽑기 관리, 이벤트 디자인(계절 배경) ON/OFF  

로컬 전체 체험: `cd backend && npm start` → `http://localhost:5000/`

## 권한 요약

| 동작 | 비로그인 | 일반 회원 | 관리자 |
|------|:--------:|:---------:|:------:|
| 공식 티어 열람 | O | O | O |
| 커스텀 제작·다운로드 | O | O | O |
| 게시글 작성·댓글·추천 | - | O | O |
| 본인 게시글 수정 | - | O | O |
| 공지 읽기 | O | O | O |
| 공지 작성·수정·핀·삭제 | - | - | O |
| 문의 작성 | O | O | O |
| 문의 답변·삭제 | - | - | O |
| 오늘의 행운 티어 뽑기(체크) | O | O | O |
| 뽑기 결과 저장·기록 조회·포커·랜덤 뽑기 배팅 | - | O | O |
| 이벤트(퀴즈·티어표 공개 참가/투표·메모리 게임) | - (순위·출품작 구경만) | O | O |
| 출석체크 포인트·마이페이지(출석판·내 게시글·뽑기 집계) | - | O | O(회원과 같은 화면, 출석 포인트는 회원 계정만) |
| 가이드 모드 · AI 도우미 | O | O | O |
| 신고 처리·차단 | - | - | O |
| 관리 대시보드(이벤트 관리·행운 뽑기 관리·이벤트 디자인 포함) | - | - | O |

## AI 전용 서비스 (2026-10-18~)

```
브라우저 /ai ─▶ backend /api/ai (검사·IP당 요청 제한) ─▶ ai-service (FastAPI :8000, 내부 전용)
                                                     ├ LangGraph 흐름(analyze → retrieve → generate)
                                                     ├ RAG: ai-service/knowledge/*.md + tiers.json (BM25)
                                                     └ Claude(LangChain) — 키 없으면 문서 답
```

사이트 기능·규칙을 바꾸면 **`ai-service/knowledge/*.md` 도 같이 고친다**(AI 가 옛 규칙을 답하지 않게). 상세 [ai-service.md](./ai-service.md). **운영 서버에는 아직 배포 전**이다.

## 실행 환경별 기능

| 환경 | 정적 UI | API(로그인·게시판 등) |
|------|:-------:|:---------------------:|
| `backend` :5000 (권장) | O | O |
| 로컬 정적 포트(5173 등) + backend 5000 | O | O (API Base 자동 / Vite 프록시) |
| 정식 주소 `https://human-bug-tier.com` (Cloudflare Pages, 현재 운영) | O | O (`/api` 를 Oracle 서버로 프록시) |
| Oracle Cloud 서버 직접 `https://hbt-tier.duckdns.org` | O | O (운영자 확인용 — 회원에게 안내하지 않음) |
| Cloudflare Pages `human-bug-tier.pages.dev` | O | O (Pages Function 이 `/api` 를 Oracle 로 프록시) |
| Render.com (레거시, 베타 종료) | O | O |
| GitHub Pages | O (미리보기) | X (`GITHUB_STATIC`) |

## 다음 문서

- [common-infra.md](./common-infra.md) — 경로·API Base·인증·테마  
- [backend-api.md](./backend-api.md) — API 전체 맵  
- [ai-service.md](./ai-service.md) — AI 도우미 · AI 전용 서비스  
- [../summary/work-history.md](../summary/work-history.md) — 작업 이력  
