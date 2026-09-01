---
name: deploy
description: >
  Cloudflare Pages 정적 미리보기, Tunnel 풀스택, 레거시 Render/GH Pages,
  env, 배포 경로. Use when /deploy.
---

# Claude 스킬 — 배포

## When

- Cloudflare Pages / Tunnel, 레거시 Render·GH Pages, env, 배포 후 404·API 실패

## Code map

- **`CLOUDFLARE.md`** — 현재 배포 정본
- `DEPLOY.md`, `render.yaml`, `root-render/` — 레거시 Render
- `root-cloudflare/` — Cloudflare · 로컬 프론트
- `backend/.env.example`, `backend/server.js`
- `.github/workflows/deploy-cloudflare-pages.yml`
- `root-cloudflare/common.js` getBasePath / getApiBase

## Read first

- `CLOUDFLARE.md`
- `RDMD/guides/path-and-api.md`

## Do

1. 풀스택 = `cd backend && npm start` (포트 5000) + 필요 시 Cloudflare Tunnel
2. Pages `human-bug-tier` = 정적 미리보기만 (`root-cloudflare/`, `backend/` 제외)
3. Express → Workers 이식 금지
4. env는 키 이름만. 값은 `backend/.env`
5. APP_URL = 터널/API 호스트 (Pages URL 아님)
6. path/API 수정 시 common + auth_api + admin_api 일치
7. Render로 재배포하지 않음 (기존은 방치). Render 정적은 `root-render/`
8. `pages.dev` GITHUB_STATIC 분기는 지시 있을 때만

## Do not

- `.env` 내용 채팅/커밋
- serve -p 5000 을 프로덕션 대체 추천
- Pages/GH Pages에서 로그인·게시판 “배포 완료” 오안내
- server.js를 Workers fetch로 교체

## Tasks

**A. 문서/설정** — CLOUDFLARE.md · Pages 워크플로  
**B. 정적 미리보기** — wrangler pages, `root-cloudflare/`, backend 제외  
**C. 풀스택** — Tunnel + APP_URL  
**D. 메일 링크** — APP_URL, appUrl.js  

## Checklist

- [ ] :5000 스모크 안내
- [ ] 필수 env 목록 (값 없이)
- [ ] Pages vs Tunnel 구분
- [ ] 시크릿 미노출
