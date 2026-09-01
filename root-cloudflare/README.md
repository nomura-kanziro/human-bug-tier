# root-cloudflare — Cloudflare / 로컬 프론트

이 폴더는 **Cloudflare Pages**와 로컬·Tunnel이 서빙하는 정적 프론트다.  
여기서 `npm start` 하지 않는다. 서버는 항상 `backend/`에서 켠다.

| 환경 | 정적 루트 |
|------|-----------|
| 로컬 `npm start` / Cloudflare Tunnel | 이 폴더 (`root-cloudflare/`) |
| Cloudflare Pages | 이 폴더를 그대로 배포 |
| Render.com (`RENDER=true`) | `root-render/` |

## 로컬에서 실행 (프론트 + API)

레포 루트가 아니라 `backend`으로 간다.

```bash
cd backend
npm install
npm start
```

→ http://localhost:5000/

기본이 이 폴더다. `STATIC_ROOT`를 안 넣으면 `backend/server.js`가 `../root-cloudflare`를 연다.

로그인·게시판·공지는 Mongo가 붙은 이 서버에서만 된다.

## Cloudflare Pages에 올리기 · 확인

정적 미리보기만. `/api` 없음.

```bash
npx wrangler pages deploy root-cloudflare --project-name=human-bug-tier --branch=master --commit-dirty=true
```

- 사이트: https://human-bug-tier.pages.dev/
- 대시보드: Workers & Pages → `human-bug-tier`
- 배포 목록: `npx wrangler pages deployment list --project-name=human-bug-tier`

포함: `index.html`, `common.js`, 티어/커스텀/공지/로그인/관리자/마이페이지/행운뽑기/알림, `tier-image/`, PWA.

제외: `backend/`, `.env`, RDMD, 루트 md, 에이전트 스킬.

이 폴더를 고쳐도 Render(`root-render/`)는 자동으로 안 바뀐다.
