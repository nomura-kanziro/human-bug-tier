---
name: react-rewrite
description: >
  정식 버전 React 이식 기획. 바닐라 유지, Cloudflare 작업 중지.
  Use when React rewrite, 정식 버전, 리액트 이식.
---

# Claude 스킬 — React 정식 버전 (기획만)

## When

- React / 리액트 / Next / 정식 버전 프론트 개편

## Read first

- `RDMD/features/react-rewrite.md`
- `.agents/react-rewrite/skill.md` (정본)
- `RDMD/features/overview.md`

## 현재

- 바닐라 **0.4.1** — `root-cloudflare/` · `root-render/` + `backend/`
- **Cloudflare 추가 작업 금지**
- React **구현은 창시자 지시 전 금지**

## Do

1. 기획·패리티만 안내
2. 지시 후에만 단계적 이식, 바닐라와 동작 비교
3. `requireAdmin` · SHA-256 재설정 · 토큰 규칙 유지

## Do not

- 지시 없이 Vite/Next/CRA 스캐폴드
- 바닐라 삭제, Express→Workers, CF CI 재개
- Pages = 풀기능

## Checklist

- [ ] 기획 문서
- [ ] 구현 지시 여부
- [ ] 시크릿 미노출
