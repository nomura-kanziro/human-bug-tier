# nomura — 커밋 기록 (전체)

| 항목 | 내용 |
|------|------|
| **작성자** | nomura |
| **역할** | 창시자 / 메인 작업자 |
| **git user** | nomura (일부 PR merge: nomura-kanziro) |
| **저장소** | human-bug-tier |
| **정렬** | **과거 → 현재** (위 = 오래됨, 아래 = 최신) |
| **커밋 수** | 107 |
| **기간** | 2026-03-20 ~ 2026-07-18|
| **명세** | [README.md](./README.md) 필드·템플릿 준수 |

> 폴더 안내: [README.md](./README.md)  ·  상세 기능 일지: [../frontend/](../frontend/README.md) · [../backend/](../backend/README.md)
>
> 목차 링크는 각 커밋 단축 해시 앵커(`#c70f64f`)로 이동합니다.
>
> **필수 규칙**: 커밋·푸시 **전** 이 파일에 작성 후 스테이징에 포함 ([README 필수 절차](./README.md)).
>
> **새 커밋 추가 위치**: 목차 표 **맨 아래 행** + 커밋 상세 **맨 아래 블록**.
>
> **message** = git 커밋 메시지 **원문**.  **요약** = 그 커밋이 한 일을 사람이 읽기 쉽게 풀어 쓴 설명(메시지 복붙 아님).
>
> **범위·요약·주요 파일** 은 메시지/변경 경로로 자동 생성했습니다. 더 정확한 요약이 필요하면 수동 수정하세요.

---

## 목차

| # | 날짜 | hash | 메시지 |
|--:|------|------|--------|
| 1 | 2026-03-20 | [`c70f64f`](#c70f64f) | 프런트 대략 모습 |
| 2 | 2026-05-06 | [`32a2dce`](#32a2dce) | feat : [와나카, 이쥬인, 푸트라, 디아블로, 스포야마 추락] [샤모 떡상] |
| 3 | 2026-05-06 | [`557521e`](#557521e) | feat : Contact us -> Contact_us로 폴더 변경 |
| 4 | 2026-05-09 | [`2e6b683`](#2e6b683) | feat, fix : 홈페이지 : html헤더 및 푸터 상속 방식으로 변경 css도 따로 Header_Footer.css를 만들어서 헤더 ... |
| 5 | 2026-05-10 | [`e683ac3`](#e683ac3) | feat, fix : tier-class에서 2티어 부터 다 가운데 정렬 위치를 바꿈 Contact_us에다 통합 헤더, 푸터 기능 달음.... |
| 6 | 2026-05-10 | [`402b1cd`](#402b1cd) | feat, fix : 어드민 전용 페이지 만듦. 그리고 현재 common.js에서 admin/comments 폴더로 상속을 하려는데 차질이 생김 |
| 7 | 2026-05-10 | [`97dd4b0`](#97dd4b0) | feat, fix : 헤더, 푸터 링크 기능 및 로고 이미지 구현 문제 해결 |
| 8 | 2026-05-10 | [`4f2e22d`](#4f2e22d) | feat, fix : 어드민 로그인 구현 netlify function -> node.js로 변경 로그인 관련하여 헤더에 햄버거 바로 왼쪽... |
| 9 | 2026-05-10 | [`da9eb6a`](#da9eb6a) | fix : 모달 관련하여 관리자 페이지 링크 클릭 시 404가 뜨는 문제가 생겨서 고침 |
| 10 | 2026-05-13 | [`dda14b0`](#dda14b0) |  feat: 관리자 댓글 상세 페이지 + 필터/검색/토글 기능 완성 |
| 11 | 2026-05-13 | [`f83a2eb`](#f83a2eb) | fix : 이름 변경 home.html -> index.html |
| 12 | 2026-05-13 | [`ab09e09`](#ab09e09) | Merge pull request #1 from nomura-kanziro/main |
| 13 | 2026-05-13 | [`2e11628`](#2e11628) | feat : 관리자 댓글 관리 페이지에 파란 네비게이션 + 필터 + 검색 + 정렬 + 페이지네이션 추가 |
| 14 | 2026-05-13 | [`6c001a2`](#6c001a2) | Merge branch 'master' of https://github.com/nomura-kanziro/human-bug-tier |
| 15 | 2026-05-13 | [`4497f7e`](#4497f7e) | config : information3.md 추가 |
| 16 | 2026-05-15 | [`a746539`](#a746539) | feat(custom-maker): 커스텀 티어 메이커 페이지 완성 |
| 17 | 2026-05-15 | [`dd60eed`](#dd60eed) | config : 커스텀 메이커 페이지 보고서 정리한 md 파일 제작 |
| 18 | 2026-05-23 | [`87ca4aa`](#87ca4aa) | 공통 레이아웃(header/footer) 동적 로드 및 경로 자동 보정 기능 추가 - header.html, footer.html 분리 및... |
| 19 | 2026-05-23 | [`7b9f102`](#7b9f102) | feat : index..html, common.css, common.js 에서 상세 모달 페이지 기능 구현 |
| 20 | 2026-05-23 | [`760cc00`](#760cc00) | feat : 공지사항 섹션 (대칭 맞춤 버전) |
| 21 | 2026-05-24 | [`36c49d1`](#36c49d1) | feat, fix : 댓글 관리/상세(comment-management.js, comment-detail.js) - 상세 페이지 답변 필터... |
| 22 | 2026-05-30 | [`66c3100`](#66c3100) | config : backend 관련 md 파일 업로드 |
| 23 | 2026-05-30 | [`c46503a`](#c46503a) | feat : node_modules/ 추가 |
| 24 | 2026-05-30 | [`345a4d6`](#345a4d6) | feat : 기본 서버 제작 후mongoDB 연결 성공 |
| 25 | 2026-05-30 | [`01f3a3d`](#01f3a3d) | feat: 경로 보정 및 커스텀 메이커 게시판 페이지 추가 |
| 26 | 2026-05-30 | [`78d086a`](#78d086a) | style: 커스텀 메이커 게시판 UI 스타일링 개선 |
| 27 | 2026-05-31 | [`68285e4`](#68285e4) | feat: 게시판 헤더에 눈 아이콘 추가 및 스타일 개선 |
| 28 | 2026-05-31 | [`e637e4d`](#e637e4d) | feat(frontend): 커스텀 메이커 게시판 프론트엔드 구조 완성 |
| 29 | 2026-06-01 | [`721ea20`](#721ea20) | docs: 주요 프론트엔드/백엔드 작업 내역 문서화 (RDMD 폴더) |
| 30 | 2026-06-01 | [`d24d833`](#d24d833) | feat: 커스텀 메이커 게시판 상세(포스트) 페이지 프론트엔드 구조 완성 |
| 31 | 2026-06-01 | [`9d003eb`](#9d003eb) | docs: 커스텀 메이커 게시판 상세(포스트) 페이지 작업 내역 문서화 |
| 32 | 2026-06-02 | [`819b2a5`](#819b2a5) | feat(post): 커스텀 메이커 게시판 상세 페이지 프론트엔드 구현 |
| 33 | 2026-06-02 | [`120e986`](#120e986) | style(contact): Contact_us 입력창 스타일 정리 및 간격 조정 |
| 34 | 2026-06-03 | [`c8971d0`](#c8971d0) | docx : information9.md << 업데이트 |
| 35 | 2026-06-05 | [`7a0f861`](#7a0f861) | style(post): post-detail 제목과 액션 버튼 중앙 정렬 |
| 36 | 2026-06-05 | [`7c79dce`](#7c79dce) | feat : index.html에 메인 페이지 퀵 네비게이션 블록 추가 커스텀 메이커, 티어표, 행운 뽑기 섹션을 카드형 UI로 구성 공지... |
| 37 | 2026-06-06 | [`835762b`](#835762b) | feat : notice 폴더 구조 완성: notice.html, all_notices.html, news.html 페이지 추가 공지사항 ... |
| 38 | 2026-06-06 | [`767e829`](#767e829) | docx : information10.md 추가후 공지사항 파일 제작 완료 |
| 39 | 2026-06-07 | [`de28858`](#de28858) | feat(contact): Contact_us 로그인 이동 처리 함수 추가 |
| 40 | 2026-06-07 | [`68b3b84`](#68b3b84) | feat(auth): 아이디/비밀번호 찾기 페이지 추가 및 로그인 네비게이션 개선 |
| 41 | 2026-06-07 | [`dadb2d9`](#dadb2d9) | feat(notice): 공지 목록 UI 개선 및 전체/새소식 목록 페이지 추가 |
| 42 | 2026-06-07 | [`e2705ac`](#e2705ac) | docx : commit: dadb2d9 << 관련 내용 추가 작성 |
| 43 | 2026-06-07 | [`c4eee33`](#c4eee33) | docx : login 관련 내용의 대해서 내용 작성 |
| 44 | 2026-06-08 | [`675a158`](#675a158) | feat(api): 티어리스트 CRUD 시작 — 모델, 컨트롤러, 라우트 및 서버 연결 추가 |
| 45 | 2026-06-08 | [`3a1f9c9`](#3a1f9c9) | feat(models): 티어리스트 모델 추가 (TierList) |
| 46 | 2026-06-08 | [`02cf378`](#02cf378) | feat(auth): 사용자 모델 추가 (User) |
| 47 | 2026-06-09 | [`8ca982b`](#8ca982b) | feat(auth): 로그인 기능 백엔드 연동 및 일반 사용자 프로필 UI 개선 |
| 48 | 2026-06-10 | [`5565dae`](#5565dae) | feat(Contact_us): 문의 페이지 프론트엔드 백엔드 1차 연동 |
| 49 | 2026-06-10 | [`7a6a8b7`](#7a6a8b7) | feat(api): 문의(Inquiry) CRUD 및 답변 기능 추가 — 모델, 컨트롤러, 라우트 및 서버 연결 |
| 50 | 2026-06-11 | [`1539d6e`](#1539d6e) | feat(admin): MongoDB 기반 관리자 로그인 API 및 프론트 연동 |
| 51 | 2026-06-11 | [`482313c`](#482313c) | feat(inquiry): 문의사항 수정/삭제/신고 기능 백엔드 API 연동 |
| 52 | 2026-06-11 | [`04167c5`](#04167c5) | chore(gitignore): mcps 디렉토리 제외 추가 |
| 53 | 2026-06-11 | [`f0ca6ad`](#f0ca6ad) | chore(deps): backend 의존성 lockfile 업데이트 |
| 54 | 2026-06-12 | [`4d415a8`](#4d415a8) | feat(Contact_us): 문의/답변 백엔드 API 연동 |
| 55 | 2026-06-12 | [`9d9066e`](#9d9066e) | feat(inquiry): 답변 등록/신고/삭제 API 추가 |
| 56 | 2026-06-15 | [`297a0e5`](#297a0e5) | feat: 어드민 댓글·유저 관리 페이지 백엔드 연동 및 차단 기능 구현 |
| 57 | 2026-06-15 | [`fbdcd19`](#fbdcd19) | feat: 공지사항 시스템 프론트엔드·백엔드 연동 및 상세 페이지 구현 |
| 58 | 2026-06-15 | [`649ce6a`](#649ce6a) | docs : frontend, backend 파일 관련 정리 md 작성 |
| 59 | 2026-06-16 | [`3e82458`](#3e82458) | feat(custom-maker): 게시판 댓글·상세 페이지·본인 글 삭제 |
| 60 | 2026-06-16 | [`8fbbe60`](#8fbbe60) | feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고 |
| 61 | 2026-06-16 | [`91cb6ab`](#91cb6ab) | feat : 3티어표에 추가할 인물들 |
| 62 | 2026-06-16 | [`3c80203`](#3c80203) | docs : frontend, backend 관련 문서 기록 정리 |
| 63 | 2026-06-16 | [`bfee66d`](#bfee66d) | fix(auth): 비밀번호 찾기 실패 수정 — getJwtSecret export 추가 |
| 64 | 2026-06-16 | [`d49ca7d`](#d49ca7d) | feat(custom-maker): 로그인 유저 내 게시글 보기 연동 |
| 65 | 2026-06-16 | [`d38f58e`](#d38f58e) | fix : quick-card << 공유 티어 -> 이벤트 << 변경 |
| 66 | 2026-06-16 | [`f102dcd`](#f102dcd) | feat : 우룡, 발로 << 이미지 추가 |
| 67 | 2026-06-16 | [`2a522eb`](#2a522eb) | 어드민 커스텀 게시판 관리로 변경 |
| 68 | 2026-06-17 | [`77e1002`](#77e1002) | feat(backend): 알림 API·모델·설정 기반 구축 |
| 69 | 2026-06-17 | [`849dc03`](#849dc03) | feat(backend): 문의·티어·공지 알림 트리거 연동 |
| 70 | 2026-06-17 | [`cd5d8bc`](#cd5d8bc) | feat(frontend): 헤더 로그인 버튼 및 알림 벨 UI |
| 71 | 2026-06-17 | [`d45acea`](#d45acea) | feat(frontend): 어드민 숨김 로그인 진입 추가 |
| 72 | 2026-06-17 | [`c3be96c`](#c3be96c) | feat(frontend): 알림 딥링크 커스텀 메이커 댓글 스크롤 |
| 73 | 2026-06-17 | [`493e2bc`](#493e2bc) | feat(frontend): 알림 딥링크 문의사항 답변 스크롤 |
| 74 | 2026-06-18 | [`150e556`](#150e556) | fix : logo 배경제거 |
| 75 | 2026-06-18 | [`8ecfddc`](#8ecfddc) | fix(auth): 비밀번호 재설정 링크 만료 오류 수정 |
| 76 | 2026-06-18 | [`a3ee179`](#a3ee179) | fix(admin): 어드민 커스텀 메이커 게시글/댓글 미표시 문제 수정 |
| 77 | 2026-06-19 | [`01bddd4`](#01bddd4) | fix(deploy): GitHub Pages 경로 및 API 설정 지원 |
| 78 | 2026-06-19 | [`3ca3e66`](#3ca3e66) | Revert "fix(deploy): GitHub Pages 경로 및 API 설정 지원" |
| 79 | 2026-06-20 | [`6afed99`](#6afed99) | chore(deploy): add render.yaml for Render.com deployment |
| 80 | 2026-06-20 | [`7c328f6`](#7c328f6) | fix(deploy): unify get*ApiBase() logic for local + Render.com (relative URLs ... |
| 81 | 2026-06-20 | [`4f78c6e`](#4f78c6e) | chore(deploy): prepare for Render.com deployment |
| 82 | 2026-06-20 | [`437dfbf`](#437dfbf) | feat(middleware): introduce proper auth middleware and secure admin routes |
| 83 | 2026-06-20 | [`90b90d8`](#90b90d8) | feat(admin): enhance admin comment and tier board management |
| 84 | 2026-06-20 | [`77dadaa`](#77dadaa) | fix(deploy): GitHub Actions / GitHub Pages header/footer 404 + nav links 해결 (... |
| 85 | 2026-06-20 | [`42a15d5`](#42a15d5) | docs(RDMD): 6월 18일 이후 작업 로그 정리 (프론트엔드 information25-29, 백엔드 backend_25-29) |
| 86 | 2026-06-20 | [`2484719`](#2484719) | config : node.js 기반으로 ignore 기능 추가 |
| 87 | 2026-06-20 | [`56d8bd6`](#56d8bd6) | docs: add comprehensive README files |
| 88 | 2026-06-20 | [`180f8f5`](#180f8f5) | fix(deploy): GitHub Pages static preview에서 백엔드 API 호출 오류 방지 |
| 89 | 2026-06-20 | [`b7d51ae`](#b7d51ae) | fix(deploy): GitHub Pages 배포에서 header/footer 로드 안 되는 문제 해결 |
| 90 | 2026-06-20 | [`fbc047c`](#fbc047c) | fix: admin login redirect and inquiry answer auth for admin users |
| 91 | 2026-06-20 | [`341a2d1`](#341a2d1) | feat : 야기라 카즈미츠 추가 |
| 92 | 2026-06-20 | [`9dc97ed`](#9dc97ed) | Add tier 4-5 character images |
| 93 | 2026-06-20 | [`c673e86`](#c673e86) | Update tier 4-5 HTML with character images |
| 94 | 2026-06-25 | [`9112e56`](#9112e56) | fix : goHome() << 메인 파일 이름이 변경 됨으로써 home.html -> index.html 변경하여 홈 페이지 접근 문제 해결 |
| 95 | 2026-06-25 | [`c80f16e`](#c80f16e) | Merge branch 'master' of https://github.com/nomura-kanziro/human-bug-tier |
| 96 | 2026-07-18 | [`fe9ade9`](#fe9ade9) | docs(RDMD): restructure frontend work logs into feature folders |
| 97 | 2026-07-18 | [`026a38a`](#026a38a) | docs(RDMD): restructure backend work logs into feature folders |
| 98 | 2026-07-18 | [`0f3c4ac`](#0f3c4ac) | docs(RDMD): add features, guides, and summary documentation |
| 99 | 2026-07-18 | [`6e05d23`](#6e05d23) | docs(RDMD): add commit_history author log and mandatory pre-commit rule |
| 100 | 2026-07-18 | [`c6f862e`](#c6f862e) | docs(agents): add .agents common rules and canonical feature skills |
| 101 | 2026-07-18 | [`a1c43f8`](#a1c43f8) | docs(team): add human worker rules for vibe and hardcoding |
| 102 | 2026-07-18 | [`717afd1`](#717afd1) | docs(claude): add CLAUDE.md and .claude feature skills |
| 103 | 2026-07-18 | [`14b3c29`](#14b3c29) | docs(groks): add Grok Admin AI skill pack |
| 104 | 2026-07-18 | [`fc6c611`](#fc6c611) | docs(codex): add Codex skills, root AGENTS.md, and README map |
| 105 | 2026-07-18 | [`0ec285b`](#0ec285b) | fix(ui): mobile responsive layout for header auth board inquiry |
| 106 | 2026-07-18 | [`25c3e8c`](#25c3e8c) | feat(pwa): add web manifest, service worker, and install icons |
| 107 | 2026-07-18 | [`pending-107`](#pending-107) | docs(RDMD): add mobile and PWA usage guide |

---

## 커밋 상세 (과거 → 현재)

<a id="c70f64f"></a>

### 1. 2026-03-20 — `c70f64f`

- **hash (short)**: `c70f64f`
- **hash (full)**: `c70f64ff3c07a6ae6681af852898dabf01ee9769`
- **author**: nomura
- **message**: 프런트 대략 모습
- **git**: `git show c70f64f`
- **범위**: misc / admin / auth / inquiry
- **요약**: 문의·관리자·공통 UI/경로 영역을 중심으로 변경을 반영했다. 손댄 포인트: 관리자 화면/API, 환경·의존성.
- **주요 파일**: `.gitignore`, `Contact us/common-v2.css`, `Contact us/common-v2.js`, `Contact us/index.html`, `admin/admin-login.css`, `admin/admin-login.html`, `admin/admin-login.js`, `common.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="32a2dce"></a>

### 2. 2026-05-06 — `32a2dce`

- **hash (short)**: `32a2dce`
- **hash (full)**: `32a2dce2cb0f004451b1e2c8e5f58cd7e4124b60`
- **author**: nomura
- **message**: feat : [와나카, 이쥬인, 푸트라, 디아블로, 스포야마 추락] [샤모 떡상]
- **git**: `git show 32a2dce`
- **범위**: frontend / admin / auth / tier-class
- **요약**: 관리자·공식 티어 페이지·티어 이미지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 캐릭터 이미지, 공식 티어 HTML.
- **주요 파일**: `admin/admin-login.html`, `tier-class/tier1.html`, `tier-class/tier2.html`, `tier-class/tier3.html`, `tier-image/1 tier/shamo.jpg`, `tier-image/2 tier/izyuin shigeo.jpg`, `tier-image/2 tier/pabian junia.png`, `tier-image/3 tier/wanaka soichiro.png`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="557521e"></a>

### 3. 2026-05-06 — `557521e`

- **hash (short)**: `557521e`
- **hash (full)**: `557521ee29d9067967bdc5680e5075cc2ae9c506`
- **author**: nomura
- **message**: feat : Contact us -> Contact_us로 폴더 변경
- **git**: `git show 557521e`
- **범위**: inquiry / frontend / style
- **요약**: 문의 영역을 중심으로 기능을 추가·개선했다. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/common-v2.css`, `Contact_us/common-v2.js`, `Contact_us/index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="2e6b683"></a>

### 4. 2026-05-09 — `2e6b683`

- **hash (short)**: `2e6b683`
- **hash (full)**: `2e6b683e7ab0ec74f08aab2039a0c0632556cf1b`
- **author**: nomura
- **message**: feat, fix : 홈페이지 : html헤더 및 푸터 상속 방식으로 변경 css도 따로 Header_Footer.css를 만들어서 헤더 및 푸터 전용 파일을 만들어냄. tier-class : 동일하게 만들고 js파일은 삭제해서 통일시킴 script.js -> common.js
- **git**: `git show 2e6b683`
- **범위**: tier-class / common / style / frontend
- **요약**: 공통 UI/경로·공식 티어 페이지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더, 공식 티어 HTML.
- **주요 파일**: `Header_Footer.css`, `common.css`, `common.js`, `footer.html`, `header.html`, `home.html`, `script.js`, `tier-class/tier1.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="e683ac3"></a>

### 5. 2026-05-10 — `e683ac3`

- **hash (short)**: `e683ac3`
- **hash (full)**: `e683ac30923f39f882703480adf4d298dee7df46`
- **author**: nomura
- **message**: feat, fix : tier-class에서 2티어 부터 다 가운데 정렬 위치를 바꿈 Contact_us에다 통합 헤더, 푸터 기능 달음. 추가적으로 대충 인원 티어변경 했는데 어차피 피드백 받고 또 변경해야함.
- **git**: `git show e683ac3`
- **범위**: inquiry / tier-class / frontend / common
- **요약**: 문의·공통 UI/경로·공식 티어 페이지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더, 공식 티어 HTML. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/common-v2.css`, `Contact_us/common-v2.js`, `Contact_us/index.html`, `common.js`, `header.html`, `tier-class/tier1.html`, `tier-class/tier2.css`, `tier-class/tier2.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="402b1cd"></a>

### 6. 2026-05-10 — `402b1cd`

- **hash (short)**: `402b1cd`
- **hash (full)**: `402b1cdab5e7247d844209c2f6e06a62d10dcbe7`
- **author**: nomura
- **message**: feat, fix : 어드민 전용 페이지 만듦. 그리고 현재 common.js에서 admin/comments 폴더로 상속을 하려는데 차질이 생김
- **git**: `git show 402b1cd`
- **범위**: admin / common / frontend / style
- **요약**: 관리자·공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 공통 경로/헤더.
- **주요 파일**: `admin/comments/comment-management.css`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `common.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="97dd4b0"></a>

### 7. 2026-05-10 — `97dd4b0`

- **hash (short)**: `97dd4b0`
- **hash (full)**: `97dd4b0800b6ba3b1b3c8cc4aafa64fc1813ab17`
- **author**: nomura
- **message**: feat, fix : 헤더, 푸터 링크 기능 및 로고 이미지 구현 문제 해결
- **git**: `git show 97dd4b0`
- **범위**: frontend / admin / common
- **요약**: 관리자·공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 공통 경로/헤더.
- **주요 파일**: `admin/comments/comment-management.html`, `common.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="4f2e22d"></a>

### 8. 2026-05-10 — `4f2e22d`

- **hash (short)**: `4f2e22d`
- **hash (full)**: `4f2e22d7ed17cf4fba8947bc05741be16e2c7622`
- **author**: nomura
- **message**: feat, fix : 어드민 로그인 구현 netlify function -> node.js로 변경 로그인 관련하여 헤더에 햄버거 바로 왼쪽에 아이콘 구현하여 클릭하면 모달이 뜨고 정보가 간단히 나옴 (아마 모달에서 유저 프로필 정보 상자로 변경 예정)
- **git**: `git show 4f2e22d`
- **범위**: admin / auth / frontend / common
- **요약**: 관리자·공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 공통 경로/헤더.
- **주요 파일**: `admin/admin-login.html`, `admin/admin-login.js`, `common.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="da9eb6a"></a>

### 9. 2026-05-10 — `da9eb6a`

- **hash (short)**: `da9eb6a`
- **hash (full)**: `da9eb6a596e8fa0d91431897198da999e40a9f21`
- **author**: nomura
- **message**: fix : 모달 관련하여 관리자 페이지 링크 클릭 시 404가 뜨는 문제가 생겨서 고침
- **git**: `git show da9eb6a`
- **범위**: admin / frontend / common
- **요약**: 관리자·공통 UI/경로 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API, 공통 경로/헤더.
- **주요 파일**: `admin/comments/comment-management.html`, `common.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="dda14b0"></a>

### 10. 2026-05-13 — `dda14b0`

- **hash (short)**: `dda14b0`
- **hash (full)**: `dda14b09429b4688517294fba9a9ce46e6b9fe1b`
- **author**: nomura
- **message**:  feat: 관리자 댓글 상세 페이지 + 필터/검색/토글 기능 완성
- **git**: `git show dda14b0`
- **범위**: admin / custom-maker / frontend / docs
- **요약**: 문의·RDMD 문서·관리자 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API.
- **주요 파일**: `Contact_us/common-v2.css`, `Contact_us/common-v2.js`, `Contact_us/index.html`, `RDMD/information1.md`, `RDMD/information2.md`, `admin/comments/comment-detail.html`, `admin/comments/comment-detail.js`, `admin/comments/comment-management.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="f83a2eb"></a>

### 11. 2026-05-13 — `f83a2eb`

- **hash (short)**: `f83a2eb`
- **hash (full)**: `f83a2eb506d68f1da848d6c344df5294b2555e9c`
- **author**: nomura
- **message**: fix : 이름 변경 home.html -> index.html
- **git**: `git show f83a2eb`
- **범위**: frontend / inquiry / common
- **요약**: 문의·공통 UI/경로·메인 페이지 영역을 중심으로 문제를 수정했다. 손댄 포인트: 공통 경로/헤더. 메인 진입 HTML 이름 정리 포함.
- **주요 파일**: `Contact_us/contact_us.html`, `common.js`, `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="ab09e09"></a>

### 12. 2026-05-13 — `ab09e09`

- **hash (short)**: `ab09e09`
- **hash (full)**: `ab09e09e15713aeeaaa4476fffc356441f7907ac`
- **author**: nomura-kanziro
- **message**: Merge pull request #1 from nomura-kanziro/main
- **git**: `git show ab09e09`
- **범위**: meta
- **요약**: 원격/다른 브랜치 변경을 현재 브랜치에 합쳤다. 기능 변경 요약은 개별 커밋을 본다.
- **주요 파일**: _(파일 목록 없음 / merge 등)_
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="2e11628"></a>

### 13. 2026-05-13 — `2e11628`

- **hash (short)**: `2e11628`
- **hash (full)**: `2e116286e010e554bd7c46bbaf5360b0c091b646`
- **author**: nomura
- **message**: feat : 관리자 댓글 관리 페이지에 파란 네비게이션 + 필터 + 검색 + 정렬 + 페이지네이션 추가
- **git**: `git show 2e11628`
- **범위**: admin / custom-maker / frontend
- **요약**: 관리자 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API.
- **주요 파일**: `admin/comments/comment-management.html`, `admin/comments/comment-management.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="6c001a2"></a>

### 14. 2026-05-13 — `6c001a2`

- **hash (short)**: `6c001a2`
- **hash (full)**: `6c001a26b5ad16c9ccab81b0f6da32e453ca6bfd`
- **author**: nomura
- **message**: Merge branch 'master' of https://github.com/nomura-kanziro/human-bug-tier
- **git**: `git show 6c001a2`
- **범위**: tier-class / meta
- **요약**: 원격/다른 브랜치 변경을 현재 브랜치에 합쳤다. 기능 변경 요약은 개별 커밋을 본다.
- **주요 파일**: _(파일 목록 없음 / merge 등)_
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="4497f7e"></a>

### 15. 2026-05-13 — `4497f7e`

- **hash (short)**: `4497f7e`
- **hash (full)**: `4497f7e1fcbbfb2d2eab6b1fdd29f17855c0e4ef`
- **author**: nomura
- **message**: config : information3.md 추가
- **git**: `git show 4497f7e`
- **범위**: docs / chore
- **요약**: RDMD 문서 영역을 중심으로 설정·도구를 손봤다.
- **주요 파일**: `RDMD/information3.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="a746539"></a>

### 16. 2026-05-15 — `a746539`

- **hash (short)**: `a746539`
- **hash (full)**: `a746539cc1e37bc08a85b40d5509d750793e9afa`
- **author**: nomura
- **message**: feat(custom-maker): 커스텀 티어 메이커 페이지 완성
- **git**: `git show a746539`
- **범위**: custom-maker / tier-class / frontend / common
- **요약**: 공통 UI/경로·커스텀 메이커/게시판·티어 이미지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판, 공통 경로/헤더, 캐릭터 이미지.
- **주요 파일**: `.gitignore`, `common.js`, `custom-maker/custom-maker.css`, `custom-maker/custom-maker.html`, `custom-maker/custom-maker.js`, `tier-image/1 tier/orion.jpg`, `tier-image/1 tier/seruzio.jpg`, `tier-image/1 tier/shiden.jpg`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="dd60eed"></a>

### 17. 2026-05-15 — `dd60eed`

- **hash (short)**: `dd60eed`
- **hash (full)**: `dd60eeda2f70b6a7847366611a22d36a5a00a305`
- **author**: nomura
- **message**: config : 커스텀 메이커 페이지 보고서 정리한 md 파일 제작
- **git**: `git show dd60eed`
- **범위**: custom-maker / chore / frontend / docs
- **요약**: RDMD 문서 영역을 중심으로 설정·도구를 손봤다.
- **주요 파일**: `RDMD/information3.md`, `RDMD/information4.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="87ca4aa"></a>

### 18. 2026-05-23 — `87ca4aa`

- **hash (short)**: `87ca4aa`
- **hash (full)**: `87ca4aa664a325aad02bc369b884a3f7df74d191`
- **author**: nomura
- **message**: 공통 레이아웃(header/footer) 동적 로드 및 경로 자동 보정 기능 추가 - header.html, footer.html 분리 및 fetch로 각 페이지에 자동 삽입 - getBasePath로 하위 폴더 경로 문제 해결 - 공지사항 모달, 관리자 프로필, 모바일 사이드 메뉴 드롭다운 등 UI/UX 기능 추가 - .logo-text 등 스타일 개선 - 변경 내역 및 사유는 RDMD/information5.md에 상세 기록
- **git**: `git show 87ca4aa`
- **범위**: docs / admin / notice / common
- **요약**: 공통 UI/경로·RDMD 문서·메인 페이지 영역을 중심으로 내용을 추가했다. 손댄 포인트: 공통 경로/헤더. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `Header_Footer.css`, `RDMD/information5.md`, `common.css`, `common.js`, `footer.html`, `header.html`, `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="7b9f102"></a>

### 19. 2026-05-23 — `7b9f102`

- **hash (short)**: `7b9f102`
- **hash (full)**: `7b9f10210afcd8a0dcd0e928b54b3eff08e81d1a`
- **author**: nomura
- **message**: feat : index..html, common.css, common.js 에서 상세 모달 페이지 기능 구현
- **git**: `git show 7b9f102`
- **범위**: common / style / frontend
- **요약**: 공통 UI/경로·메인 페이지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더.
- **주요 파일**: `common.css`, `common.js`, `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="760cc00"></a>

### 20. 2026-05-23 — `760cc00`

- **hash (short)**: `760cc00`
- **hash (full)**: `760cc00e2e0982327751db5f5bbc02f55f32e867`
- **author**: nomura
- **message**: feat : 공지사항 섹션 (대칭 맞춤 버전)
- **git**: `git show 760cc00`
- **범위**: notice / frontend / style
- **요약**: 공통 UI/경로·메인 페이지 영역을 중심으로 기능을 추가·개선했다. 대표 변경 파일: common.css, index.html.
- **주요 파일**: `common.css`, `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="36c49d1"></a>

### 21. 2026-05-24 — `36c49d1`

- **hash (short)**: `36c49d1`
- **hash (full)**: `36c49d1efa3cfe6d25f263931203aebd50d6dee4`
- **author**: nomura
- **message**: feat, fix : 댓글 관리/상세(comment-management.js, comment-detail.js) - 상세 페이지 답변 필터(신고/사유/검색) 및 토글 기능 개선 - 신고사유 팝업(⚠️) UI 통일 및 위치/닫힘 동작 보완 - 전체/신고 답변 필터 버튼, 검색, 셀렉트 등 UI/UX 강화 - 목록/상세 삭제, 차단, 페이지네이션 등 관리 기능 유지 - 코드 정리 및 중복 함수 제거 - 상세 페이지 404 오류 해결
- **git**: `git show 36c49d1`
- **범위**: custom-maker / frontend / admin
- **요약**: 관리자 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API.
- **주요 파일**: `admin/comments/comment-detail.js`, `admin/comments/comment-management.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="66c3100"></a>

### 22. 2026-05-30 — `66c3100`

- **hash (short)**: `66c3100`
- **hash (full)**: `66c3100820b9af032c04f356c20f3db1def3d742`
- **author**: nomura
- **message**: config : backend 관련 md 파일 업로드
- **git**: `git show 66c3100`
- **범위**: backend / chore / docs
- **요약**: RDMD 문서 영역을 중심으로 설정·도구를 손봤다.
- **주요 파일**: `RDMD/backend/backend_0.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c46503a"></a>

### 23. 2026-05-30 — `c46503a`

- **hash (short)**: `c46503a`
- **hash (full)**: `c46503ac0be9023b22a55b204c6a2e89637b2fad`
- **author**: nomura
- **message**: feat : node_modules/ 추가
- **git**: `git show c46503a`
- **범위**: frontend / chore
- **요약**: 환경·의존성 관련으로 기능을 추가·개선했다. 대표 변경 파일: .gitignore.
- **주요 파일**: `.gitignore`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="345a4d6"></a>

### 24. 2026-05-30 — `345a4d6`

- **hash (short)**: `345a4d6`
- **hash (full)**: `345a4d6a5f27fbdc90f65da3882da2babc8d72cc`
- **author**: nomura
- **message**: feat : 기본 서버 제작 후mongoDB 연결 성공
- **git**: `git show 345a4d6`
- **범위**: backend / frontend / chore
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: Express API/모델, 환경·의존성.
- **주요 파일**: `backend/config/db.js`, `backend/package-lock.json`, `backend/package.json`, `backend/server.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="01f3a3d"></a>

### 25. 2026-05-30 — `01f3a3d`

- **hash (short)**: `01f3a3d`
- **hash (full)**: `01f3a3d7ef7e46a56f18210267acf79c70fec727`
- **author**: nomura
- **message**: feat: 경로 보정 및 커스텀 메이커 게시판 페이지 추가
- **git**: `git show 01f3a3d`
- **범위**: custom-maker / common / frontend
- **요약**: 공통 UI/경로·메인 페이지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더.
- **주요 파일**: `common.js`, `header.html`, `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="78d086a"></a>

### 26. 2026-05-30 — `78d086a`

- **hash (short)**: `78d086a`
- **hash (full)**: `78d086ac31d9975a05eb1e29761168723654496f`
- **author**: nomura
- **message**: style: 커스텀 메이커 게시판 UI 스타일링 개선
- **git**: `git show 78d086a`
- **범위**: custom-maker / style / frontend
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 UI/스타일을 조정했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/custom-maker_post.css`, `custom-maker/custom-maker_post/custom-maker_post.html`, `custom-maker/custom-maker_post/custom-maker_post.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="68285e4"></a>

### 27. 2026-05-31 — `68285e4`

- **hash (short)**: `68285e4`
- **hash (full)**: `68285e4d6707864c5c8eea9545905b96c46e5bd9`
- **author**: nomura
- **message**: feat: 게시판 헤더에 눈 아이콘 추가 및 스타일 개선
- **git**: `git show 68285e4`
- **범위**: custom-maker / frontend
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/custom-maker_post.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="e637e4d"></a>

### 28. 2026-05-31 — `e637e4d`

- **hash (short)**: `e637e4d`
- **hash (full)**: `e637e4d91ff3dda5d31bd0ab9384d29ff5c68435`
- **author**: nomura
- **message**: feat(frontend): 커스텀 메이커 게시판 프론트엔드 구조 완성
- **git**: `git show e637e4d`
- **범위**: custom-maker / frontend
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/custom-maker_post.html`, `custom-maker/custom-maker_post/custom-maker_post.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="721ea20"></a>

### 29. 2026-06-01 — `721ea20`

- **hash (short)**: `721ea20`
- **hash (full)**: `721ea20cac8c1c391ee86b7c2533f5e35a05c4d1`
- **author**: nomura
- **message**: docs: 주요 프론트엔드/백엔드 작업 내역 문서화 (RDMD 폴더)
- **git**: `git show 721ea20`
- **범위**: docs / frontend / backend
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/backend/backend_1.md`, `RDMD/information6.md`, `RDMD/information7.md`, `RDMD/information8.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="d24d833"></a>

### 30. 2026-06-01 — `d24d833`

- **hash (short)**: `d24d833`
- **hash (full)**: `d24d833fdb41c76c84a57263391e89f734763fbc`
- **author**: nomura
- **message**: feat: 커스텀 메이커 게시판 상세(포스트) 페이지 프론트엔드 구조 완성
- **git**: `git show d24d833`
- **범위**: custom-maker / frontend / style
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/post_detail.css`, `custom-maker/custom-maker_post/post_detail.html`, `custom-maker/custom-maker_post/post_detail.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="9d003eb"></a>

### 31. 2026-06-01 — `9d003eb`

- **hash (short)**: `9d003eb`
- **hash (full)**: `9d003eb30f7a518345048511f58b6c79efba96b9`
- **author**: nomura
- **message**: docs: 커스텀 메이커 게시판 상세(포스트) 페이지 작업 내역 문서화
- **git**: `git show 9d003eb`
- **범위**: docs / custom-maker / frontend
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/information9.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="819b2a5"></a>

### 32. 2026-06-02 — `819b2a5`

- **hash (short)**: `819b2a5`
- **hash (full)**: `819b2a5f6a042120f737e3968dab92ed5ad59fa0`
- **author**: nomura
- **message**: feat(post): 커스텀 메이커 게시판 상세 페이지 프론트엔드 구현
- **git**: `git show 819b2a5`
- **범위**: custom-maker / frontend / style
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/post_detail.css`, `custom-maker/custom-maker_post/post_detail.html`, `custom-maker/custom-maker_post/post_detail.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="120e986"></a>

### 33. 2026-06-02 — `120e986`

- **hash (short)**: `120e986`
- **hash (full)**: `120e98601aa22742afde34072d65a93185c9b699`
- **author**: nomura
- **message**: style(contact): Contact_us 입력창 스타일 정리 및 간격 조정
- **git**: `git show 120e986`
- **범위**: inquiry / style
- **요약**: 문의 영역을 중심으로 UI/스타일을 조정했다. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/common-v2.css`, `Contact_us/common-v2.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c8971d0"></a>

### 34. 2026-06-03 — `c8971d0`

- **hash (short)**: `c8971d0`
- **hash (full)**: `c8971d0e782c86f2f33b861c409c4524c6a452f0`
- **author**: nomura
- **message**: docx : information9.md << 업데이트
- **git**: `git show c8971d0`
- **범위**: docs
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/information9.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="7a0f861"></a>

### 35. 2026-06-05 — `7a0f861`

- **hash (short)**: `7a0f861`
- **hash (full)**: `7a0f8616c6ed621b4e5eb0bf8aa8f693984100b8`
- **author**: nomura
- **message**: style(post): post-detail 제목과 액션 버튼 중앙 정렬
- **git**: `git show 7a0f861`
- **범위**: style / custom-maker
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 UI/스타일을 조정했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/post_detail.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="7c79dce"></a>

### 36. 2026-06-05 — `7c79dce`

- **hash (short)**: `7c79dce`
- **hash (full)**: `7c79dcebeed56f7bc41e79569f6d35c93373a8bc`
- **author**: nomura
- **message**: feat : index.html에 메인 페이지 퀵 네비게이션 블록 추가 커스텀 메이커, 티어표, 행운 뽑기 섹션을 카드형 UI로 구성 공지사항 영역과 티어 카드 클릭 네비게이션 구조 정리 헤더/푸터 placeholder 유지 및 공지 모달 UI 연동 준비
- **git**: `git show 7c79dce`
- **범위**: notice / custom-maker / tier-class / frontend
- **요약**: 메인 페이지 영역을 중심으로 기능을 추가·개선했다. 대표 변경 파일: index.html. 메인 진입 HTML 이름 정리 포함.
- **주요 파일**: `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="835762b"></a>

### 37. 2026-06-06 — `835762b`

- **hash (short)**: `835762b`
- **hash (full)**: `835762b74dfb6c99551dbdbd8af5ab10d073d325`
- **author**: nomura
- **message**: feat : notice 폴더 구조 완성: notice.html, all_notices.html, news.html 페이지 추가 공지사항 페이지 레이아웃 구현 (2단 그리드: 전체 공지 / 새 소식) notice.css 추가로 공지 항목, 링크, 날짜 스타일링 정의 각 공지 페이지에서 공통 header/footer 동적 로드 지원 "문서 59개 모두 보기" / "문서 21개 모두 보기" 링크로 세부 공지 페이지 네비게이션 구현
- **git**: `git show 835762b`
- **범위**: docs / notice / common / style
- **요약**: 공통 UI/경로·메인 페이지·공지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더.
- **주요 파일**: `common.js`, `index.html`, `notice/all_notices.html`, `notice/news.html`, `notice/notice.css`, `notice/notice.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="767e829"></a>

### 38. 2026-06-06 — `767e829`

- **hash (short)**: `767e829`
- **hash (full)**: `767e829e304e049d0a35d2f1586ce7de393ed886`
- **author**: nomura
- **message**: docx : information10.md 추가후 공지사항 파일 제작 완료
- **git**: `git show 767e829`
- **범위**: docs / notice
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/information10.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="de28858"></a>

### 39. 2026-06-07 — `de28858`

- **hash (short)**: `de28858`
- **hash (full)**: `de28858b66622ef149c01e927a19dec57cc52346`
- **author**: nomura
- **message**: feat(contact): Contact_us 로그인 이동 처리 함수 추가
- **git**: `git show de28858`
- **범위**: auth / inquiry / frontend / style
- **요약**: 문의·인증(유저) 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/common-v2.js`, `user_login/login.css`, `user_login/login.html`, `user_login/login.js`, `user_login/sign_up.css`, `user_login/sign_up.html`, `user_login/sign_up.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="68b3b84"></a>

### 40. 2026-06-07 — `68b3b84`

- **hash (short)**: `68b3b84`
- **hash (full)**: `68b3b84b4769941431975c9456bb03e7695f8543`
- **author**: nomura
- **message**: feat(auth): 아이디/비밀번호 찾기 페이지 추가 및 로그인 네비게이션 개선
- **git**: `git show 68b3b84`
- **범위**: auth / frontend / style
- **요약**: 인증(유저) 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT.
- **주요 파일**: `user_login/find_account.css`, `user_login/find_account.html`, `user_login/find_account.js`, `user_login/login.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="dadb2d9"></a>

### 41. 2026-06-07 — `dadb2d9`

- **hash (short)**: `dadb2d9`
- **hash (full)**: `dadb2d9e1fb18dad756a19f61de72bf911496f5d`
- **author**: nomura
- **message**: feat(notice): 공지 목록 UI 개선 및 전체/새소식 목록 페이지 추가
- **git**: `git show dadb2d9`
- **범위**: notice / frontend / style
- **요약**: 공지 영역을 중심으로 기능을 추가·개선했다.
- **주요 파일**: `notice/all_notices.html`, `notice/news.html`, `notice/notice.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="e2705ac"></a>

### 42. 2026-06-07 — `e2705ac`

- **hash (short)**: `e2705ac`
- **hash (full)**: `e2705acad472032de0e79fe90e584c8d82ffcffe`
- **author**: nomura
- **message**: docx : commit: dadb2d9 << 관련 내용 추가 작성
- **git**: `git show e2705ac`
- **범위**: docs
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/information10.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c4eee33"></a>

### 43. 2026-06-07 — `c4eee33`

- **hash (short)**: `c4eee33`
- **hash (full)**: `c4eee336b8fd7520a30a7b21e461866e73c249f8`
- **author**: nomura
- **message**: docx : login 관련 내용의 대해서 내용 작성
- **git**: `git show c4eee33`
- **범위**: docs / auth
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/information11.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="675a158"></a>

### 44. 2026-06-08 — `675a158`

- **hash (short)**: `675a158`
- **hash (full)**: `675a158a47e5c79efe54b46d868012a8ce3df4cb`
- **author**: nomura
- **message**: feat(api): 티어리스트 CRUD 시작 — 모델, 컨트롤러, 라우트 및 서버 연결 추가
- **git**: `git show 675a158`
- **범위**: backend / tier-class / frontend / custom-maker
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판, Express API/모델.
- **주요 파일**: `backend/controllers/tierController.js`, `backend/models/TierList.js`, `backend/routes/tierRoutes.js`, `backend/server.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="3a1f9c9"></a>

### 45. 2026-06-08 — `3a1f9c9`

- **hash (short)**: `3a1f9c9`
- **hash (full)**: `3a1f9c9e2f095bfb3a1090f3f846ad496f53aaf4`
- **author**: nomura
- **message**: feat(models): 티어리스트 모델 추가 (TierList)
- **git**: `git show 3a1f9c9`
- **범위**: custom-maker / backend / tier-class / frontend
- **요약**: RDMD 문서 영역을 중심으로 기능을 추가·개선했다.
- **주요 파일**: `RDMD/backend/backend_2.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="02cf378"></a>

### 46. 2026-06-08 — `02cf378`

- **hash (short)**: `02cf378`
- **hash (full)**: `02cf378c132641d68d7aac39857ef1aa41b75524`
- **author**: nomura
- **message**: feat(auth): 사용자 모델 추가 (User)
- **git**: `git show 02cf378`
- **범위**: auth / frontend / backend
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT, Express API/모델, 환경·의존성.
- **주요 파일**: `backend/controllers/authController.js`, `backend/models/User.js`, `backend/package-lock.json`, `backend/package.json`, `backend/routes/authRoutes.js`, `backend/server.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="8ca982b"></a>

### 47. 2026-06-09 — `8ca982b`

- **hash (short)**: `8ca982b`
- **hash (full)**: `8ca982b114f1e60dc618cae7ed90b94552337408`
- **author**: nomura
- **message**: feat(auth): 로그인 기능 백엔드 연동 및 일반 사용자 프로필 UI 개선
- **git**: `git show 8ca982b`
- **범위**: auth / frontend / backend / common
- **요약**: 백엔드·공통 UI/경로·인증(유저) 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT, 공통 경로/헤더, Express API/모델.
- **주요 파일**: `backend/controllers/authController.js`, `backend/routes/authRoutes.js`, `common.js`, `user_login/login.js`, `user_login/sign_up.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="5565dae"></a>

### 48. 2026-06-10 — `5565dae`

- **hash (short)**: `5565dae`
- **hash (full)**: `5565dae7bad746696aaf2c231856db76390ac2cd`
- **author**: nomura
- **message**: feat(Contact_us): 문의 페이지 프론트엔드 백엔드 1차 연동
- **git**: `git show 5565dae`
- **범위**: inquiry / frontend / style
- **요약**: 문의 영역을 중심으로 기능을 추가·개선했다. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/contact_us.css`, `Contact_us/contact_us.html`, `Contact_us/contact_us.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="7a6a8b7"></a>

### 49. 2026-06-10 — `7a6a8b7`

- **hash (short)**: `7a6a8b7`
- **hash (full)**: `7a6a8b7de2178b6faa380d40f3507a2e8fb421b1`
- **author**: nomura
- **message**: feat(api): 문의(Inquiry) CRUD 및 답변 기능 추가 — 모델, 컨트롤러, 라우트 및 서버 연결
- **git**: `git show 7a6a8b7`
- **범위**: inquiry / backend / frontend
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 문의, Express API/모델.
- **주요 파일**: `backend/controllers/inquiryController.js`, `backend/models/Inquiry.js`, `backend/routes/inquiryRoutes.js`, `backend/server.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="1539d6e"></a>

### 50. 2026-06-11 — `1539d6e`

- **hash (short)**: `1539d6e`
- **hash (full)**: `1539d6eb1c448244abcdf264712dacf84ebd28fd`
- **author**: nomura
- **message**: feat(admin): MongoDB 기반 관리자 로그인 API 및 프론트 연동
- **git**: `git show 1539d6e`
- **범위**: admin / auth / backend / frontend
- **요약**: 관리자·백엔드·공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 공통 경로/헤더, Express API/모델.
- **주요 파일**: `admin/admin-login.js`, `backend/controllers/adminController.js`, `backend/models/Admin.js`, `backend/routes/adminRoutes.js`, `backend/server.js`, `common.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="482313c"></a>

### 51. 2026-06-11 — `482313c`

- **hash (short)**: `482313c`
- **hash (full)**: `482313caeb35e72660474bd00c5c072b96b40a30`
- **author**: nomura
- **message**: feat(inquiry): 문의사항 수정/삭제/신고 기능 백엔드 API 연동
- **git**: `git show 482313c`
- **범위**: inquiry / backend / frontend
- **요약**: 문의·백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: Express API/모델.
- **주요 파일**: `Contact_us/contact_us.js`, `backend/controllers/inquiryController.js`, `backend/routes/inquiryRoutes.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="04167c5"></a>

### 52. 2026-06-11 — `04167c5`

- **hash (short)**: `04167c5`
- **hash (full)**: `04167c520f7018b91f67fc835eae3c85de46a320`
- **author**: nomura
- **message**: chore(gitignore): mcps 디렉토리 제외 추가
- **git**: `git show 04167c5`
- **범위**: chore
- **요약**: 환경·의존성 관련으로 설정·도구를 손봤다. 대표 변경 파일: .gitignore.
- **주요 파일**: `.gitignore`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="f0ca6ad"></a>

### 53. 2026-06-11 — `f0ca6ad`

- **hash (short)**: `f0ca6ad`
- **hash (full)**: `f0ca6adcd4384818718aa6eb347ad093c335d217`
- **author**: nomura
- **message**: chore(deps): backend 의존성 lockfile 업데이트
- **git**: `git show f0ca6ad`
- **범위**: backend / chore
- **요약**: 백엔드 영역을 중심으로 설정·도구를 손봤다. 손댄 포인트: 환경·의존성.
- **주요 파일**: `backend/package-lock.json`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="4d415a8"></a>

### 54. 2026-06-12 — `4d415a8`

- **hash (short)**: `4d415a8`
- **hash (full)**: `4d415a89fd8f24bbb19b23181f3e0bd02cb957ba`
- **author**: nomura
- **message**: feat(Contact_us): 문의/답변 백엔드 API 연동
- **git**: `git show 4d415a8`
- **범위**: inquiry / backend / frontend
- **요약**: 문의 영역을 중심으로 기능을 추가·개선했다. 문의 폴더명/경로 정리 포함.
- **주요 파일**: `Contact_us/contact_us.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="9d9066e"></a>

### 55. 2026-06-12 — `9d9066e`

- **hash (short)**: `9d9066e`
- **hash (full)**: `9d9066e97e0f8a13832d9d86440dd1aa2dd668a7`
- **author**: nomura
- **message**: feat(inquiry): 답변 등록/신고/삭제 API 추가
- **git**: `git show 9d9066e`
- **범위**: inquiry / backend / frontend
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 문의, Express API/모델.
- **주요 파일**: `backend/controllers/inquiryController.js`, `backend/models/Inquiry.js`, `backend/routes/inquiryRoutes.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="297a0e5"></a>

### 56. 2026-06-15 — `297a0e5`

- **hash (short)**: `297a0e5`
- **hash (full)**: `297a0e523acbf0cc3feba596f3b29739a97a0da3`
- **author**: nomura
- **message**: feat: 어드민 댓글·유저 관리 페이지 백엔드 연동 및 차단 기능 구현
- **git**: `git show 297a0e5`
- **범위**: admin / custom-maker / frontend / auth
- **요약**: 관리자·백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT, 관리자 화면/API, 문의.
- **주요 파일**: `admin/comments/comment-detail.js`, `admin/comments/comment-management.css`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `backend/controllers/adminController.js`, `backend/controllers/authController.js`, `backend/controllers/blockController.js`, `backend/controllers/inquiryController.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="fbdcd19"></a>

### 57. 2026-06-15 — `fbdcd19`

- **hash (short)**: `fbdcd19`
- **hash (full)**: `fbdcd198fc680c72a4f836cd980513f78f9798aa`
- **author**: nomura
- **message**: feat: 공지사항 시스템 프론트엔드·백엔드 연동 및 상세 페이지 구현
- **git**: `git show fbdcd19`
- **범위**: notice / frontend / admin / backend
- **요약**: 관리자·백엔드·공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 공지, Express API/모델.
- **주요 파일**: `admin/comments/comment-management.css`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `backend/controllers/noticeController.js`, `backend/models/Notice.js`, `backend/routes/noticeRoutes.js`, `backend/server.js`, `common.css`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="649ce6a"></a>

### 58. 2026-06-15 — `649ce6a`

- **hash (short)**: `649ce6a`
- **hash (full)**: `649ce6a5d952e8807e85b6613f577f5ff9583267`
- **author**: nomura
- **message**: docs : frontend, backend 파일 관련 정리 md 작성
- **git**: `git show 649ce6a`
- **범위**: docs / backend / frontend
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/backend/backend_3.md`, `RDMD/backend/backend_4.md`, `RDMD/backend/backend_5.md`, `RDMD/backend/backend_6.md`, `RDMD/backend/backend_7.md`, `RDMD/backend/backend_8.md`, `RDMD/information12.md`, `RDMD/information13.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="3e82458"></a>

### 59. 2026-06-16 — `3e82458`

- **hash (short)**: `3e82458`
- **hash (full)**: `3e8245803958c802cb80fbfb383e0bc5423a8a39`
- **author**: nomura
- **message**: feat(custom-maker): 게시판 댓글·상세 페이지·본인 글 삭제
- **git**: `git show 3e82458`
- **범위**: custom-maker / frontend / backend / tier-class
- **요약**: 백엔드·커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판, Express API/모델.
- **주요 파일**: `backend/controllers/tierCommentController.js`, `backend/controllers/tierController.js`, `backend/models/TierList.js`, `backend/models/TierPostComment.js`, `backend/routes/tierRoutes.js`, `backend/server.js`, `custom-maker/custom-maker.html`, `custom-maker/custom-maker.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="8fbbe60"></a>

### 60. 2026-06-16 — `8fbbe60`

- **hash (short)**: `8fbbe60`
- **hash (full)**: `8fbbe60d8897fe868e06cabe64940465348131c8`
- **author**: nomura
- **message**: feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고
- **git**: `git show 8fbbe60`
- **범위**: admin / auth / tier-class / frontend
- **요약**: 관리자·백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT, 관리자 화면/API, Express API/모델.
- **주요 파일**: `admin/admin-login.js`, `admin/comments/comment-management.css`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `backend/controllers/adminController.js`, `backend/controllers/adminTierReportController.js`, `backend/controllers/authController.js`, `backend/controllers/tierCommentController.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="91cb6ab"></a>

### 61. 2026-06-16 — `91cb6ab`

- **hash (short)**: `91cb6ab`
- **hash (full)**: `91cb6ab2449640d6e7c8b96ed767d65c0eb80146`
- **author**: nomura
- **message**: feat : 3티어표에 추가할 인물들
- **git**: `git show 91cb6ab`
- **범위**: tier-class / frontend
- **요약**: 티어 이미지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 캐릭터 이미지.
- **주요 파일**: `tier-image/3 tier/baruro.jpg`, `tier-image/3 tier/uryon.jpg`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="3c80203"></a>

### 62. 2026-06-16 — `3c80203`

- **hash (short)**: `3c80203`
- **hash (full)**: `3c80203366d8852518d75fd9ecca39934c5596b5`
- **author**: nomura
- **message**: docs : frontend, backend 관련 문서 기록 정리
- **git**: `git show 3c80203`
- **범위**: docs / backend / frontend
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/backend/backend_10.md`, `RDMD/backend/backend_11.md`, `RDMD/backend/backend_12.md`, `RDMD/backend/backend_13.md`, `RDMD/backend/backend_14.md`, `RDMD/backend/backend_9.md`, `RDMD/information19.md`, `RDMD/information20.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="bfee66d"></a>

### 63. 2026-06-16 — `bfee66d`

- **hash (short)**: `bfee66d`
- **hash (full)**: `bfee66dfc862d45b6315521a3250c825fa0a6a7f`
- **author**: nomura
- **message**: fix(auth): 비밀번호 찾기 실패 수정 — getJwtSecret export 추가
- **git**: `git show bfee66d`
- **범위**: auth / frontend / backend / chore
- **요약**: 백엔드 영역을 중심으로 문제를 수정했다. 손댄 포인트: 권한/미들웨어, 로그인·JWT, 환경·의존성.
- **주요 파일**: `.gitignore`, `backend/utils/jwtAuth.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="d49ca7d"></a>

### 64. 2026-06-16 — `d49ca7d`

- **hash (short)**: `d49ca7d`
- **hash (full)**: `d49ca7d13cffc66f6ddc2351c6cd576064f6cf94`
- **author**: nomura
- **message**: feat(custom-maker): 로그인 유저 내 게시글 보기 연동
- **git**: `git show d49ca7d`
- **범위**: auth / custom-maker / frontend / common
- **요약**: 공통 UI/경로·커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판, 공통 경로/헤더.
- **주요 파일**: `common.js`, `custom-maker/custom-maker_post/custom-maker_post.css`, `custom-maker/custom-maker_post/custom-maker_post.html`, `custom-maker/custom-maker_post/custom-maker_post.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="d38f58e"></a>

### 65. 2026-06-16 — `d38f58e`

- **hash (short)**: `d38f58e`
- **hash (full)**: `d38f58e72fab17ab6533c3cb3e68544e000c67d5`
- **author**: nomura
- **message**: fix : quick-card << 공유 티어 -> 이벤트 << 변경
- **git**: `git show d38f58e`
- **범위**: tier-class / frontend
- **요약**: 메인 페이지 영역을 중심으로 문제를 수정했다. 대표 변경 파일: index.html.
- **주요 파일**: `index.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="f102dcd"></a>

### 66. 2026-06-16 — `f102dcd`

- **hash (short)**: `f102dcd`
- **hash (full)**: `f102dcd4c12c6e74df4b1b8a078b269f7c483d48`
- **author**: nomura
- **message**: feat : 우룡, 발로 << 이미지 추가
- **git**: `git show f102dcd`
- **범위**: frontend / tier-class
- **요약**: 공식 티어 페이지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공식 티어 HTML.
- **주요 파일**: `tier-class/tier3.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="2a522eb"></a>

### 67. 2026-06-16 — `2a522eb`

- **hash (short)**: `2a522eb`
- **hash (full)**: `2a522eb82947eb2198362d5c287c68a8079ad351`
- **author**: nomura
- **message**: 어드민 커스텀 게시판 관리로 변경
- **git**: `git show 2a522eb`
- **범위**: admin / custom-maker / backend / tier-class
- **요약**: 관리자·백엔드 영역을 중심으로 구조·경로를 바꿨다. 손댄 포인트: 관리자 화면/API, Express API/모델.
- **주요 파일**: `admin/comments/comment-management.css`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `backend/controllers/adminTierReportController.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="77e1002"></a>

### 68. 2026-06-17 — `77e1002`

- **hash (short)**: `77e1002`
- **hash (full)**: `77e1002b79364177edd4f5b362413205a80badab`
- **author**: nomura
- **message**: feat(backend): 알림 API·모델·설정 기반 구축
- **git**: `git show 77e1002`
- **범위**: notifications / backend / frontend / admin
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API, 알림, Express API/모델.
- **주요 파일**: `backend/controllers/notificationController.js`, `backend/models/Admin.js`, `backend/models/Notification.js`, `backend/models/User.js`, `backend/routes/notificationRoutes.js`, `backend/server.js`, `backend/utils/notificationService.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="849dc03"></a>

### 69. 2026-06-17 — `849dc03`

- **hash (short)**: `849dc03`
- **hash (full)**: `849dc034d9be6c5355195eeb1be71006b8beed26`
- **author**: nomura
- **message**: feat(backend): 문의·티어·공지 알림 트리거 연동
- **git**: `git show 849dc03`
- **범위**: notice / inquiry / notifications / backend
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공지, 문의, Express API/모델.
- **주요 파일**: `backend/controllers/inquiryController.js`, `backend/controllers/noticeController.js`, `backend/controllers/tierCommentController.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="cd5d8bc"></a>

### 70. 2026-06-17 — `cd5d8bc`

- **hash (short)**: `cd5d8bc`
- **hash (full)**: `cd5d8bce9e6d65a6fb4db991d5df0357dbe2e59a`
- **author**: nomura
- **message**: feat(frontend): 헤더 로그인 버튼 및 알림 벨 UI
- **git**: `git show cd5d8bc`
- **범위**: auth / notifications / frontend / common
- **요약**: 공통 UI/경로 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 공통 경로/헤더.
- **주요 파일**: `Header_Footer.css`, `common.js`, `header.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="d45acea"></a>

### 71. 2026-06-17 — `d45acea`

- **hash (short)**: `d45acea`
- **hash (full)**: `d45acea92dd39d42152c246726bd8f58b7b7296d`
- **author**: nomura
- **message**: feat(frontend): 어드민 숨김 로그인 진입 추가
- **git**: `git show d45acea`
- **범위**: admin / auth / frontend
- **요약**: 인증(유저) 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 로그인·JWT.
- **주요 파일**: `user_login/find_account.html`, `user_login/find_account.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c3be96c"></a>

### 72. 2026-06-17 — `c3be96c`

- **hash (short)**: `c3be96c`
- **hash (full)**: `c3be96c58529a3f6e1aa676ce3a41d2e8319f870`
- **author**: nomura
- **message**: feat(frontend): 알림 딥링크 커스텀 메이커 댓글 스크롤
- **git**: `git show c3be96c`
- **범위**: custom-maker / notifications / frontend / style
- **요약**: 커스텀 메이커/게시판 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 커스텀 게시판.
- **주요 파일**: `custom-maker/custom-maker_post/post_detail.css`, `custom-maker/custom-maker_post/post_detail.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="493e2bc"></a>

### 73. 2026-06-17 — `493e2bc`

- **hash (short)**: `493e2bc`
- **hash (full)**: `493e2bc384e247dedbc5a6e9eed64d3a95bd0261`
- **author**: nomura
- **message**: feat(frontend): 알림 딥링크 문의사항 답변 스크롤
- **git**: `git show 493e2bc`
- **범위**: inquiry / notifications / frontend / style
- **요약**: 문의 영역을 중심으로 기능을 추가·개선했다.
- **주요 파일**: `Contact_us/contact_us.css`, `Contact_us/contact_us.html`, `Contact_us/contact_us.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="150e556"></a>

### 74. 2026-06-18 — `150e556`

- **hash (short)**: `150e556`
- **hash (full)**: `150e5567d729d7e0500e41b105693485617685e5`
- **author**: nomura
- **message**: fix : logo 배경제거
- **git**: `git show 150e556`
- **범위**: frontend / tier-class
- **요약**: 티어 이미지 영역을 중심으로 문제를 수정했다. 손댄 포인트: 캐릭터 이미지.
- **주요 파일**: `tier-image/logo.webp`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="8ecfddc"></a>

### 75. 2026-06-18 — `8ecfddc`

- **hash (short)**: `8ecfddc`
- **hash (full)**: `8ecfddc9b3826b5f90d292e0d93fff5dabf3ddc3`
- **author**: nomura
- **message**: fix(auth): 비밀번호 재설정 링크 만료 오류 수정
- **git**: `git show 8ecfddc`
- **범위**: auth / frontend / backend
- **요약**: 백엔드·인증(유저) 영역을 중심으로 문제를 수정했다. 손댄 포인트: 로그인·JWT, Express API/모델. 비밀번호 재설정 토큰/보안 흐름 포함.
- **주요 파일**: `backend/controllers/authController.js`, `backend/routes/authRoutes.js`, `backend/utils/appUrl.js`, `user_login/auth_api.js`, `user_login/find_account.html`, `user_login/find_account.js`, `user_login/reset_password.html`, `user_login/reset_password.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="a3ee179"></a>

### 76. 2026-06-18 — `a3ee179`

- **hash (short)**: `a3ee179`
- **hash (full)**: `a3ee1791e4fef39af8c1adc98e333f9b29562abb`
- **author**: nomura
- **message**: fix(admin): 어드민 커스텀 메이커 게시글/댓글 미표시 문제 수정
- **git**: `git show a3ee179`
- **범위**: admin / custom-maker / frontend / auth
- **요약**: 관리자·백엔드 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API, Express API/모델.
- **주요 파일**: `admin/admin-login.html`, `admin/admin-login.js`, `admin/admin_api.js`, `admin/comments/comment-detail.html`, `admin/comments/comment-detail.js`, `admin/comments/comment-management.html`, `admin/comments/comment-management.js`, `backend/routes/adminRoutes.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="01bddd4"></a>

### 77. 2026-06-19 — `01bddd4`

- **hash (short)**: `01bddd4`
- **hash (full)**: `01bddd4c13f84a9d8ce4a593d8b12bda9bcd12dd`
- **author**: nomura
- **message**: fix(deploy): GitHub Pages 경로 및 API 설정 지원
- **git**: `git show 01bddd4`
- **범위**: deploy / backend / common / frontend
- **요약**: 문의·관리자 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `.nojekyll`, `Contact_us/contact_us.html`, `Contact_us/contact_us.js`, `admin/admin-login.html`, `admin/admin-login.js`, `admin/admin_api.js`, `admin/comments/comment-detail.html`, `admin/comments/comment-management.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="3ca3e66"></a>

### 78. 2026-06-19 — `3ca3e66`

- **hash (short)**: `3ca3e66`
- **hash (full)**: `3ca3e66013544f6e35a8e8fbf0892234b63f6b28`
- **author**: nomura
- **message**: Revert "fix(deploy): GitHub Pages 경로 및 API 설정 지원"
- **git**: `git show 3ca3e66`
- **범위**: deploy / backend / common / meta
- **요약**: 직전에 넣었던 변경을 되돌려 이전 상태로 복구했다.
- **주요 파일**: `.nojekyll`, `Contact_us/contact_us.html`, `Contact_us/contact_us.js`, `admin/admin-login.html`, `admin/admin-login.js`, `admin/admin_api.js`, `admin/comments/comment-detail.html`, `admin/comments/comment-management.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="6afed99"></a>

### 79. 2026-06-20 — `6afed99`

- **hash (short)**: `6afed99`
- **hash (full)**: `6afed997901dfa05a7f84d6ea3dc2fc69e5aec57`
- **author**: nomura
- **message**: chore(deploy): add render.yaml for Render.com deployment
- **git**: `git show 6afed99`
- **범위**: deploy / chore
- **요약**: 배포 설정 영역을 중심으로 설정·도구를 손봤다. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `render.yaml`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="7c328f6"></a>

### 80. 2026-06-20 — `7c328f6`

- **hash (short)**: `7c328f6`
- **hash (full)**: `7c328f68eeb89f9fbe7685c7e29a6459742e1d6c`
- **author**: nomura
- **message**: fix(deploy): unify get*ApiBase() logic for local + Render.com (relative URLs on same origin)
- **git**: `git show 7c328f6`
- **범위**: deploy / backend / frontend / admin
- **요약**: 문의·관리자·백엔드 영역을 중심으로 문제를 수정했다. 손댄 포인트: 로그인·JWT, 관리자 화면/API, 커스텀 게시판. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `Contact_us/contact_us.js`, `admin/admin_api.js`, `backend/controllers/authController.js`, `backend/server.js`, `common.js`, `custom-maker/custom-maker.js`, `custom-maker/custom-maker_post/custom-maker_post.js`, `custom-maker/custom-maker_post/post_detail.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="4f78c6e"></a>

### 81. 2026-06-20 — `4f78c6e`

- **hash (short)**: `4f78c6e`
- **hash (full)**: `4f78c6e3c6f8b32623585e806aebc8ae1e4a6364`
- **author**: nomura
- **message**: chore(deploy): prepare for Render.com deployment
- **git**: `git show 4f78c6e`
- **범위**: deploy / chore / custom-maker / backend
- **요약**: 배포 설정·백엔드·공통 UI/경로 영역을 중심으로 설정·도구를 손봤다. 손댄 포인트: 커스텀 게시판, 공통 경로/헤더, Express API/모델. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `DEPLOY.md`, `backend/.env.example`, `backend/server.js`, `common.js`, `custom-maker/custom-maker_post/custom-maker_post.html`, `custom-maker/custom-maker_post/custom-maker_post.js`, `header.html`, `render.yaml`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="437dfbf"></a>

### 82. 2026-06-20 — `437dfbf`

- **hash (short)**: `437dfbf`
- **hash (full)**: `437dfbfb21035efb26fd20e3c1fa38632838a2ee`
- **author**: nomura
- **message**: feat(middleware): introduce proper auth middleware and secure admin routes
- **git**: `git show 437dfbf`
- **범위**: admin / auth / backend / frontend
- **요약**: 백엔드 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 권한/미들웨어, 로그인·JWT, 관리자 화면/API. 관리자 API 보호 강화 포함.
- **주요 파일**: `backend/controllers/authController.js`, `backend/middleware/auth.js`, `backend/routes/adminRoutes.js`, `backend/routes/inquiryRoutes.js`, `backend/routes/noticeRoutes.js`, `backend/routes/notificationRoutes.js`, `backend/routes/tierRoutes.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="90b90d8"></a>

### 83. 2026-06-20 — `90b90d8`

- **hash (short)**: `90b90d8`
- **hash (full)**: `90b90d874563bcbf95ecca26eed2f0a4d9b390e3`
- **author**: nomura
- **message**: feat(admin): enhance admin comment and tier board management
- **git**: `git show 90b90d8`
- **범위**: admin / tier-class / frontend / style
- **요약**: 관리자 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 관리자 화면/API.
- **주요 파일**: `admin/comments/comment-management.css`, `admin/comments/comment-management.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="77dadaa"></a>

### 84. 2026-06-20 — `77dadaa`

- **hash (short)**: `77dadaa`
- **hash (full)**: `77dadaa2f27d3823e085f499e1d84affb96d6083`
- **author**: nomura
- **message**: fix(deploy): GitHub Actions / GitHub Pages header/footer 404 + nav links 해결 (getBasePath, fixRootLinks, 절대경로 제거, resolveAssetPath 개선, .nojekyll + workflow 추가)
- **git**: `git show 77dadaa`
- **범위**: deploy / common / frontend / admin
- **요약**: 배포 설정·문의·관리자 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API, 커스텀 게시판. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `.github/workflows/deploy-pages.yml`, `.nojekyll`, `Contact_us/contact_us.html`, `Contact_us/contact_us.js`, `admin/admin-login.js`, `common.js`, `custom-maker/custom-maker.js`, `custom-maker/custom-maker_post/custom-maker_post.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="42a15d5"></a>

### 85. 2026-06-20 — `42a15d5`

- **hash (short)**: `42a15d5`
- **hash (full)**: `42a15d534c2fedd48b6eb0df528ef6284b8256d7`
- **author**: nomura
- **message**: docs(RDMD): 6월 18일 이후 작업 로그 정리 (프론트엔드 information25-29, 백엔드 backend_25-29)
- **git**: `git show 42a15d5`
- **범위**: docs / backend / frontend
- **요약**: RDMD 문서 영역을 중심으로 문서를 정리·추가했다.
- **주요 파일**: `RDMD/backend/backend_25.md`, `RDMD/backend/backend_26.md`, `RDMD/backend/backend_27.md`, `RDMD/backend/backend_28.md`, `RDMD/backend/backend_29.md`, `RDMD/information25.md`, `RDMD/information26.md`, `RDMD/information27.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="2484719"></a>

### 86. 2026-06-20 — `2484719`

- **hash (short)**: `2484719`
- **hash (full)**: `24847191236efe0c2ffd64aba7bc1bc4dcbb9b87`
- **author**: nomura
- **message**: config : node.js 기반으로 ignore 기능 추가
- **git**: `git show 2484719`
- **범위**: chore
- **요약**: 환경·의존성 관련으로 설정·도구를 손봤다. 대표 변경 파일: .gitignore.
- **주요 파일**: `.gitignore`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="56d8bd6"></a>

### 87. 2026-06-20 — `56d8bd6`

- **hash (short)**: `56d8bd6`
- **hash (full)**: `56d8bd6a8110b9315424a0c9be095798e4cc1936`
- **author**: nomura
- **message**: docs: add comprehensive README files
- **git**: `git show 56d8bd6`
- **범위**: docs / admin / notice / inquiry
- **요약**: 문의·RDMD 문서·README 영역을 중심으로 문서를 정리·추가했다. 손댄 포인트: 관리자 화면/API, 커스텀 게시판, 공지.
- **주요 파일**: `Contact_us/README.md`, `RDMD/README.md`, `README.md`, `admin/README.md`, `backend/README.md`, `custom-maker/README.md`, `notice/README.md`, `tier-class/README.md`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="180f8f5"></a>

### 88. 2026-06-20 — `180f8f5`

- **hash (short)**: `180f8f5`
- **hash (full)**: `180f8f536d864ddd291cda7ba2abcc4b4ee8629e`
- **author**: nomura
- **message**: fix(deploy): GitHub Pages static preview에서 백엔드 API 호출 오류 방지
- **git**: `git show 180f8f5`
- **범위**: deploy / backend / frontend / admin
- **요약**: 문의·관리자·공통 UI/경로 영역을 중심으로 문제를 수정했다. 손댄 포인트: 로그인·JWT, 관리자 화면/API, 커스텀 게시판. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `Contact_us/contact_us.js`, `admin/admin_api.js`, `common.js`, `custom-maker/custom-maker_post/custom-maker_post.js`, `custom-maker/custom-maker_post/post_detail.js`, `notice/notice.js`, `user_login/auth_api.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="b7d51ae"></a>

### 89. 2026-06-20 — `b7d51ae`

- **hash (short)**: `b7d51ae`
- **hash (full)**: `b7d51ae0fc6ded810b4f45e953e8bdd27cf59441`
- **author**: nomura
- **message**: fix(deploy): GitHub Pages 배포에서 header/footer 로드 안 되는 문제 해결
- **git**: `git show b7d51ae`
- **범위**: deploy / common / frontend
- **요약**: 배포 설정 영역을 중심으로 문제를 수정했다. 경로·API Base·배포 환경 대응 포함.
- **주요 파일**: `.github/workflows/deploy-pages.yml`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="fbc047c"></a>

### 90. 2026-06-20 — `fbc047c`

- **hash (short)**: `fbc047c`
- **hash (full)**: `fbc047c3059bd3ddb92f0f359d08a11096bfa9f9`
- **author**: nomura
- **message**: fix: admin login redirect and inquiry answer auth for admin users
- **git**: `git show fbc047c`
- **범위**: admin / auth / inquiry / frontend
- **요약**: 문의·관리자 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API.
- **주요 파일**: `Contact_us/contact_us.js`, `admin/admin-login.html`, `admin/admin-login.js`, `admin/comments/comment-detail.js`, `admin/comments/comment-management.js`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="341a2d1"></a>

### 91. 2026-06-20 — `341a2d1`

- **hash (short)**: `341a2d1`
- **hash (full)**: `341a2d1a258b913d3e36a68342c93e961dafcb95`
- **author**: nomura
- **message**: feat : 야기라 카즈미츠 추가
- **git**: `git show 341a2d1`
- **범위**: frontend / tier-class
- **요약**: 공식 티어 페이지·티어 이미지 영역을 중심으로 기능을 추가·개선했다. 손댄 포인트: 캐릭터 이미지, 공식 티어 HTML.
- **주요 파일**: `tier-class/tier2.html`, `tier-image/2 tier/yagira kazumotsu.jpg`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="9dc97ed"></a>

### 92. 2026-06-20 — `9dc97ed`

- **hash (short)**: `9dc97ed`
- **hash (full)**: `9dc97eddf1cec782b099cef451b83b229a1f8256`
- **author**: nomura
- **message**: Add tier 4-5 character images
- **git**: `git show 9dc97ed`
- **범위**: tier-class
- **요약**: 티어 이미지 영역을 중심으로 내용을 추가했다. 손댄 포인트: 캐릭터 이미지.
- **주요 파일**: `tier-image/4 tier/hanako.webp`, `tier-image/4 tier/saeki.webp`, `tier-image/5 tier/ebihara.png`, `tier-image/5 tier/sawada.webp`, `tier-image/5 tier/sugamo.png`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c673e86"></a>

### 93. 2026-06-20 — `c673e86`

- **hash (short)**: `c673e86`
- **hash (full)**: `c673e867773fe0269ea7194ae63bc008348d2e4d`
- **author**: nomura
- **message**: Update tier 4-5 HTML with character images
- **git**: `git show c673e86`
- **범위**: tier-class / frontend
- **요약**: 공식 티어 페이지 영역을 중심으로 변경을 반영했다. 손댄 포인트: 공식 티어 HTML.
- **주요 파일**: `tier-class/tier4.html`, `tier-class/tier5.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="9112e56"></a>

### 94. 2026-06-25 — `9112e56`

- **hash (short)**: `9112e56`
- **hash (full)**: `9112e563525f0db0cf3414ad98acca82f250cfd2`
- **author**: nomura
- **message**: fix : goHome() << 메인 파일 이름이 변경 됨으로써 home.html -> index.html 변경하여 홈 페이지 접근 문제 해결
- **git**: `git show 9112e56`
- **범위**: frontend / admin / auth
- **요약**: 관리자 영역을 중심으로 문제를 수정했다. 손댄 포인트: 관리자 화면/API. 메인 진입 HTML 이름 정리 포함.
- **주요 파일**: `admin/admin-login.html`
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="c80f16e"></a>

### 95. 2026-06-25 — `c80f16e`

- **hash (short)**: `c80f16e`
- **hash (full)**: `c80f16e510410360f68c13287cbc55391b81124f`
- **author**: nomura
- **message**: Merge branch 'master' of https://github.com/nomura-kanziro/human-bug-tier
- **git**: `git show c80f16e`
- **범위**: tier-class / meta
- **요약**: 원격/다른 브랜치 변경을 현재 브랜치에 합쳤다. 기능 변경 요약은 개별 커밋을 본다.
- **주요 파일**: _(파일 목록 없음 / merge 등)_
- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_

[▲ 목차로](#목차)

---

<a id="fe9ade9"></a>

### 96. 2026-07-18 — `fe9ade9`

- **hash (short)**: `fe9ade9`
- **hash (full)**: `fe9ade916afa3ee63e56ecb43ac0101f34d1686e`
- **author**: nomura
- **message**: docs(RDMD): restructure frontend work logs into feature folders
- **git**: `git show fe9ade9`
- **범위**: docs / RDMD / frontend
- **요약**: 루트 information1~29 일지를 삭제하고 RDMD/frontend 아래 기능 폴더·순서 번호 *-record.md 구조로 재배치했다. 프론트 작업 이력을 기능 단위로 찾도록 정리함.
- **주요 파일**: `RDMD/frontend/`, `RDMD/information*.md`(삭제)
- **관련 RDMD**: [frontend/README.md](../frontend/README.md)

[▲ 목차로](#목차)

---

<a id="026a38a"></a>

### 97. 2026-07-18 — `026a38a`

- **hash (short)**: `026a38a`
- **hash (full)**: `026a38a96089da36de048dcf536a9c592f1e58dd`
- **author**: nomura
- **message**: docs(RDMD): restructure backend work logs into feature folders
- **git**: `git show 026a38a`
- **범위**: docs / RDMD / backend
- **요약**: backend_0~29 평면 일지를 삭제하고 RDMD/backend 아래 01-setup~07-deploy 기능 폴더와 *-record.md, README 인덱스로 재구성했다.
- **주요 파일**: `RDMD/backend/01-setup/` ~ `07-deploy/`, `RDMD/backend/README.md`, `RDMD/backend/backend_*.md`(삭제)
- **관련 RDMD**: [backend/README.md](../backend/README.md)

[▲ 목차로](#목차)

---

<a id="0f3c4ac"></a>

### 98. 2026-07-18 — `0f3c4ac`

- **hash (short)**: `0f3c4ac`
- **hash (full)**: `0f3c4aca91e60c27124ac83416c9c17bcdd9467a`
- **author**: nomura
- **message**: docs(RDMD): add features, guides, and summary documentation
- **git**: `git show 0f3c4ac`
- **범위**: docs / RDMD
- **요약**: 온보딩용 features(기능 설명), guides(개발 규칙), summary(작업 이력·타임라인) 문서를 추가해 프로젝트 이해와 유지보수 가이드를 분리했다.
- **주요 파일**: `RDMD/features/`, `RDMD/guides/`, `RDMD/summary/`
- **관련 RDMD**: [features/README.md](../features/README.md), [guides/README.md](../guides/README.md)

[▲ 목차로](#목차)

---

<a id="6e05d23"></a>

### 99. 2026-07-18 — `6e05d23`

- **hash (short)**: `6e05d23`
- **hash (full)**: `6e05d2373e6ed0e1feee189565f5282a0634cae1`
- **author**: nomura
- **message**: docs(RDMD): add commit_history author log and mandatory pre-commit rule
- **git**: `git show 6e05d23`
- **범위**: docs / RDMD / commit_history
- **요약**: 작성자별 커밋 타임라인 폴더를 만들고 nomura.md에 전체 git 이력을 수록했다. 커밋·푸시 전 본인 md 작성 필수 규칙과 목차·과거→현재 정렬 명세를 README에 정의함.
- **주요 파일**: `RDMD/commit_history/`
- **관련 RDMD**: [commit_history/README.md](./README.md)

[▲ 목차로](#목차)

---

<a id="c6f862e"></a>

### 100. 2026-07-18 — `c6f862e`

- **hash (short)**: `c6f862e`
- **hash (full)**: `c6f862e65c85e6c2d00d5ee5ecef046fe904569d`
- **author**: nomura
- **message**: docs(agents): add .agents common rules and canonical feature skills
- **git**: `git show c6f862e`
- **범위**: docs / agents
- **요약**: 모든 AI 공통 정본(.agents)에 hierarchy·common-rules·권한 매트릭스와 기능별 skill.md를 추가했다. Grok을 Admin AI로 두고 번외 AI도 동일 스킬을 쓰도록 함.
- **주요 파일**: `.agents/`
- **관련 RDMD**: _(에이전트 규칙)_

[▲ 목차로](#목차)

---

<a id="a1c43f8"></a>

### 101. 2026-07-18 — `a1c43f8`

- **hash (short)**: `a1c43f8`
- **hash (full)**: `a1c43f870c19f7be335fcb79624b515222db7cb8`
- **author**: nomura
- **message**: docs(team): add human worker rules for vibe and hardcoding
- **git**: `git show a1c43f8`
- **범위**: docs / team
- **요약**: 창시자·팀원용 team/ 규칙(공통 룰, 워크플로, 코딩 스타일, 금지, 가이드, 체크리스트)을 추가했다. 커밋 전 commit_history 작성 의무를 포함함.
- **주요 파일**: `team/`
- **관련 RDMD**: [../../team/README.md](../../team/README.md)

[▲ 목차로](#목차)

---

<a id="717afd1"></a>

### 102. 2026-07-18 — `717afd1`

- **hash (short)**: `717afd1`
- **hash (full)**: `717afd10e29d248ce857462dc3bc3066259b5a52`
- **author**: nomura
- **message**: docs(claude): add CLAUDE.md and .claude feature skills
- **git**: `git show 717afd1`
- **범위**: docs / claude
- **요약**: Claude Code 진입용 CLAUDE.md와 .claude/skills 기능별 SKILL.md·handoff 온보딩 스킬을 추가했다. .agents 정본을 우선 따르도록 연결함.
- **주요 파일**: `CLAUDE.md`, `.claude/`
- **관련 RDMD**: _(Claude 스킬 팩)_

[▲ 목차로](#목차)

---

<a id="14b3c29"></a>

### 103. 2026-07-18 — `14b3c29`

- **hash (short)**: `14b3c29`
- **hash (full)**: `14b3c2969f3fa2672e1b5eab8e2868cc9627d8d5`
- **author**: nomura
- **message**: docs(groks): add Grok Admin AI skill pack
- **git**: `git show 14b3c29`
- **범위**: docs / groks
- **요약**: Grok 전용 .groks 스킬 팩과 AGENTS.md를 추가해 Admin AI로서 공통 룰 수호·기능 작업 절차를 정의했다.
- **주요 파일**: `.groks/`
- **관련 RDMD**: _(Grok 스킬 팩)_

[▲ 목차로](#목차)

---

<a id="fc6c611"></a>

### 104. 2026-07-18 — `fc6c611`

- **hash (short)**: `fc6c611`
- **hash (full)**: `fc6c611b29234d51e666d05b65668bab0f4b5d06`
- **author**: nomura
- **message**: docs(codex): add Codex skills, root AGENTS.md, and README map
- **git**: `git show fc6c611`
- **범위**: docs / codex
- **요약**: Codex용 .codex 기능 skill.md와 루트 AGENTS.md를 추가하고, 루트 README에 team/.agents/주 골격 AI/RDMD 진입 지도를 반영했다.
- **주요 파일**: `.codex/`, `AGENTS.md`, `README.md`
- **관련 RDMD**: _(Codex 스킬 팩 + 루트 안내)_

[▲ 목차로](#목차)

---

<a id="0ec285b"></a>

### 105. 2026-07-18 — `0ec285b`

- **hash (short)**: `0ec285b`
- **hash (full)**: `0ec285b4bf1613b2f08a05352f8c13984ccdd677`
- **author**: nomura
- **message**: fix(ui): mobile responsive layout for header auth board inquiry
- **git**: `git show 0ec285b`
- **범위**: frontend / mobile
- **요약**: 헤더·메인·로그인/가입·게시판·문의 화면에 모바일 미디어쿼리와 터치 영역을 적용하고, 사이드 메뉴 토글 첫 탭 열림 버그를 수정했다.
- **주요 파일**: `Header_Footer.css`, `common.css`, `common.js`, `user_login/*.css`, `Contact_us/contact_us.css`, `custom-maker*/*.css`
- **관련 RDMD**: [guides/mobile-pwa.md](../guides/mobile-pwa.md)

[▲ 목차로](#목차)

---

<a id="25c3e8c"></a>

### 106. 2026-07-18 — `25c3e8c`

- **hash (short)**: `25c3e8c`
- **hash (full)**: `25c3e8c859ede26ded416b66c35f6f4f66e0bd93`
- **author**: nomura
- **message**: feat(pwa): add web manifest, service worker, and install icons
- **git**: `git show 0ec285b`
- **범위**: frontend / pwa
- **요약**: manifest·sw.js·PWA 아이콘을 추가하고 common.js/로그인 페이지에서 서비스 워커를 등록해 홈 화면 설치가 가능하게 했다. API는 네트워크 우선이다.
- **주요 파일**: `manifest.webmanifest`, `sw.js`, `pwa-register.js`, `tier-image/pwa/*`, `common.js`, `user_login/*.html`
- **관련 RDMD**: [guides/mobile-pwa.md](../guides/mobile-pwa.md)

[▲ 목차로](#목차)

---

<a id="pending-107"></a>

### 107. 2026-07-18 — `pending-107`

- **hash (short)**: `pending-107`
- **hash (full)**: `pending`
- **author**: nomura
- **message**: docs(RDMD): add mobile and PWA usage guide
- **git**: `git show 0ec285b`
- **범위**: docs / RDMD
- **요약**: 모바일 반응형·PWA 설치 방법과 검증 체크리스트를 RDMD/guides/mobile-pwa.md 로 문서화했다.
- **주요 파일**: `RDMD/guides/mobile-pwa.md`, `RDMD/guides/README.md`
- **관련 RDMD**: [guides/mobile-pwa.md](../guides/mobile-pwa.md)

[▲ 목차로](#목차)

---

## 빈 템플릿 (이후 커밋 추가용)

**최신 항목은 커밋 상세 구역의 맨 아래(이 템플릿 바로 위)** 에 붙인다.

커밋·푸시 **전** 작성 → `git add` 에 이 파일 포함 → `git commit` → `git push`

```markdown
<a id="SHORT_HASH_or_pending"></a>

### N. YYYY-MM-DD — `SHORT_HASH_or_pending`

- **hash (short)**: `pending`
- **hash (full)**: `pending`
- **author**: nomura
- **message**: (git commit -m 원문 그대로)
- **git**: `git show SHORT_HASH`
- **범위**: frontend | backend | docs | deploy | …
- **요약**: (이 커밋이 실제로 한 일을 1~2문장으로 — message 복붙 금지)
- **주요 파일**: 
- **관련 RDMD**: 

[▲ 목차로](#목차)
```

---

**마지막 갱신**: 2026-07-18 · 총 104 항목 · 배치 커밋 #96~104 (+hash 보정) · 정렬 = 과거→현재
