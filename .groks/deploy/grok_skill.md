---
name: hbu-deploy
description: >
  Cloudflare Pages 정적 미리보기, Tunnel 풀스택, 레거시 Render/GH Pages,
  환경변수, 배포 경로. 배포·환경 설정 작업 시 사용.
---

# 에이전트 스킬 — 배포 (deploy)

## When

- Cloudflare Pages / Tunnel
- 레거시 Render / GitHub Pages
- 배포 후 API·경로 깨짐
- 환경변수 안내

## Code map

| 경로 | 역할 |
|------|------|
| `CLOUDFLARE.md` | **현재 배포 정본** |
| `DEPLOY.md` / `render.yaml` / `root-render/` | 레거시 Render (정적 프론트) |
| `root-cloudflare/` | Cloudflare Pages · 로컬/Tunnel 프론트 |
| `backend/.env.example` | env 템플릿 |
| `backend/server.js` | 정적+API 통합 (Workers로 이식 금지) |
| `.github/workflows/deploy-cloudflare-pages.yml` | CF Pages CI |
| `.github/workflows/deploy-pages.yml` | GH Pages |
| `root-cloudflare/common.js` | 프론트 환경 분기 |

## Read first

- `CLOUDFLARE.md`
- `RDMD/guides/path-and-api.md`

## Do

1. **풀스택 = `cd backend && npm start` (5000)** + 필요 시 **Cloudflare Tunnel**
2. **Pages `human-bug-tier` = 정적 미리보기만** — `root-cloudflare/`. `backend/`·`.env` 제외
3. Express를 Workers/Pages Functions로 갈아엎지 않음
4. env 안내 시 **이름만**. 값은 `backend/.env`
5. `APP_URL` = 터널 공개 URL (Pages URL 아님)
6. path/API 수정 시 common + auth_api + admin_api 일관성
7. 기존 Render는 방치. 정적 프론트는 `root-render/` 만. `render.yaml`로 다시 올리지 않음
8. `*.pages.dev` → `GITHUB_STATIC` 은 지시 있을 때만 `common.js`

## Do not

- `.env` 내용을 채팅/커밋에 붙이기
- `npx serve -p 5000` 을 프로덕션 대체로 추천
- Pages URL을 실서비스처럼 공유
- GH Pages/Pages에서 로그인·게시판 “배포 완료” 오안내
- mongoose를 D1/KV로 교체

## Agent tasks

### A. 정적 미리보기 (Pages)
1. MCP에 Pages deploy가 없으면 Wrangler
2. 스테이징 폴더 `cf-pages-deploy/` (gitignore)
3. `npx wrangler pages deploy cf-pages-deploy --project-name=human-bug-tier --branch=master`

### B. 풀스택
1. 로컬 `:5000` + Tunnel
2. `APP_URL`을 터널 호스트로

### C. 배포 후 404 / API 실패
1. Pages면 API 없음이 정상
2. Tunnel이면 `getApiBase` 동일 오리진, Mongo, `/health`

## Checklist

- [ ] 로컬 :5000 스모크 안내
- [ ] 필수 env 목록 제시 (값 없이)
- [ ] Pages 정적 vs Tunnel 풀스택 구분
- [ ] 시크릿 미노출
