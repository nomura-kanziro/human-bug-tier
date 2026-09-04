# root-render — Render.com 전용 프론트

이 폴더는 **Render.com**이 서빙하는 정적 프론트다.  
여기서 `npm start` 하지 않는다. 서버는 항상 `backend/`에서 켠다.

| 환경 | 정적 루트 |
|------|-----------|
| 로컬 `npm start` / Cloudflare Tunnel | `root-cloudflare/` |
| Render.com (`RENDER=true`) | 이 폴더 (`root-render/`) |

`backend/server.js`가 `RENDER=true`이면 여기만 연다.

## 로컬에서 Render 프론트 확인

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

→ http://localhost:5000/

종료 후 기본 Cloudflare 프론트로 돌아가려면 터미널을 닫거나 `$env:STATIC_ROOT`를 지운 뒤 다시 `npm start`.

## Render.com에서 실행

1. 레포를 Render에 연결 (`render.yaml`, rootDir = `backend`)
2. 환경변수는 대시보드에만 넣는다. 키 이름: `MONGO_URI`, `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW` 등 — 값은 README에 적지 않는다.
3. Render가 `RENDER=true`를 넣으면 이 폴더가 정적 루트다.
4. 확인: `https://<서비스>.onrender.com/` 과 `/health`

포함: `index.html`, `common.js`, 티어/커스텀/공지/로그인/관리자/마이페이지/행운뽑기/알림, `tier-media/`, PWA.

제외: `backend/`, `.env`, RDMD, 에이전트 스킬.

`root-cloudflare/`를 고쳐도 Render는 여기가 갱신되기 전까지 예전 화면을 유지한다.
