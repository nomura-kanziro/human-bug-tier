---
name: deploy
description: >
  Cloudflare Pages 정적 미리보기, Tunnel 풀스택, 레거시 Render/GH Pages.
  Canonical for ANY AI. Use when /deploy.
---

# 공통 스킬 — 배포

## When

- Cloudflare Pages / Tunnel, 레거시 Render·GH Pages, env, 배포 후 404·API 실패

## Code map

- **`CLOUDFLARE.md`** — 현재 배포 정본
- `DEPLOY.md`, `render.yaml`, `root-render/` — 레거시 Render
- `root-cloudflare/` — Cloudflare Pages · 로컬/Tunnel 프론트
- `backend/.env.example`, `backend/server.js`
- `.github/workflows/deploy-cloudflare-pages.yml`
- `.github/workflows/deploy-pages.yml` — GH Pages 정적
- `root-cloudflare/common.js` getBasePath / getApiBase

## Read first

- `CLOUDFLARE.md` (상단: **추가 작업 중지**)
- `RDMD/guides/path-and-api.md`
- `RDMD/features/react-rewrite.md`

## 현재 (2026-09-19 창시자 지시 — 최신)

✅ **프론트 작업은 `root-cloudflare/`(React)에만.**  
⛔ **`root-render/` 는 베타 버전에서 업데이트 종료 — 수정 금지**(보관용).  
단, Cloudflare **배포 인프라**(Pages/CI/Wrangler/시크릿)를 새로 구성하는 것은 여전히 별도 지시 후 —
**금지된 건 배포 작업이지 `root-cloudflare/` 코드 작업이 아니다.**

## Do

1. 풀스택 = 로컬/VPS `cd backend && npm start` (포트 **5000**) + 필요 시 **Cloudflare Tunnel**
2. Cloudflare Pages `human-bug-tier` = **정적 미리보기만** (`root-cloudflare/dist/`, `backend/`·`.env` 제외)
3. Express를 Workers/Pages Functions로 이식하지 않음
4. env는 **키 이름만** 안내. 값은 `backend/.env` only
5. `APP_URL` = 터널(또는 실제 API 호스트) 공개 URL. Pages URL 아님
6. path/API 수정 시 `src/lib/api.js` 단일 소스 유지
7. **지금 손대는 프론트는 `root-cloudflare/`만.** Render 대시보드 env·서비스는 창시자가 관리

## Do not

- **`root-render/` 수정** (베타 종료 — 2026-09-19 지시)
- **`npm run sync:render` 실행** (React 수정을 바닐라 구본으로 덮어씁)
- (현재) Cloudflare Pages/CI/시크릿/Wrangler를 **새로** 손대기 — 창시자가 재개하기 전

- `.env` 내용 채팅/커밋
- Pages URL을 실서비스(로그인·게시판)처럼 공유
- `serve -p 5000` 을 프로덕션 대체 추천
- GH Pages / Pages에서 로그인·게시판 “배포 완료” 오안내
- `server.js`를 Workers `fetch`로 교체, mongoose → D1/KV

## Checklist

- [ ] :5000 스모크 안내
- [ ] 필수 env 목록 (값 없이)
- [ ] Pages 정적 vs Tunnel 풀스택 구분
- [ ] 시크릿 미노출
