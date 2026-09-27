# Cloudflare 배포 가이드

> **2026-09-19 창시자 지시 (최신 — 아래 2026-09-01 문구를 대체)**  
> **작업은 `root-cloudflare/`(React)에만 한다.**  
> `root-render/`(바닐라, Render.com)는 **베타 버전에서 업데이트 종료 → 수정 금지**.  
> 즉 아래 “지금 실무는 Render.com만” 문구는 **폐기**되었다. 단, Cloudflare **배포 인프라**(Pages/CI/Wrangler/시크릿)를 새로 구성하는 것은 여전히 별도 지시 후에 한다 — **금지된 건 배포 작업이지 `root-cloudflare/` 코드 작업이 아니다.**  
> 정본: [`.agents/common-rules.md`](./.agents/common-rules.md) ０항

> **2026-09-28 — 현재 운영 구조**  
> 창시자 지시로 백엔드를 **Oracle Cloud VM** 에 올리고(`https://hbt-tier.duckdns.org`, 가이드 [`backend/deploy/oracle/README.md`](./backend/deploy/oracle/README.md)),
> Cloudflare Pages 프론트가 그 백엔드를 쓰도록 연결했다 — **Pages Function 이 `/api/*` 를 Oracle 로 프록시**(C절).
> Pages 워크플로는 이제 React 를 빌드해 `dist/` 를 올린다. ⚠️ GitHub 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 가 없어 **CI 업로드는 아직 실패**한다(A-2).
> 실제 운영 배포는 **Pages 프로젝트의 GitHub 연동 빌드**(master push 시 Cloudflare 가 직접 빌드)가 한다.
> 2026-09-28 이 빌드가 Root directory 가 비어 있어(레포 루트에 `package.json` 없음 → ENOENT) 계속 실패해 `/api` 프록시가 반영되지 않았다 →
> 프로젝트 빌드 설정 **Root directory = `root-cloudflare`**, Build command `npm run build`, Output `dist` 로 고치고 재빌드해 `https://human-bug-tier.pages.dev/api/notices` JSON 응답을 확인했다.

```
방문자 ─▶ https://human-bug-tier.pages.dev  ─ 정적(dist) ─ /api/* ─▶ Pages Function ─▶ https://hbt-tier.duckdns.org
방문자 ─▶ https://hbt-tier.duckdns.org ─▶ nginx(443) ─▶ Node :5000 (API + dist 같이 서빙) ─▶ MongoDB Atlas
```

<details>
<summary>이전 선언 (2026-09-01, 참고용)</summary>

> Cloudflare **추가 작업은 일단 하지 않는다.**  
> **지금 실무는 Render.com만** (`root-render/` + `backend/`).  
> 정식 버전은 나중에 React로 다시 만들 예정 — [`RDMD/features/react-rewrite.md`](./RDMD/features/react-rewrite.md).  
> 이미 올린 Pages 미리보기·이 문서·`root-cloudflare/`는 유지한다.

</details>

배포 정본은 이 문서다. Render.com은 쓰지 않는다.

레포에 남아 있는 아래 파일은 **레거시**다. 따라가지 않는다.

- `DEPLOY.md` — Render 안내
- `render.yaml` — Render Blueprint
- `README.md`의 Render.com 배포 절

`backend/server.js`를 Workers로 갈아엎지 않는다.

전제: VS Code에 MCP가 **이미 연결**된 상태다. GitHub MCP로 레포를 읽고, Cloudflare MCP가 있으면 Pages 프로젝트·배포를 그걸로 한다. 대시보드 클릭은 MCP로 안 되는 항목만 한다.

---

## 0. 이 앱이 실제로 도는 프로세스

```
cd backend
npm install
npm start
```

| 항목 | 위치 |
|---|---|
| 서버 엔트리 | `backend/server.js` |
| start | `backend/package.json` → `"start": "node server.js"` |
| 포트 | `process.env.PORT \|\| 5000` |
| 정적 파일 | 로컬/Tunnel/Oracle: `root-cloudflare/dist/` (빌드 결과). Render.com: `root-render/` (`RENDER=true`) |
| API | `/api/auth`, `/api/notices`, `/api/tierlists`, `/api/inquiries`, `/api/admin`, `/api/notifications`, `/api/luck-draw` |
| 진단 | `GET /health` — `emailConfigured`, `emailProvider`, `db` |
| 프론트 API 베이스 | `root-cloudflare/src/lib/api.js` `getApiBase()` — 배포 호스트(같은 오리진)면 `''` |

Pages / Workers 런타임에는 `express` + `mongoose` + `nodemailer` + `backend/utils/youtubeCommunitySync.js` 가 그대로 안 올라간다.

| 경로 | 결과 | 로그인·게시판·메일 |
|---|---|---|
| A. Pages 정적 | HTML 미리보기 | 안 됨 (C 의 프록시 함수가 없을 때) |
| B. Tunnel + `npm start` | 전체 기능 | 됨. 앱 코드 변경 없음 |
| **C. Oracle VM + Pages `/api` 프록시 (현재)** | 전체 기능 | 됨. Oracle 주소는 바로, Pages 주소는 프록시 함수 배포 후 |
| Workers로 Express 이식 | 하지 않음 | — |

---

## VS Code MCP로 하는 순서

1. VS Code 에이전트에게 이 파일(`CLOUDFLARE.md`)을 기준으로 배포하라고 한다.
2. GitHub MCP로 `nomura-kanziro/human-bug-tier` 현재 브랜치(`main` 또는 `master`)를 확인한다.
3. Cloudflare MCP가 있으면
   - Pages 프로젝트 목록
   - 없으면 `human-bug-tier` 프로젝트 생성
   - React 빌드 결과 `root-cloudflare/dist/` + `root-cloudflare/functions/` 를 Pages에 배포 (`backend/` 제외, A절)
4. 전체 기능은 Pages로 Express를 올리지 않는다 — 백엔드는 Oracle VM(C절)에서 돌고, Pages 는 `/api` 만 프록시한다. (대안: 로컬/VPS `npm start` + Tunnel(B))
5. `.env` 값(`MONGO_URI`, `ADMIN_INPUT_*`, `BREVO_*`)은 MCP 채팅에 붙여 넣지 않는다. `backend/.env`에만 둔다.

MCP로 **할 수 있는 것**

- GitHub: 이 md 커밋, 워크플로 파일 추가 (write 권한 있을 때)
- Cloudflare MCP: Pages 프로젝트 생성·정적 배포·프로젝트 조회

MCP로 **안 되는 것** (기계 셸)

- `cd backend && npm start`
- `cloudflared tunnel --url http://localhost:5000`
- Atlas `MONGO_URI` / Brevo 키를 서버 프로세스에 주입

---

## A. Cloudflare Pages — React 빌드본 + `/api` 프록시

`backend/` 는 올리지 않는다. 올리는 것: `root-cloudflare/dist/`(Vite 빌드) + `root-cloudflare/functions/`(Pages Function).
소스 폴더 `root-cloudflare/` 를 그대로 올리면 `index.html` 이 빌드 전 `/src/main.jsx` 를 불러 화면이 안 뜬다.

현재 프로젝트: `human-bug-tier`  
Production branch: `master`  
미리보기 URL: `https://human-bug-tier.pages.dev/`

정적 소스: `root-cloudflare/dist/` (레포 루트에 프론트를 두지 않음, `dist/` 는 커밋하지 않으므로 배포 전에 빌드)

### A-1. MCP (우선)

Cloudflare MCP 도구가 VS Code에 보이면 그걸로 한다.

- 프로젝트 이름: `human-bug-tier`
- Production branch: `main` (없으면 `master`)
- Build command: `npm ci && npm run build` (Root directory `root-cloudflare`)
- Output directory: `dist`
- 제외: `backend/`, `node_modules/`, `.env`, `backend/.env`, `.git/`, `root-render/`, `RDMD/`

Grok에 연결된 Cloudflare MCP가 **Observability만** 있으면 Pages 생성·배포 도구가 없다. 그때는 A-2 Wrangler를 쓴다.

### A-2. MCP에 Pages deploy가 없을 때만 Wrangler

레포 루트, VS Code 터미널. `backend/`·`.env`가 올라가지 않게 **스테이징 폴더**를 쓴다.

`functions/` 는 **명령을 실행한 폴더** 기준으로 올라가므로 `root-cloudflare` 안에서 실행한다.

```bash
npx wrangler pages project create human-bug-tier --production-branch=master
cd root-cloudflare
npm ci && npm run build
npx wrangler pages deploy dist --project-name=human-bug-tier --branch=master --commit-dirty=true
```

CI: `.github/workflows/deploy-cloudflare-pages.yml` — master/main 푸시 시 Node 22 로 빌드 → `root-cloudflare` 에서 `pages deploy dist`  
GitHub 시크릿: `CLOUDFLARE_API_TOKEN`(권한 Account → Cloudflare Pages → Edit), `CLOUDFLARE_ACCOUNT_ID` (값은 채팅·커밋 금지)  
⚠️ 2026-09-28 기준 두 시크릿이 등록돼 있지 않아 이 워크플로는 지금까지 **한 번도 성공하지 못했다**(업로드 단계 `CLOUDFLARE_API_TOKEN` 오류). 등록 전까지는 위 로컬 Wrangler 로 올린다.

### A-3. Pages 에서 API 가 붙는 방식

`root-cloudflare/src/lib/api.js` `getApiBase()`:

- `*.github.io` → `'GITHUB_STATIC'` (API 호출 안 함)
- `*.pages.dev` → 분기 없음 → `''` → 같은 호스트 `/api/...`

프론트 코드는 그대로 두고, Pages Function [`root-cloudflare/functions/api/[[path]].js`](<./root-cloudflare/functions/api/[[path]].js>) 가
그 `/api/*` 요청을 백엔드로 넘긴다.

- 백엔드 주소: Pages 환경변수 `API_ORIGIN` (없으면 `https://hbt-tier.duckdns.org`)
- 방문자 IP: `cf-connecting-ip` 로 `X-Forwarded-For`·`X-Real-IP` 를 덮어씀 (차단 기능이 `x-forwarded-for` 맨 앞 값을 씀)
- 함수가 배포되지 않은 상태면 `/api/...` 가 SPA 폴백 HTML(200)로 돌아온다 → 로그인·게시판 실패

기록: [`RDMD/frontend/09-deploy-path/05-cloudflare-pages-api-proxy-record.md`](./RDMD/frontend/09-deploy-path/05-cloudflare-pages-api-proxy-record.md)

---

## B. Cloudflare Tunnel — 전체 기능 (대안)

PC/VPS에서 `npm start`를 유지하고 Cloudflare가 HTTPS로 붙인다. 도메인 구매는 조건이 아니다. `*.trycloudflare.com` 또는 계정에 이미 있는 존을 쓴다.

### B-1. 로컬에서 앱

```bash
cd backend
copy .env.example .env
```

`backend/.env` 필수:

```
MONGO_URI=
ADMIN_INPUT_ID=
ADMIN_INPUT_PW=
JWT_SECRET=
```

메일 (`backend/utils/mail.js` `sendAppMail()`, 순서 Brevo → Resend → Gmail):

```
BREVO_API_KEY=
BREVO_FROM=
APP_URL=
```

`APP_URL`은 터널 공개 주소. 끝 슬래시 없음.

```bash
cd backend
npm install
npm start
```

- http://localhost:5000/
- http://localhost:5000/health

### B-2. 임시 터널

`npm start`는 두고 다른 터미널:

```bash
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:5000
```

나온 `https://*.trycloudflare.com` 를 `APP_URL`에 넣고 서버를 한 번 재시작한다. 메일 링크는 `backend/utils/appUrl.js` `getAppBaseUrl()`이 이 값을 탄다. 터미널을 끊으면 URL은 사라진다.

### B-3. 고정 터널

Cloudflare MCP에 Tunnel create가 있으면 그걸로 만든다. 없으면 대시보드:

1. https://one.dash.cloudflare.com → Networks → Tunnels → Create → Cloudflared
2. 이름: `human-bug-tier`
3. 설치 명령을 앱이 도는 기계에서 실행
4. Public Hostname: HTTP → `localhost:5000`

Windows 서비스:

```powershell
cloudflared service install
```

### B-4. 확인

1. `https://터널호스트/` → `index.html`
2. `https://터널호스트/health` → `db: connected` (`backend/config/db.js`), 메일 쓰면 `emailConfigured: true` / `emailProvider`에 `brevo`
3. `/admin/admin-login.html` → `ADMIN_INPUT_*` (`backend/controllers/adminController.js` `seedAdmin`)
4. 공지 작성, 가입 또는 비번 찾기

메일 키는 터널을 띄운 기계의 `backend/.env`다. Pages Environment가 아니다.

---

## C. Oracle Cloud VM — 백엔드 (현재 운영)

정본: [`backend/deploy/oracle/README.md`](./backend/deploy/oracle/README.md) · 기록: [`RDMD/backend/07-deploy/03-oracle-cloud-deploy-record.md`](./RDMD/backend/07-deploy/03-oracle-cloud-deploy-record.md)

| 항목 | 값 |
|---|---|
| 주소 | `https://hbt-tier.duckdns.org/` (DuckDNS 무료 도메인, Let's Encrypt) |
| 구조 | nginx 443 → pm2 Node `:5000` (API + `root-cloudflare/dist` 같이 서빙, 로컬 `:5000` 과 동일) |
| 배포 | 레포 루트 Git Bash: `bash backend/deploy/oracle/deploy.sh deploy` (로컬 코드를 묶어 scp — 푸시 불필요) |
| 시크릿 | 서버 `/opt/human-bug-tier/shared/.env` 에만. `APP_URL=https://hbt-tier.duckdns.org` |

- 서버는 한 곳에서만 돌린다(스케줄러). 같은 Atlas DB 로 로컬 `npm start` 를 오래 켜 두지 않는다.
- `http://<VM IP>/` 는 404 (certbot 이후 도메인으로만 받음).

---

## 레거시 Render 파일

따라가지 말 것:

| 파일 | 내용 |
|---|---|
| `DEPLOY.md` | Render 환경변수·Blueprint |
| `render.yaml` | `rootDir: backend`, 정적은 `../root-render` |
| `root-render/` | Render.com 전용 프론트 스냅샷 |
| `README.md` Render 절 | 예전 배포 안내 |

이 파일들을 지우거나 Cloudflare 안내로 바꾸는 작업은 **별도 지시** 후에 한다. 코드(`server.js`)는 건드리지 않는다.

---

## 하지 말 것

- Render 대시보드·`render.yaml`로 다시 올리기
- `backend/server.js`를 Pages Functions / Workers `fetch`로 교체
- `mongoose`를 D1/KV로 교체
- 도메인을 사야 한다고 하기
- Pages Function(`/api` 프록시)이 배포되기 전의 Pages URL을 실서비스처럼 공유하기 (`/api/notices` 가 JSON 인지 먼저 확인)

로컬 정본: `cd backend && npm start`
