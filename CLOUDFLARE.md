# Cloudflare 배포 가이드

> **2026-09-01**: Cloudflare **추가 작업은 일단 하지 않는다.**  
> 정식 버전은 나중에 React로 다시 만들 예정 — [`RDMD/features/react-rewrite.md`](./RDMD/features/react-rewrite.md).  
> 이미 올린 Pages 미리보기·이 문서·`root-cloudflare/`는 유지한다. 창시자가 배포를 다시 시키기 전에는 CI/시크릿/Wrangler를 손대지 말 것.

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
| 정적 파일 | 로컬/Tunnel: `root-cloudflare/`. Render.com: `root-render/` (`RENDER=true`) |
| API | `/api/auth`, `/api/notices`, `/api/tierlists`, `/api/inquiries`, `/api/admin`, `/api/notifications`, `/api/luck-draw` |
| 진단 | `GET /health` — `emailConfigured`, `emailProvider`, `db` |
| 프론트 API 베이스 | `root-cloudflare/common.js` `getApiBase()` — 같은 원리면 `''` |

Pages / Workers 런타임에는 `express` + `mongoose` + `nodemailer` + `backend/utils/youtubeCommunitySync.js` 가 그대로 안 올라간다.

| 경로 | 결과 | 로그인·게시판·메일 |
|---|---|---|
| A. Pages 정적 | HTML 미리보기 | 안 됨 |
| B. Tunnel + `npm start` | 전체 기능 | 됨. 앱 코드 변경 없음 |
| Workers로 Express 이식 | 하지 않음 | — |

---

## VS Code MCP로 하는 순서

1. VS Code 에이전트에게 이 파일(`CLOUDFLARE.md`)을 기준으로 배포하라고 한다.
2. GitHub MCP로 `nomura-kanziro/human-bug-tier` 현재 브랜치(`main` 또는 `master`)를 확인한다.
3. Cloudflare MCP가 있으면
   - Pages 프로젝트 목록
   - 없으면 `human-bug-tier` 프로젝트 생성
   - **정적 미리보기만** Pages에 배포 (`root-cloudflare/`, `backend/` 제외)
4. 전체 기능이 필요하면 Pages로 Express를 올리지 말고, 로컬/VPS에서 `npm start` 후 Tunnel(B)을 쓴다.
5. `.env` 값(`MONGO_URI`, `ADMIN_INPUT_*`, `BREVO_*`)은 MCP 채팅에 붙여 넣지 않는다. `backend/.env`에만 둔다.

MCP로 **할 수 있는 것**

- GitHub: 이 md 커밋, 워크플로 파일 추가 (write 권한 있을 때)
- Cloudflare MCP: Pages 프로젝트 생성·정적 배포·프로젝트 조회

MCP로 **안 되는 것** (기계 셸)

- `cd backend && npm start`
- `cloudflared tunnel --url http://localhost:5000`
- Atlas `MONGO_URI` / Brevo 키를 서버 프로세스에 주입

---

## A. Cloudflare Pages — 정적 미리보기

`.github/workflows/deploy-pages.yml` 과 같은 목적. `backend/` 제외.

현재 프로젝트: `human-bug-tier`  
Production branch: `master`  
미리보기 URL: `https://human-bug-tier.pages.dev/`

정적 소스: `root-cloudflare/` (레포 루트에 프론트를 두지 않음)

### A-1. MCP (우선)

Cloudflare MCP 도구가 VS Code에 보이면 그걸로 한다.

- 프로젝트 이름: `human-bug-tier`
- Production branch: `main` (없으면 `master`)
- Build command: 비움
- Output directory: `root-cloudflare`
- 제외: `backend/`, `node_modules/`, `.env`, `backend/.env`, `.git/`, `root-render/`, `RDMD/`

Grok에 연결된 Cloudflare MCP가 **Observability만** 있으면 Pages 생성·배포 도구가 없다. 그때는 A-2 Wrangler를 쓴다.

### A-2. MCP에 Pages deploy가 없을 때만 Wrangler

레포 루트, VS Code 터미널. `backend/`·`.env`가 올라가지 않게 **스테이징 폴더**를 쓴다.

```bash
npx wrangler pages project create human-bug-tier --production-branch=master
npx wrangler pages deploy root-cloudflare --project-name=human-bug-tier --branch=master --commit-dirty=true
```

CI: `.github/workflows/deploy-cloudflare-pages.yml`  
GitHub 시크릿: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (값은 채팅·커밋 금지)

### A-3. Pages만 올리면 깨지는 이유

`root-cloudflare/common.js` `getApiBase()`:

- `*.github.io` → `'GITHUB_STATIC'` (API 호출 안 함)
- `*.pages.dev` → 분기 없음 → 같은 호스트 `/api/...` → 404

고치는 코드 변경(`pages.dev` 분기)은 지시 있을 때만 `root-cloudflare/common.js`에서 한다.

---

## B. Cloudflare Tunnel — 전체 기능

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
- Pages URL을 실서비스처럼 공유하기

로컬 정본: `cd backend && npm start`
