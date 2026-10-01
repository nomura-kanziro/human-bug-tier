# 지금까지의 작업 정리

> `RDMD/frontend/` · `RDMD/backend/` (기능 폴더 + `*-record.md`) 기록을 바탕으로 정리한 **프로젝트 개발 이력 요약**입니다.  
> 상세 로그: [frontend/README](../frontend/README.md) · [backend/README](../backend/README.md)

**기준일**: 2026-10-02  
**문서 작성일**: 2026-08-20 (이후 Phase 7 반영 2026-09-01, Phase 8 반영 2026-09-02, Phase 9 반영 2026-09-28, Phase 8b(09-03~09-24 사후 요약)·Phase 10 반영 2026-10-02 — 커밋 단위는 `commit_history/`)

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
| React 정식 버전 | 2026-09-03 ~ 09-24 | React 전환·바닐라 베타 종료, 테마·이벤트·행운 뽑기 3모드·디자인 개편, 1.0.0 |
| 운영 배포 | 2026-09-28 | Oracle Cloud VM 운영 서버(Let's Encrypt), Cloudflare Pages `/api` → Oracle 프록시. 정식 주소 `https://human-bug-tier.com` |
| 메일·관리·1.0.1 | 2026-09-29 ~ 10-01 | 인증 메일 템플릿, 티어표 수정, 행운 뽑기 관리·포인트 원장, 1.0.1 |

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

### Phase 8b — React 정식 버전 전환 · 기능 확장 (요약)

**기간**: 2026-09-03 ~ 09-24
**근거**: `commit_history/nomura.md` 의 해당 기간 커밋, 기록 `frontend/12-react/`, `frontend/13-event/`, `backend/09-event/`, `backend/08-luck-draw/03-poker-ladder-record.md`
(이 구간은 2026-10-02 문서 갱신 때 커밋 이력으로 사후 요약했다 — 세부는 각 기록 참고)

| 영역 | 한 일 |
|------|--------|
| 테마·로딩 | 라이트/다크 테마 엔진·헤더 토글(09-04), 자동 전환을 서울 시각 기준으로(09-20), 사이트 초기 로딩 화면(09-05) |
| React 전환 | `root-cloudflare/` 를 Vite + React 로 새로 구성(09-05) → 공개 페이지·티어표(한 페이지 navbar)·커스텀 메이커·행운 뽑기 → 인증·게시판·마이페이지·알림·문의·관리자 이식(09-18). backend 가 React `dist` 를 서빙 + SPA 폴백 |
| 운영 정책 | 2026-09-19 `root-render/`(바닐라, Render) 베타 종료 — 이후 프론트 작업은 React 에만 |
| 행운 뽑기 | 행운 티어 포커(09-19) · 랜덤 뽑기 5분 자동 공용 라운드(09-20), 포인트 0 하한, 배팅 상한 = 보유 포인트 |
| 인증·마이페이지 | 가입 메일 발송 순서 조정(09-04 Gmail 우선 → 09-10 표준 순서 복귀), 관리자 직접 인증, 무활동 1시간 자동 로그아웃, 프로필 사진·닉네임 변경(09-20) |
| 커스텀 메이커 | 티어표 꾸미기·원래대로(09-17), 등급 이동 화살표+번호, Ctrl/Shift 다중 선택·풀 검색, PNG 저장 시 빈 등급 건너뛰기(09-23) |
| 디자인 | 디자인 고도화 1차(Pretendard·디자인 토큰, 09-20) · 2차 전 페이지 순회(09-21), 다크 색 겹침 전수 점검(09-23) |
| 헤더 | 상단 메뉴 5개(공지·소식 / 티어표 / 커스텀 메이커 / 이벤트 / 행운 뽑기), 드롭다운 클릭식(09-21) |
| 이벤트 | 이벤트 페이지(매일 퀴즈 · 메모리 게임 · 티어표 공개, 09-21), 관리자 이벤트 관리, 티어표 공개 정식 오픈(09-22), 열리면 회원 전체 알림(09-23) |
| 관리자 | 빠른 이동 태그 바(09-22) |
| 티어표 | 5티어 하야미 타이키 추가(09-11), 캐릭터 정리·중복 제거(09-20~21) |
| 버전 | 0.4.3 → … → 0.5.0(09-17) → **1.0.0**(09-24, 정식 버전) |

**결과물**: React 정식 버전 1.0.0 — 바닐라 기능 전부 + 테마·이벤트·행운 뽑기 3모드

### Phase 9 — Oracle Cloud 운영 배포 · Cloudflare Pages 연결

**기간**: 2026-09-24 (준비) ~ 2026-09-28 (배포)
**기록**: `backend/07-deploy/03-oracle-cloud-deploy-record.md`, `frontend/09-deploy-path/05-cloudflare-pages-api-proxy-record.md`

| 영역 | 한 일 |
|------|--------|
| 서버 | Oracle VM(E2.1.Micro, Ubuntu 24.04)에 `backend/deploy/oracle/deploy.sh` 로 배포 — nginx → pm2 Node :5000, API + React `dist` 같이 서빙 |
| 도메인·HTTPS | DuckDNS `hbt-tier.duckdns.org`, Let's Encrypt(certbot) 자동 갱신, `APP_URL` https |
| 스크립트 수정 | `setup-vm.sh` iptables 허용 규칙을 REJECT 앞에 넣도록, 스왑 2 GB |
| Cloudflare Pages | Pages Function `/api/*` → Oracle 프록시, 워크플로가 빌드 후 `dist` 배포 |

**결과물**: `https://hbt-tier.duckdns.org` 에서 전체 기능 동작. Pages 는 GitHub 시크릿 등록 후 CI 배포되면 같은 백엔드를 씀

> 이후(09-28~29): 실제 Pages 배포는 GitHub Actions 가 아니라 **Pages 프로젝트의 GitHub 연동 빌드**(Root directory `root-cloudflare` 로 수정 후 정상)가 맡고, 회원용 정식 주소는 `https://human-bug-tier.com`, 서버 `APP_URL` 도 이 주소다(09-29).
### Phase 10 — 인증 메일 개편 · 티어표 수정 · 행운 뽑기 관리 · 1.0.1

**기간**: 2026-09-29 ~ 10-01 (문서 갱신 10-02)
**기록**: `backend/03-auth/10-mail-template-record.md`, `frontend/02-tier-class/09-tier1-2-update-record.md`, `frontend/04-notice/05-notice-title-dot-gap-record.md`, `backend/09-event/06-quiz-history-retention-record.md`, `backend/08-luck-draw/04-point-ledger-admin-api-record.md`, `frontend/07-admin/12-admin-luck-manager-record.md`

| 영역 | 한 일 |
|------|--------|
| 인증 메일 | 회원가입·아이디 찾기·비밀번호 재설정 메일을 예시문 공용 템플릿으로(GIF 로고·파란 버튼·문의 링크·발신전용 문구, 흰 배경) |
| 주소 | 서버 `APP_URL` → 정식 주소 `https://human-bug-tier.com` (duckdns 는 서버 직접 주소로만) |
| 티어표 | 1티어 우류 1장·츠루기 갑급·세르지오 정급 맨 앞·토마 이미지, 2티어 코사카(png)·호자키 이미지, 9티어 야시키 중복 제거 |
| 공지 | 전체 공지·새 소식 목록 제목 점 간격 |
| 이벤트 | 매일 퀴즈 기록 회원당 최근 15건 보관 |
| 행운 뽑기 | 포인트 증감 원장(`LuckPointLog`), 포커 판 정산 결과 저장, 관리자 "행운 뽑기 관리"(회원별 기록·포인트 내역, 조회 전용) |
| 공지 등록 | 정식 버전 오픈 안내(고정), 9/29~10/1 업데이트 안내(고정 안 함) |
| 버전 | **1.0.1**(10-01) |
| 문서 | 10-02 전체 문서 갱신 — 정식 주소, 행운 뽑기·관리자·API 맵·인증·티어표 문서를 코드와 대조해 현행화. 티어 데이터 정본을 `tiers.json` 으로 정정(extract 실행 금지) |

**결과물**: 운영 1.0.1 — 정식 주소로 나가는 새 인증 메일, 관리자 행운 뽑기 조회


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

- [x] 공식 9단계 티어표 (React `/tier/:n`, 데이터 `root-cloudflare/src/data/tiers.json`) + `tier-media/tier-image/1`~`9 tier` 이미지
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
- [x] Oracle Cloud 운영 서버 (서버 직접 `https://hbt-tier.duckdns.org`)
- [x] Cloudflare Pages `/api` 프록시 배포 — 정식 주소 `https://human-bug-tier.com` (Pages GitHub 연동 빌드)
- [x] React 정식 버전 1.0.1 + 라이트/다크 테마
- [x] 행운 뽑기 3모드(오늘의 행운 티어 · 행운 티어 포커 · 랜덤 뽑기) + 포인트 원장
- [x] 이벤트(매일 퀴즈 · 메모리 게임 기록 · 티어표 공개) + 관리자 이벤트 관리
- [x] 관리자 행운 뽑기 관리(조회 전용)
- [x] 인증 메일 공용 템플릿
- [x] PWA 홈 화면 설치
- [x] 관리자 공지 수정 (PUT/PATCH)

---

## 5. 알려진 제약 / 향후 후보

| 항목 | 설명 |
|------|------|
| GH Pages | 정적만 제공 — 로그인·게시판 등 API 기능 미동작 |
| Cloudflare GitHub Actions 워크플로 | 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 미등록이라 매번 실패 — 실제 배포는 Pages 연동 빌드가 하므로 서비스 영향 없음(정리 여부 미정) |
| 티어 데이터 | 정본은 `tiers.json` — `npm run extract:tiers`·`sync:render` 는 바닐라 HTML 로 덮어써 최근 수정이 사라지므로 실행 금지 |
| 행운 뽑기 포인트 | 배팅 상한이 보유 포인트 전부라 급증(10-01 지갑 4개 합 약 55억 9천만 P). 원장은 10-01 이후 증감부터 |
| 회원 탈퇴 | 행운 뽑기 지갑·기록·원장은 지우지 않음(관리 화면 [탈퇴] 표시) |
| 로컬 서버 | 운영과 같은 Atlas DB 를 쓰므로 오래 켜 두면 스케줄러(랜덤 뽑기·이벤트·유튜브 동기화)가 두 군데서 돈다 |
| Oracle nginx | 서버 HTTPS 설정은 certbot 이 덧붙인 것 — `deploy.sh setup` 재실행 시 덮어써짐 |
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
