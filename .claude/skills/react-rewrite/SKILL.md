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

- 바닐라 **0.4.3** — `root-render/` + `backend/` (Render 실무, 정본)
- **React 앵 = `root-cloudflare/`** (Vite+React 18+Router 6). 2026-09-05 지시로
  레이아웃·홈·공지·**공식 티어표**·**커스텀 메이커**·**행운 뽑기** 이식 완료.
  나머지(인증·게시판·마이페이지·문의·알림상세·관리자)는 지시 대기
- 티어표는 한 페이지 + 내부 navbar. 등급별 색 = `tier-board.css` 변수 블록 한 곳
- backend 기본 정적 루트 = `root-cloudflare/dist` (미빌드면 빈 화면)
- **Cloudflare 추가 작업 금지**

## Do

1. 다음 단계는 지시 후 `react-rewrite.md` 순서로, `root-render/` 바닐라와 동작 비교
2. `root-cloudflare/src/` 에서 작업. 바닐라 CSS·클래스명 그대로, 이미지는 `tierImageUrl()`
3. 티어·캐릭터는 `src/data/tiers.js` 하나만 본다. 변경은 `root-render/tier-class` → `npm run extract:tiers`
4. 커스텀 메이커 저장 형식·localStorage 키는 게시판 DB 와 호환 유지
5. `requireAdmin` · SHA-256 재설정 · 토큰 규칙 유지
6. 검증: `npm run build`(root-cloudflare) → `npm start`(backend) → `:5000`

## Do not

- 지시 없이 남은 영역 이식
- 등급별 색·세부등급 하드코딩 (변수 블록·tiers.js 한 곳 유지)
- `root-render/` 바닐라 삭제, Express→Workers, CF CI 재개
- Pages = 풀기능

## Checklist

- [ ] 기획 문서
- [ ] 구현 지시 여부
- [ ] 시크릿 미노출
