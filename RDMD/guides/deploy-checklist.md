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

## O. Oracle Cloud (현재 운영 — 정식 `https://human-bug-tier.com`, 서버 직접 `https://hbt-tier.duckdns.org`)

명령은 레포 루트 Git Bash, `OCI_HOST`·`OCI_KEY` 설정 후 ([가이드](../../backend/deploy/oracle/README.md)).

- [ ] 로컬 `.env` 가 커밋에 없음 (서버 시크릿은 `/opt/human-bug-tier/shared/.env` 에만)
- [ ] `bash backend/deploy/oracle/deploy.sh deploy` → 마지막 줄 `배포 완료: hbt-...`
- [ ] `https://hbt-tier.duckdns.org/health` → `status: ok`, `db: connected`, `resolvedAppUrl` 이 `https://human-bug-tier.com` (`/health` 는 Pages 가 넘기지 않으므로 서버 직접 주소로 확인)
- [ ] 메인·티어·로그인·게시판 확인
- [ ] 실패 시 `deploy.sh logs` → `deploy.sh rollback`
- [ ] `deploy.sh setup` 을 다시 돌렸다면 서버에서 certbot 재실행 (setup 이 nginx HTTPS 설정을 덮어씀)
- [ ] 같은 Atlas DB 로 로컬 `npm start` 를 오래 켜 두지 않음 (스케줄러 중복)

---

## AI. AI 전용 서비스 `ai-service/` (2026-11-11 새 VM 에 반영됨 — 아래는 처음 올릴 때의 순서)

`backend/deploy/oracle/deploy.sh` 는 `shared/ai.env` 가 **있을 때만** ai-service 를 함께 올린다. 없으면 사이트만 올라가고 `/api/ai/*` 만 503("잠시 쉬는 중")이다.

**먼저 정할 것 — 생성 모델(`AI_PROVIDER`).** 옛 VM(1GB RAM)에는 Ollama·임베딩·ChromaDB 를 올릴 수 없어 벡터 검색을 끈 가벼운 모드(BM25)로 만들었다. 지금 VM(4코어/24GB)은 서버 안 Ollama(`gemma4:e4b`, CPU)로 답하고 벡터 검색은 계속 꺼 둔다([`../ai/05-oracle-storage-record.md`](../ai/05-oracle-storage-record.md)).

- [ ] `none` — LLM 없이 문서 답(무료). 화면에 "AI 서버 OFF 상태" 안내가 뜬다
- [ ] `anthropic` — Claude API. 서버 `shared/ai.env` 에 `ANTHROPIC_API_KEY` 를 **서버에서 직접** 채운다(비용 발생)
- [ ] `ollama` — 다른 PC/GPU 의 Ollama (`OLLAMA_BASE_URL`)

순서:

- [ ] `deploy.sh ai-setup` — VM 에 python3-venv·pip 와 `shared/ai-venv/` (최초 1회)
- [ ] `AI_PROVIDER=<선택> deploy.sh ai-env` — `shared/ai.env` 생성, `AI_SERVICE_KEY` 를 backend `.env` 와 같은 값으로(값은 출력하지 않음)
- [ ] (anthropic 이라면) 서버에서 `ANTHROPIC_API_KEY` 채우기
- [ ] `deploy.sh deploy` — 의존성 설치(`requirements-prod.txt`, 처음엔 몇 분) → 링크 교체 → `human-bug-tier`·`hbt-ai` 재시작 → 두 `/health` 확인
- [ ] `deploy.sh status` — AI `/health` 의 `provider`·`ai`, 메모리(`free -m`: 백엔드 상한 600M + AI 상한 300M 이 합쳐도 넘치지 않는지)
- [ ] 바깥에서 8000·11434 가 **안 열려야 함**, `/ai` 에서 질문 → 답이 온다(`none` 이면 "AI 서버 OFF" 안내가 정상)
- [ ] 지식(`knowledge/*.md`)·`tiers.json` 을 고쳤다면 `deploy`(= `hbt-ai` 재시작) — 서비스는 시작할 때 읽는다

문제가 생기면 `deploy.sh logs ai` · `deploy.sh rollback`(이전 릴리스에 ai-service 가 없으면 `hbt-ai` 만 멈춘다).

### 에이전트 봇 (2026-11-12 커밋 — 서버 반영 전)

- [ ] `deploy.sh deploy` — 새 의존성 없음(`requirements-prod.txt` 그대로). 사이트·ai-service 가 함께 올라간다
- [ ] 서버 nginx 설정에 `/api/ai/agent/run` location 추가(저장소 `backend/deploy/oracle/nginx-human-bug-tier.conf` 의 블록 — `proxy_buffering off`, `proxy_read_timeout 330s`). certbot 이 고친 설정을 덮어쓰지 않게 **손으로 추가** → `sudo nginx -t && sudo systemctl reload nginx`
- [ ] (권장) `shared/ai.env` 에 `AGENT_SUMMARY_TOKENS=120` — 서버는 CPU(약 6토큰/초)라 해설이 길면 느리다. `AGENT_SITE_API_URL` 은 기본값(`http://127.0.0.1:5000`) 그대로
- [ ] 회원 계정으로 오른쪽 아래 원형 버튼 → 검색(2P) → 티어표 초안(8P) → "커스텀 메이커에서 열기"
- [ ] 글자가 조각조각 오는지(한꺼번에 몰려 오면 nginx location 누락), 작업 중 모달을 닫아도 계속되는지
- [ ] 관리자 → 행운 뽑기 관리 → 포인트 내역에 "에이전트 봇"이 남는지
- [ ] 바깥에서 `/api/ai/agent/data/posts` 가 **401/403** 인지(ai-service 전용)

상세: [`../features/ai-service.md`](../features/ai-service.md) · [`../../ai-service/README.md`](../../ai-service/README.md) · [`../ai/04-production-deploy-prep-record.md`](../ai/04-production-deploy-prep-record.md)

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

풀 기능은 정식 주소 **`https://human-bug-tier.com`** 을 사용하세요.

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
