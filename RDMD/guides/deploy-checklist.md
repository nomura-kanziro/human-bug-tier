# 배포 체크리스트

상세 절차: 현재 운영 서버 = [`backend/deploy/oracle/README.md`](../../backend/deploy/oracle/README.md) (Oracle Cloud) · 배포 정본 [`CLOUDFLARE.md`](../../CLOUDFLARE.md)  
레거시 Render: 루트 [`DEPLOY.md`](../../DEPLOY.md), `render.yaml`

---

## A. 로컬 사전 검증

- [ ] `cd backend && npm start` 성공  
- [ ] `http://localhost:5000/health`  
- [ ] 메인 · 티어 · 커스텀 · 공지 · 문의 페이지 로드  
- [ ] 회원가입/로그인 (EMAIL 없여도 가입 되는지 정책 확인)  
- [ ] 관리자 로그인 → 공지 작성 → 메인 반영  
- [ ] 커스텀 게시글 + 댓글 (DB 연결 시)  
- [ ] `.env` 가 git status 에 안 잡힘  

---

## B. MongoDB Atlas

- [ ] 클러스터 생성, DB user  
- [ ] Network Access: 필요 IP 또는 `0.0.0.0/0` (Render). Oracle 서버면 VM 공인 IP  
- [ ] `MONGO_URI` 연결 문자열 복사 (password URL-encode)  

---

## O. Oracle Cloud (현재 운영 — `https://hbt-tier.duckdns.org`)

명령은 레포 루트 Git Bash, `OCI_HOST`·`OCI_KEY` 설정 후 ([가이드](../../backend/deploy/oracle/README.md)).

- [ ] 로컬 `.env` 가 커밋에 없음 (서버 시크릿은 `/opt/human-bug-tier/shared/.env` 에만)
- [ ] `bash backend/deploy/oracle/deploy.sh deploy` → 마지막 줄 `배포 완료: hbt-...`
- [ ] `https://hbt-tier.duckdns.org/health` → `status: ok`, `db: connected`, `resolvedAppUrl` 이 https 주소
- [ ] 메인·티어·로그인·게시판 확인
- [ ] 실패 시 `deploy.sh logs` → `deploy.sh rollback`
- [ ] `deploy.sh setup` 을 다시 돌렸다면 서버에서 certbot 재실행 (setup 이 nginx HTTPS 설정을 덮어씀)
- [ ] 같은 Atlas DB 로 로컬 `npm start` 를 오래 켜 두지 않음 (스케줄러 중복)

---

## P. Cloudflare Pages (`human-bug-tier.pages.dev` — `/api` 는 Oracle 로 프록시)

- [ ] Pages 프로젝트 빌드 설정: Root directory `root-cloudflare` / Build `npm run build` / Output `dist` (GitHub 연동 빌드가 실제 운영 배포)
- [ ] 대시보드 최신 배포가 Success (Failure 면 옛 배포본이 계속 서비스됨)
- [ ] GitHub 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 등록 (없으면 워크플로가 업로드 단계에서 실패)
- [ ] master 푸시 → `Deploy to Cloudflare Pages` 워크플로 성공
- [ ] `https://human-bug-tier.pages.dev/` 에서 React 화면이 뜸 (빌드 안 된 `/src/main.jsx` 를 부르지 않음)
- [ ] `https://human-bug-tier.pages.dev/api/notices` 가 **JSON** (HTML 이면 Pages Function 미배포)
- [ ] 백엔드 주소를 바꿨다면 Pages 환경변수 `API_ORIGIN`

---

## C. Render.com (레거시 풀스택 — ⛔ 베타 종료)

### 환경 변수

- [ ] `MONGO_URI`  
- [ ] `ADMIN_INPUT_ID` / `ADMIN_INPUT_PW`  
- [ ] `JWT_SECRET`  
- [ ] `APP_URL` = `https://<service>.onrender.com` (첫 배포 후 확정 가능)  
- [ ] (선택) `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `ADMIN_NAME`  

### 서비스 설정

- [ ] Root Directory: `backend` (Blueprint/`render.yaml` 일치)  
- [ ] Build: `npm install`  
- [ ] Start: `npm start`  

### 배포 후

- [ ] 사이트 URL 접속  
- [ ] `/health`  
- [ ] 관리자 로그인  
- [ ] 공지 작성  
- [ ] 유저 가입 · 로그인  
- [ ] 메일 기능 사용 시 재설정 링크 도메인이 `APP_URL` 인지  

### Free tier 참고

- 비활성 시 슬립 → 첫 요청 지연  
- 슬립 중 메일/크론 의존 로직 주의  

---

## D. GitHub Pages (정적 미리보기만)

- [ ] `.github/workflows/deploy-pages.yml` 정상  
- [ ] **API 기능 기대하지 않음**  
- [ ] getBasePath / 상대 링크로 네비만 확인  
- [ ] common.js 가 `GITHUB_STATIC` 처리하는지  

풀 기능은 **Oracle 서버(`https://hbt-tier.duckdns.org`)** 를 사용하세요.

---

## E. 배포 직후 보안

- [ ] 관리자 기본 비밀번호 변경 또는 강한 값 사용  
- [ ] 프로덕션에서 예제 JWT_SECRET 미사용  
- [ ] 브라우저에서 `.env` 나 소스맵으로 시크릿 노출 없는지  

---

## F. 롤백

- Oracle: `bash backend/deploy/oracle/deploy.sh rollback` (최근 릴리스 3개 보관)  
- Render(레거시): 이전 배포 인스턴스 재활성화  
- Git: 문제 커밋 revert 후 재배포  
- DB: 스키마 파괴적 변경 시 백업/마이그레이션 계획 필요 (현재 별도 마이그레이션 툴 없음 → 모델 변경 신중)  

---

## 문제 빠른 표

| 증상 | 조치 |
|------|------|
| 502 / 앱 다운 | Oracle: `deploy.sh status`·`logs`, Mongo IP / Render(레거시): Render 로그, start command |
| 외부 접속 타임아웃 (서버 안 `curl 127.0.0.1` 은 200) | Oracle 콘솔 Security List 80/443, VM iptables 규칙이 REJECT 보다 위인지 |
| `http://<IP>/` 404 | 정상 — certbot 이후 도메인으로만 받음 |
| Pages 에서 `/api` 가 HTML | Pages Function 미배포 — 대시보드 최신 빌드 Failure·로그 확인(Root directory `root-cloudflare`), CI 쪽은 시크릿 확인 |
| 로그인 500 | MONGO_URI, JWT_SECRET |
| 메일 안 감 | EMAIL_*, APP_URL, Gmail 앱 비번 |
| 정적 404 | rootDir backend + static projectRoot |
| 관리 401 | admin 토큰, requireAdmin, 헤더 |
