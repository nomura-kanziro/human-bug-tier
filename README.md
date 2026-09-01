# 휴버대 티어표

> ‘휴먼버그대학교’ 시리즈 캐릭터들의 전투력 순위를 한눈에 확인하고, 나만의 커스텀 티어를 만들 수 있는 미니 웹사이트입니다.

## 프로젝트 소개

휴버대 티어표는 웹소설/웹툰 ‘휴먼버그대학교’에 등장하는 다양한 캐릭터들의 강함을 티어로 분류하고, 사용자들이 직접 커스텀 티어를 제작·공유할 수 있는 플랫폼입니다.

### 주요 특징
- **9단계 공식 티어표** (1티어 ~ 9티어)
- **커스텀 티어 메이커** — 드래그&드롭으로 나만의 티어표 제작 + PNG/PDF 다운로드
- **커스텀 게시판** — 제작한 티어표를 공유하고 댓글로 소통
- **공지사항 & 새 소식** 관리 시스템
- **문의하기** + 관리자 답변 기능
- **회원 시스템** (가입, 로그인, 비밀번호 재설정, 이메일 인증)
- **관리자 전용 대시보드** (공지 작성, 문의 답변, 사용자 차단, 신고 관리 등)

---

## 시연 가이드 (체험해보기)

### 1. 메인 페이지 접속
```bash
# 로컬에서 전체 앱 실행 (프론트 = root-cloudflare/)
cd backend
npm start
```
브라우저에서 `http://localhost:5000/` 접속

- 상단 네비게이션으로 티어표, 커스텀 메이커 이동 가능
- 하단에 **전체 공지**와 **새 소식** 미리보기 표시
- 하단에 1~9티어 카드 클릭으로 바로 이동 (6~9티어도 캐릭터 이미지 포함)
- 휴대폰에서는 홈 화면 추가(PWA) 가능. 이벤트·행운 뽑기는 준비 중 표시

### 2. 공식 티어표 둘러보기
- 메인 하단 또는 상단 메뉴 → **티어표**
- `tier-class/tier1.html` ~ `tier9.html` 페이지
- 각 티어별 캐릭터 이미지와 설명 확인

### 3. 커스텀 티어 메이커 사용하기
1. 상단 메뉴 → **커스텀 메이커 → 제작하기**
2. 원하는 티어 카테고리 선택
3. 왼쪽 캐릭터 풀에서 드래그하여 오른쪽 티어 칸에 배치 (휴대폰은 **탭 선택 후 칸 탭**)
4. **다운로드** 버튼으로 PNG 또는 PDF로 저장
5. **게시판**에 업로드하여 다른 사용자와 공유

### 4. 커스텀 게시판
- 커스텀 메이커 → **게시판**
- 다른 유저가 만든 티어표 목록 확인
- 상세 페이지에서 댓글 작성, 좋아요, 신고 가능
- 본인 글은 **수정**으로 전용 화면에서 고친 뒤 게시판으로 돌아옴

### 5. 로그인 및 회원 기능
- 헤더 오른쪽 → **로그인**
- 회원가입 시 이메일 인증 (선택적)
- 아이디/비밀번호 찾기 → 재설정 링크 이메일 발송

### 6. 문의하기
- 푸터 또는 별도 링크 → **문의하기**
- 문의 등록 → 관리자가 답변 달아줌

### 7. 관리자 기능 체험
```
관리자 로그인: /admin/admin-login.html
```
관리자 계정으로 로그인하면:
- 공지 등록 / 수정 / 고정 / 삭제
- 문의 답변 작성
- 사용자 차단 관리
- 신고된 티어 게시글/댓글 관리

---

## 시작하기

프론트는 레포 루트가 아니라 배포 전용 폴더에 있다. 폴더 안에서 `npm start` 하지 않는다. 항상 `backend`에서 서버를 켠다.

| 폴더 | 쓰는 곳 | 로그인·게시판 |
|------|---------|----------------|
| [`root-cloudflare/`](./root-cloudflare/README.md) | 로컬 · Tunnel · Cloudflare Pages | 로컬/Tunnel만 |
| [`root-render/`](./root-render/README.md) | Render.com | Render에서 됨 |

배포 정본: [`CLOUDFLARE.md`](./CLOUDFLARE.md) — **지금은 Cloudflare 추가 작업을 하지 않음.**  
**지금 실무는 Render.com만** (`root-render/` + `backend/`).  
정식 버전 React는 기획만: [`RDMD/features/react-rewrite.md`](./RDMD/features/react-rewrite.md) (구현은 별도 지시)

### 로컬 — Cloudflare 프론트 (기본)

`npm start`는 **`root-cloudflare/`** 를 연다.

```bash
cd backend
npm install
npm start
```

→ http://localhost:5000/  (프론트 + API)

### 로컬 — Render 프론트만 보기

`root-render/` 화면을 이 PC에서 확인하려면 정적 루트만 바꾼다.

PowerShell:

```powershell
cd backend
$env:STATIC_ROOT='root-render'
npm start
```

cmd:

```bat
cd backend
set STATIC_ROOT=root-render
npm start
```

→ 역시 http://localhost:5000/  종료 후 다시 기본(`root-cloudflare`)으로 돌아가면 `STATIC_ROOT`를 비운다.

### Cloudflare Pages (정적 미리보기)

로그인·게시판은 안 된다. HTML만 올린다.

확인: https://human-bug-tier.pages.dev/

다시 올리기 (레포 루트에서):

```bash
npx wrangler pages deploy root-cloudflare --project-name=human-bug-tier --branch=master --commit-dirty=true
```

대시보드: Cloudflare → Workers & Pages → `human-bug-tier`  
목록: `npx wrangler pages deployment list --project-name=human-bug-tier`

### Render.com (레거시, 전체 기능)

`render.yaml` + Mongo 환경변수. 서버가 `RENDER=true`이면 **`root-render/`** 만 연다. 자세한 변수 이름은 [`DEPLOY.md`](./DEPLOY.md).

---

## 주요 기능 소개

### 메인 화면
- 빠른 네비게이션 (티어표, 커스텀 메이커, 행운 뽑기)
- 실시간 공지 미리보기
- 9단계 티어 카드

### 티어표 시스템
- 1티어(신계) ~ 9티어까지 계층적 분류
- 각 티어 전용 페이지 + `tier-image/1 tier` ~ `9 tier` 캐릭터 이미지

### 커스텀 메이커 + 게시판
- 드래그 앤 드롭(데스크톱) / 탭 배치(모바일)
- html2canvas + jsPDF로 이미지/PDF 추출
- 게시판에 업로드하여 공유 + 댓글 + **본인 글 수정**

### 인증 시스템
- JWT 기반 로그인
- 이메일 인증 / 비밀번호 재설정
- 관리자 권한 분리

### 관리자 시스템
- JWT + `isAdmin` 미들웨어 보호
- 공지(작성·수정·핀), 문의, 차단, 신고, 댓글 통합 관리

---

## 관리 및 유지보수

### 1. 로컬 실행 및 개발
- **항상** `cd backend && npm start` 사용 (포트 5000 통합)
- `npx serve .` 는 API가 분리되므로 추천하지 않음

### 2. 환경 변수 관리
환경변수 (예시만 커밋, 실값은 커밋 금지):

```bash
# 루트
copy .env.example .env

# backend (선택 — 루트와 동일 키면 backend/.env 가 우선)
cd backend
copy .env.example .env
```

필수: `MONGO_URI`, `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW`  
권장: `JWT_SECRET`, `EMAIL_USER` + `EMAIL_APP_PASSWORD`, `APP_URL`  
서버 로드: 루트 `.env` → `backend/.env` (후자가 덮어씀)

### 3. 배포 방법
- **로컬 / Pages / Render 실행**은 위의 **시작하기** (폴더별 실행)
- 배포 정본: [`CLOUDFLARE.md`](./CLOUDFLARE.md)
- 배포 전 `backend/.env`가 커밋되지 않도록 주의

### 4. 코드 구조
```
/
├── root-cloudflare/                         # Cloudflare Pages · 로컬/Tunnel 프론트
├── root-render/                             # Render.com 전용 프론트
├── backend/                                 # Express 서버 + API
│   ├── server.js                            # 정적 파일 서빙 + API 라우팅
│   ├── routes/                              # API 라우트
│   ├── controllers/                         # 비즈니스 로직
│   ├── models/                              # Mongoose 스키마
│   └── middleware/auth.js                   # requireAuth, requireAdmin
├── CLOUDFLARE.md                             # 배포 정본
└── RDMD/                                    # 개발 기록 (커밋 로그)
```

### 5. 유지보수 팁
- DB 변경 시 `backend/models/`와 컨트롤러 동기화
- 새 관리자 추가는 `ADMIN_INPUT_*` 환경변수 또는 시드 로직으로 처리
- 공지/문의 기능 추가 시 `requireAdmin` 미들웨어 적용 필수
- GitHub Pages 배포 시 `getBasePath()` 로직이 서브패스 대응하는지 확인
- 이메일 기능 사용 시 Gmail 앱 비밀번호 사용

### 6. 문제 해결
- Header/Footer 404 → `root-cloudflare/common.js` (Render면 `root-render/common.js`) 의 `getBasePath()` 확인
- 관리자 401 → `getAdminAuthHeaders()` 사용 여부 확인
- 회원가입 실패 → EMAIL_* 설정 여부 확인 (미설정 시 즉시 인증 처리)

---

## 라이선스

개인 프로젝트용으로 제작되었습니다.  
상업적 이용 시 원작자(휴먼버그대학교)와 상의 바랍니다.

---

**만든 사람들을 위한 기록**: RDMD 폴더에 작업별 상세 커밋 로그·기능 설명·가이드가 정리되어 있습니다.

### 규칙 · 에이전트 · 팀

| 주체 | 위치 |
|------|------|
| **사람** (창시자·팀원) | [`team/`](./team/README.md) |
| **AI 공통 정본** (룰 + 기능 skill, 번외 AI 포함) | [`.agents/`](./.agents/README.md) |
| **Grok** (Admin · 주 골격) | [`groks/`](./groks/README.md) |
| **Claude** (주 골격) | [`CLAUDE.md`](./CLAUDE.md) + [`.claude/skills/`](./.claude/README.md) |
| **Codex** (주 골격) | [`AGENTS.md`](./AGENTS.md) + [`codex/`](./codex/README.md) |
| 개발 이력·기능 설명 | [`RDMD/`](./RDMD/README.md) |

> 주 골격 3종만 전용 skill 팩이 있는 이유: 가장 많이 쓰는 AI이고 도구별 로드 형식이 다름.  
> 그 외 AI는 `.agents/<기능>/skill.md` 만 보면 됨.

즐거운 티어링 되세요! 🔥
