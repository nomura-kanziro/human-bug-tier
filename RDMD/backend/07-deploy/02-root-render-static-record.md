---
area: backend
feature: deploy
---

# Render.com 전용 프론트 `root-render/`

## 개요

레포 루트 프론트는 Cloudflare / 로컬용으로 두고, Render.com이 서빙하는 HTML·CSS·JS·이미지를 `root-render/`로 분리했다. `backend/server.js`는 `RENDER=true`이면 `../root-render`만 연다.

## 파일

- `root-render/` — Render 전용 정적 스냅샷 (backend/.env 제외)
- `backend/server.js` — `resolveStaticRoot()`
- `render.yaml` — 주석 갱신
- `DEPLOY.md`, `CLOUDFLARE.md`, 배포 스킬

## 동작

| 조건 | 정적 루트 |
|------|-----------|
| 로컬 `npm start` | 레포 루트 |
| `RENDER=true` | `root-render/` |
| `STATIC_ROOT=root-render` | `root-render/` (로컬 검증) |

루트 프론트를 고쳐도 Render는 `root-render/`를 다시 맞추기 전까지 예전 화면이다.

셸/호스트의 `PORT` · `STATIC_ROOT` · `RENDER`는 `backend/.env`보다 우선한다. Render가 넣는 `PORT`와 로컬 `STATIC_ROOT=root-render` 검증이 파일 값에 덮이지 않게 했다.

## 테스트

```bash
cd backend
set STATIC_ROOT=root-render
npm start
```

- `http://localhost:5000/` — index
- `http://localhost:5000/.render-frontend` — `root-render`
- `http://localhost:5000/health` — API 그대로

## 날짜

2026-09-01
