---
area: frontend
feature: deploy-path
---

# 루트 프론트를 `root-cloudflare/` · `root-render/` 로 분리

## 개요

레포 루트에 남아 있던 HTML/CSS/JS/이미지/PWA를 배포 전용 폴더로 옮기고 루트에서는 지웠다. md와 `RDMD/`는 루트에 둔다.

| 폴더 | 용도 |
|------|------|
| `root-cloudflare/` | Cloudflare Pages · 로컬 `npm start` · Tunnel |
| `root-render/` | Render.com (`RENDER=true`) |
| 레포 루트 | md, `RDMD/`, `backend/`, 에이전트 스킬, `render.yaml` |

## 서버

`backend/server.js` 기본 정적 루트 = `root-cloudflare/`. Render만 `root-render/`.

## 날짜

2026-09-01
