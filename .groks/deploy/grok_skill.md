---
name: hbu-deploy
description: >
  Oracle Cloud 백엔드, Cloudflare Pages(/api 프록시), Tunnel 대안, 레거시 Render/GH Pages,
  환경변수, 배포 경로. 배포·환경 설정 작업 시 사용.
---

# 에이전트 스킬 — 배포 (deploy)

## When

- Oracle Cloud 서버 (현재 운영)
- Cloudflare Pages / Tunnel
- 레거시 Render / GitHub Pages
- 배포 후 API·경로 깨짐
- 환경변수 안내

## Code map

| 경로 | 역할 |
|------|------|
| `CLOUDFLARE.md` | **현재 배포 정본** |
| `DEPLOY.md` / `render.yaml` / `root-render/` | 레거시 Render (정적 프론트) |
| `backend/deploy/oracle/` | Oracle Cloud 배포 스크립트·가이드 (현재 운영 서버) |
| `root-cloudflare/` | Cloudflare Pages · 로컬/Tunnel 프론트 (배포는 빌드 결과 `dist/`) |
| `root-cloudflare/functions/api/[[path]].js` | Pages `/api/*` → Oracle 프록시 |
| `backend/.env.example` | env 템플릿 |
| `backend/server.js` | 정적+API 통합 (Workers로 이식 금지) |
| `.github/workflows/deploy-cloudflare-pages.yml` | CF Pages CI (빌드 후 `pages deploy dist`) |
| `.github/workflows/deploy-pages.yml` | GH Pages |
| `root-cloudflare/src/lib/api.js` | 프론트 환경 분기 (`getApiBase`) |

## Read first

- `CLOUDFLARE.md` (상단 2026-09-28 운영 구조 · C절 Oracle)
- `backend/deploy/oracle/README.md`
- `RDMD/features/react-rewrite.md`

## 현재

✅ **프론트 작업은 `root-cloudflare/`(React)에만.** ⛔ **`root-render/` 는 베타 종료 — 수정 금지.**  
⛔ `npm run sync:render` 금지. Cloudflare **배포 인프라**만 지시 대기(코드 작업과 별개). (2026-09-19 지시)

## 2026-09-28 — 현재 운영 구조

- 백엔드 = **Oracle Cloud VM** `https://hbt-tier.duckdns.org` (nginx 443 Let's Encrypt → pm2 Node :5000, API + dist 같이 서빙).
  배포: 레포 루트 Git Bash `bash backend/deploy/oracle/deploy.sh deploy` — 가이드 `backend/deploy/oracle/README.md`
- Cloudflare Pages `human-bug-tier` = React 빌드본 `dist/` + Pages Function `root-cloudflare/functions/api/[[path]].js` 가 `/api/*` 를 Oracle 로 프록시
  (백엔드 주소 Pages 환경변수 `API_ORIGIN`, 기본 `https://hbt-tier.duckdns.org`). 이 연결은 2026-09-28 창시자 지시로 구성했다.
- ⚠️ GitHub 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 미등록 → Pages 워크플로 업로드 단계 실패 중. 등록 전엔 `root-cloudflare` 에서 로컬 Wrangler 로 `pages deploy dist`

## Do

1. **풀스택 운영 = Oracle VM** (`deploy.sh deploy`). 로컬은 `cd backend && npm start` (5000). Tunnel 은 대안
2. **Pages `human-bug-tier` = `root-cloudflare/dist/` + `functions/`(`/api` 프록시)**. `backend/`·`.env` 제외
3. Express를 Workers/Pages Functions로 갈아엎지 않음 (Pages Function 은 프록시만)
4. env 안내 시 **이름만**. 값은 `backend/.env`
5. `APP_URL` = 백엔드 공개 URL (현재 `https://hbt-tier.duckdns.org`, Pages URL 아님)
6. path/API 수정은 `root-cloudflare/src/lib/api.js` 단일 소스에서
7. 기존 Render는 방치. 정적 프론트는 `root-render/` 만. `render.yaml`로 다시 올리지 않음
8. `*.pages.dev` 는 `getApiBase()` 분기 없이 `''` — `/api` 는 Pages Function 이 Oracle 로 넘김 (프론트 코드에 `pages.dev` 분기 넣지 않음)

## Do not

- 위 2026-09-28 구성 밖의 Cloudflare Pages/CI/Wrangler 변경을 지시 없이 하기
- `.env` 내용을 채팅/커밋에 붙이기
- `npx serve -p 5000` 을 프로덕션 대체로 추천
- `/api` 프록시 배포 확인(`/api/notices` 가 JSON) 전에 Pages URL을 실서비스처럼 공유
- 같은 Atlas DB 로 로컬 서버를 Oracle 과 동시에 오래 켜 두기 (스케줄러 중복)
- GH Pages 에서 로그인·게시판 “배포 완료” 오안내
- mongoose를 D1/KV로 교체

## Agent tasks

### A. Pages (dist + `/api` 프록시)
1. MCP에 Pages deploy가 없으면 Wrangler
2. `cd root-cloudflare && npm ci && npm run build`
3. `root-cloudflare` 안에서 `npx wrangler pages deploy dist --project-name=human-bug-tier --branch=master` (여기서 실행해야 `functions/` 가 같이 올라감)

### B. 풀스택
1. Oracle: 레포 루트 `bash backend/deploy/oracle/deploy.sh deploy` (가이드 `backend/deploy/oracle/README.md`)
2. 대안: 로컬 `:5000` + Tunnel, `APP_URL`을 터널 호스트로

### C. 배포 후 404 / API 실패
1. Pages 에서 `/api/notices` 가 HTML 이면 Pages Function 미배포 (CI 시크릿·워크플로 확인)
2. Oracle 이면 `deploy.sh status`·`logs`, Mongo, `https://hbt-tier.duckdns.org/health`

## Checklist

- [ ] 로컬 :5000 스모크 안내
- [ ] 필수 env 목록 제시 (값 없이)
- [ ] Oracle(백엔드) vs Pages(dist + `/api` 프록시) 구분
- [ ] 시크릿 미노출
