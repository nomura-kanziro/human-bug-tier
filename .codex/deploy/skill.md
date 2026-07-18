---
name: deploy
description: >
  Render.com, GitHub Pages, render.yaml, DEPLOY.md, 환경변수.
  Codex: deployment.
---

# Codex 스킬 — 배포

## When

- Render / GH Pages, env, 배포 후 404·API 실패

## Code map

- `DEPLOY.md`, `render.yaml`, `backend/.env.example`
- `backend/server.js`, `.github/workflows/deploy-pages.yml`
- `common.js` getBasePath / getApiBase

## Read first

- `DEPLOY.md`
- `RDMD/guides/deploy-checklist.md`
- `RDMD/guides/path-and-api.md`

## Do

1. 풀스택 = **Render** (rootDir backend + Mongo)
2. GH Pages = **정적 미리보기만**
3. 로컬 검증: backend `:5000`
4. env는 **키 이름만** 안내
5. APP_URL 배포 URL (메일)
6. path/API 수정 시 common + auth_api + admin_api 일치
7. render.yaml build/start/rootDir 일치

## Do not

- `.env` 내용 채팅/커밋
- serve -p 5000 을 프로덕션 대체 추천
- GH Pages에서 로그인·게시판 “배포 완료” 오안내

## Checklist

- [ ] :5000 스모크 안내
- [ ] 필수 env 목록 (값 없이)
- [ ] Render vs Pages 구분
