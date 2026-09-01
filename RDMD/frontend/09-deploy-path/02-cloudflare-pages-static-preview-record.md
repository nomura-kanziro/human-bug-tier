---
area: frontend
feature: deploy-path
---

# Cloudflare Pages 정적 미리보기

## 개요

Render.com 배포는 방치하고, Cloudflare Pages 프로젝트 `human-bug-tier`에 **프론트 정적 파일만** 올렸다. Express/`backend/`은 올리지 않는다. 로그인·게시판·메일은 Pages에서 동작하지 않는다.

## 파일

- `CLOUDFLARE.md` — 배포 정본
- `.github/workflows/deploy-cloudflare-pages.yml` — master/main 푸시 시 Pages 재배포 (GitHub 시크릿 필요)
- `.gitignore` — `cf-pages-deploy/`
- `.agents/deploy/skill.md` 및 Claude/Grok/Codex 배포 스킬

## 구현

1. Wrangler로 Pages 프로젝트 생성 (`production-branch=master`)
2. `cf-pages-deploy/`에 프론트만 복사 (`backend/`, `node_modules/`, `.env` 제외)
3. `npx wrangler pages deploy cf-pages-deploy --project-name=human-bug-tier --branch=master`

포함: `index.html`, `common.js`, 티어/커스텀/공지/로그인/관리자/마이페이지/행운뽑기/알림, `tier-image/`, PWA.

## 확인

- `https://human-bug-tier.pages.dev/` — 메인 HTML
- `https://human-bug-tier.pages.dev/tier-class/tier1.html` — 1티어
- `https://human-bug-tier.pages.dev/custom-maker/custom-maker.html`
- `/health`, `/api/notices` — API JSON 없음 (Pages가 HTML 폴백). 정적 미리보기 한계

`common.js` `getApiBase()`의 `pages.dev` 분기는 지시 전까지 넣지 않음.

## 날짜

2026-09-01
