---
name: deploy
description: >
  Oracle Cloud 백엔드, Cloudflare Pages(/api 프록시), Tunnel 대안, 레거시 Render/GH Pages,
  env, 배포 경로. Use when /deploy.
---

# Claude 스킬 — 배포

## When

- Oracle Cloud 서버, Cloudflare Pages / Tunnel, 레거시 Render·GH Pages, env, 배포 후 404·API 실패

## Code map

- **`CLOUDFLARE.md`** — 현재 배포 정본
- `DEPLOY.md`, `render.yaml`, `root-render/` — 레거시 Render
- `backend/deploy/oracle/` — Oracle Cloud 배포 스크립트·가이드 (현재 운영 서버)
- `root-cloudflare/` — Cloudflare · 로컬 프론트 (배포는 빌드 결과 `dist/`)
- `root-cloudflare/functions/api/[[path]].js` — Pages `/api/*` → Oracle 프록시
- `backend/.env.example`, `backend/server.js`
- `.github/workflows/deploy-cloudflare-pages.yml` — 빌드 후 `pages deploy dist`
- `root-cloudflare/src/lib/api.js` getApiBase

## Read first

- `CLOUDFLARE.md` (상단 2026-09-28 운영 구조 · C절 Oracle)
- `backend/deploy/oracle/README.md`
- `RDMD/features/react-rewrite.md`

## 현재 (2026-09-19 창시자 지시)

✅ **프론트 작업은 `root-cloudflare/`(React)에만.**  
⛔ **`root-render/` 는 베타 버전에서 업데이트 종료 — 수정 금지**(보관용).  
단 Cloudflare **배포 인프라**(Pages/CI/Wrangler)만 지시 대기 — 코드 작업과 혼동 금지.

## 2026-09-28 — 현재 운영 구조

- 백엔드 = **Oracle Cloud VM** `https://hbt-tier.duckdns.org` (nginx 443 Let's Encrypt → pm2 Node :5000, API + dist 같이 서빙).
  배포: 레포 루트 Git Bash `bash backend/deploy/oracle/deploy.sh deploy` — 가이드 `backend/deploy/oracle/README.md`
- Cloudflare Pages `human-bug-tier` = React 빌드본 `dist/` + Pages Function `root-cloudflare/functions/api/[[path]].js` 가 `/api/*` 를 Oracle 로 프록시
  (백엔드 주소 Pages 환경변수 `API_ORIGIN`, 기본 `https://hbt-tier.duckdns.org`). 이 연결은 2026-09-28 창시자 지시로 구성했다.
- ⚠️ GitHub 시크릿 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 미등록 → Pages 워크플로 업로드 단계 실패 중. 등록 전엔 `root-cloudflare` 에서 로컬 Wrangler 로 `pages deploy dist`

## Do

1. 풀스택 운영 = Oracle VM (`deploy.sh deploy`). 로컬은 `cd backend && npm start` (포트 5000). Tunnel 은 대안
2. Pages `human-bug-tier` = `root-cloudflare/dist/` + `functions/`(`/api` 프록시), `backend/` 제외
3. Express → Workers 이식 금지 (Pages Function 은 프록시만)
4. env는 키 이름만. 값은 `backend/.env`
5. APP_URL = 백엔드 공개 URL (현재 `https://hbt-tier.duckdns.org`, Pages URL 아님)
6. path/API 수정은 `src/lib/api.js` 단일 소스에서
7. Render로 재배포하지 않음 (기존은 방치). `root-render/` 도 고치지 않음

## Do not

- **`root-render/` 수정** (베타 종료 — 2026-09-19 지시)
- **`npm run sync:render` 실행** (React 수정을 바닐라 구본으로 덮어씁)
- 위 2026-09-28 구성 밖의 Cloudflare Pages/CI/시크릿/Wrangler 변경을 지시 없이 하기
- `.env` 내용 채팅/커밋
- serve -p 5000 을 프로덕션 대체 추천
- GH Pages 에서 로그인·게시판 “배포 완료” 오안내 / Pages 는 `/api/notices` JSON 확인 후에만 안내
- 같은 Atlas DB 로 로컬 서버를 Oracle 과 동시에 오래 켜 두기 (스케줄러 중복)
- server.js를 Workers fetch로 교체

## Tasks

**A. 문서/설정** — CLOUDFLARE.md · Pages 워크플로  
**B. Pages** — `root-cloudflare` 에서 빌드 → `wrangler pages deploy dist`(functions 포함), backend 제외  
**C. 풀스택** — Oracle `deploy.sh deploy` (대안: Tunnel) + APP_URL  
**D. 메일 링크** — APP_URL, appUrl.js  

## Checklist

- [ ] :5000 스모크 안내
- [ ] 필수 env 목록 (값 없이)
- [ ] Oracle(백엔드) vs Pages(dist + `/api` 프록시) 구분
- [ ] 시크릿 미노출
