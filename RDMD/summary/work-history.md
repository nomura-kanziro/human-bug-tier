# 지금까지의 작업 정리

> `RDMD/frontend/` · `RDMD/backend/` (기능 폴더 + `*-record.md`) 기록을 바탕으로 정리한 **프로젝트 개발 이력 요약**입니다.  
> 상세 로그: [frontend/README](../frontend/README.md) · [backend/README](../backend/README.md)

**기준일**: 2026-09-02  
**문서 작성일**: 2026-08-20 (이후 Phase 7 반영 2026-09-01, Phase 8 반영 2026-09-02)

---

## 1. 한 줄 요약

| 단계 | 기간(대략) | 핵심 성과 |
|------|------------|-----------|
| 초기 구조 | information1~10 | Header/Footer 공통화, 티어 페이지, 경로 보정 |
| 백엔드 기반 | backend_0~10 | Express + MongoDB, TierList CRUD, 신고/좋아요 |
| 커뮤니티 | information10~20 | 공지, 커스텀 메이커·게시판, 댓글 |
| 인증·관리 | information23~26 / backend_23~26 | JWT 로그인, 비번 재설정, 관리자 신고 UI |
| 배포·보안 | information27~29 / backend_27~29 | GH Pages + Render, requireAdmin, 관리 UI 강화 |
| 모바일·티어 | 2026-07 ~ 08 | PWA, 게시글 수정, 6~9티어 이미지, 1·2티어 재배치 |
| 배포 분리 · React 기획 | 2026-09 | 프론트 `root-cloudflare`/`root-render`, Cloudflare 작업 중지, React 정식 버전은 기획만 |
| 메인·티어 다듬기 | 2026-09-02 | Render 홈 미리보기·행운 위젯, 풀 화살표, 세르지오/호자키 재배치 |

---

## 2. 단계별 상세

### Phase 1 — 초기 구조 및 공통 기능

**기록**: `information1` ~ `information10`, `backend_0` ~ `backend_10`

| 영역 | 한 일 |
|------|--------|
| 프론트 | `header.html` / `footer.html` 분리, `common.js`의 `getBasePath()` 도입, 하위 폴더 경로 자동 보정 |
| 프론트 | 이벤트 `onclick` → `addEventListener`, CSS (`common.css`, `Header_Footer.css`) 분리 |
| 프론트 | 티어 페이지(tier1~9) 레이아웃, 커스텀 메이커 초기 골격 |
| 백엔드 | Node + Express + Mongoose 환경, TierList 모델·기본 CRUD, DB 연결 |
| 백엔드 | TierList 삭제·신고·좋아요 확장 |

**결과물**: 정적 사이트 골조 + API 서버 뼈대

---

### Phase 2 — 공지·알림·커스텀 게시판

**기록**: `information10` ~ `information22` 부근, `backend_10` ~ `backend_14` 등

| 영역 | 한 일 |
|------|--------|
| 공지 | `notice/` 목록·상세, 전체 공지 / 새 소식 카테고리, 핀(고정) |
| 알림 | Notification 모델·라우트·서비스, 헤더 알림 UI 연동 |
| 커스텀 | 드래그&드롭 티어 제작, PNG/PDF 다운로드, 게시판 업로드 |
| 게시글 | `post_detail` — 티어 렌더링, 댓글/대댓글, 좋아요, 신고 |
| 백엔드 | Notice, TierPostComment, 신고 필드, 게시글 삭제 시 댓글 연쇄 삭제 |
| 관리 | `adminTierReportController` — 신고 게시글/댓글 조회·해제·삭제 |

**결과물**: 커뮤니티형 기능 핵심 완성

---

### Phase 3 — 인증 시스템

**기록**: `information23`, `information25`, `backend_25` (및 관련 auth 기록)

| 항목 | 내용 |
|------|------|
| 회원가입·로그인 | JWT 발급, `authToken` / `user` localStorage |
| 이메일 | Nodemailer (설정 시 인증 메일, 미설정 시 즉시 인증) |
| 비밀번호 재설정 | JWT URL 대신 **랜덤 토큰 + SHA-256 해시** (`validate-reset-token`, `reset-password`) |
| 유틸 | `auth_api.js`, `appUrl.js` (배포 URL 기반 절대 링크) |
| 차단 연동 | 로그인 시 차단 계정 거부 |

**결과물**: 일반 사용자 계정 체계 + 안전한 비번 재설정

---

### Phase 4 — 관리자 시스템

**기록**: `information24`, `information26`, `information29`, `backend_14`, `backend_26`, `backend_28`

| 항목 | 내용 |
|------|------|
| 로그인 | `/admin/admin-login.html` → `adminAuthToken`, `isAdmin` |
| API 유틸 | `admin_api.js` — `getAdminAuthHeaders()` |
| 대시보드 | 댓글 필터, 공지 CRUD·핀, 문의 답변, 유저/IP 차단, 티어 신고 |
| 보안 | `requireAdmin` 미들웨어로 관리 API 전면 보호 (backend_28) |
| UX | 공지 필터 색상 `#10b981` 통일, 삭제 시 인증 헤더 누락 수정 (information29) |

**결과물**: 운영 가능한 관리자 대시보드

---

### Phase 5 — 배포 및 환경 통합

**기록**: `information27`, `information28`, `backend_27`, `DEPLOY.md`

| 항목 | 내용 |
|------|------|
| 경로 | `getBasePath()` GH Pages 서브패스 대응, `fixRootLinksInElement` |
| API Base | `getApiBase()` / `get*ApiBase()` — 로컬 개발 포트 → `localhost:5000`, 동일 오리진 → 상대 경로 |
| 서버 | `server.js` 정적 서빙 + clean URL (`/notice` → `notice.html`) |
| 배포 | `render.yaml`, `backend/.env.example`, Render + MongoDB Atlas |
| 정적 미리보기 | GitHub Actions → GitHub Pages (API 없음) |

**결과물**: 로컬 통합 실행(`:5000`) + Render 풀스택 + GH Pages 프리뷰

### Phase 6 — 모바일 · 게시글 수정 · 공식 티어 이미지

**기간**: 2026-07 ~ 2026-08

| 영역 | 한 일 |
|------|--------|
| 모바일 | 헤더·로그인·게시판·문의 반응형, 세로 로그인 레이아웃 |
| PWA | 홈 화면 설치 (`manifest.webmanifest`, `sw.js`) |
| 커스텀 | 모바일 탭 배치, 본인 게시글 PUT 수정, `post_edit.html` |
| 계정 | 비번 찾기 메일 실패를 숨기지 않음 (503/502) |
| 관리 | 공지 수정 (PUT/PATCH `/api/notices/:id`) |
| 공식 티어 | 6~9티어 캐릭터 이미지, 우사미 6티어, 1·2티어 일부 재배치 |

**결과물**: 휴대폰에서도 제작·수정 가능, 공식 1~9티어 이미지 연결

### Phase 7 — 프론트 폴더 분리 · React 정식 버전 기획

**기간**: 2026-09-01

| 영역 | 한 일 |
|------|--------|
| 프론트 | 바닐라를 `root-cloudflare/`(로컬·Pages)와 `root-render/`(Render)로 분리. 루트에서 HTML 제거 |
| 서버 | `server.js` 기본 정적 루트 = `root-cloudflare`, `RENDER=true`면 `root-render` |
| 배포 | Cloudflare Pages 정적 미리보기 한 번 올림. **이후 Cloudflare 작업은 중지** |
| 기획 | 정식 버전을 React로 다시 만들 계획만 문서화. **구현 없음** |

**정본**: [`features/react-rewrite.md`](../features/react-rewrite.md)

**결과물**: 바닐라 `0.4.1` 유지 + React 이식 인수인계 문서

### Phase 8 — Render 메인·공식 티어 (실무만)

**기간**: 2026-09-02

| 영역 | 한 일 |
|------|--------|
| 메인 | 퀵 카드 섹션 스크롤, 메이커 미리보기, 행운 위젯(스테이지), 공식 티어표 제목, 가로 1200px |
| 메이커 | 캐릭터 풀이 보이면 ▲▼로 티어표 / 풀 끝 이동 (`initPoolMaxWindow`) |
| 공식 티어 | 세르지오 1정(라이덴 뒤), 호자키 킷페이 2갑(다비츠 뒤). `root-render/`만 |

**결과물**: Render 홈이 티어·제작·뽑기 진입을 한 화면에서 보여 줌

---

## 3. 번호별 최근 작업 매핑 (25~29)

| 번호 | 프론트 (information) | 백엔드 (backend_) | 핵심 |
|------|----------------------|-------------------|------|
| 25 | 비번 재설정 페이지, `auth_api.js` | 랜덤 토큰 + `appUrl` | 보안 강화 |
| 26 | `admin_api.js`, 커스텀 표시 수정 | tier-reports 라우트 조정 | 관리자 연동 |
| 27 | `getBasePath` + fixRootLinks, 상대경로 | render.yaml, 정적 서빙, DEPLOY.md | 배포 |
| 28 | (주로 백엔드) | `requireAdmin` 전면 적용 | 권한 중앙화 |
| 29 | 댓글/공지 관리 UI·헤더 일관화 | 이전 미들웨어 기반 | 관리자 UX |

---

## 4. 현재 완성된 기능 체크리스트

- [x] 공식 9단계 티어표 (`tier-class/`) + `tier-image/1`~`9 tier` 이미지
- [x] Header/Footer 공통 + 경로 자동 보정
- [x] 커스텀 티어 제작·다운로드 (PNG/PDF, 모바일 탭 배치)
- [x] 커스텀 게시판·상세·댓글·좋아요·신고·**본인 글 수정**
- [x] 공지 / 새 소식 + 핀
- [x] 유튜브 커뮤니티(`@humanbug_univ./posts`) → 새 소식 자동 연동
- [x] 문의하기 + 관리자 답변
- [x] 회원 가입·로그인·아이디/비번 찾기
- [x] 알림 (헤더 폴링/연동)
- [x] 관리자 로그인·통합 관리 페이지
- [x] 사용자/IP 차단
- [x] 신고 게시글·댓글 관리
- [x] Render 배포 설정 + 로컬 통합 서버
- [x] GitHub Pages 정적 미리보기
- [x] PWA 홈 화면 설치
- [x] 관리자 공지 수정 (PUT/PATCH)

---

## 5. 알려진 제약 / 향후 후보

| 항목 | 설명 |
|------|------|
| GH Pages | 정적만 제공 — 로그인·게시판 등 API 기능 미동작 |
| 이메일 | `EMAIL_*` 미설정 시 인증/재설정 메일 제한 |
| 핀 제한 | 프론트 `MAX_PINNED_NOTICES = 5` — 백엔드 검증 강화 여지 |
| 성능 | 캐릭터 다수 시 DOM 기반 티어 렌더 최적화 여지 |
| 로깅 | 운영용 구조화 로깅(winston 등) 미도입 |

---

## 6. 관련 문서

| 문서 | 위치 |
|------|------|
| 기능 설명 인덱스 | [../features/README.md](../features/README.md) |
| 개발 가이드라인 | [../guides/README.md](../guides/README.md) |
| 타임라인 | [timeline.md](./timeline.md) |
| 원본 커밋 기록 | [../README.md](../README.md) (information / backend_ 목록) |
| 루트 프로젝트 README | [../../README.md](../../README.md) |
