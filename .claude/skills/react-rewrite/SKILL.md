---
name: react-rewrite
description: >
  정식 버전 React 이식. 바닐라 기능 100% 반영 완료, 배포 전환은 지시 대기.
  Use when React rewrite, 정식 버전, 리액트 이식.
---

# Claude 스킬 — React 정식 버전 (`root-cloudflare/`)

## When

- React / 리액트 / Next / 정식 버전 프론트 개편, React 쪽 기능 추가·수정

## Read first

- `RDMD/features/react-rewrite.md`
- `.agents/react-rewrite/skill.md` (정본)
- `root-cloudflare/README.md` — 라우트 표 · 바닐라↔React 대응 표
- `RDMD/frontend/12-react/03-react-parity-complete-record.md`

## 현재

- 바닐라 **0.5.0** — `root-render/` + `backend/` (Render 실무, 정본)
- **React 앱 = `root-cloudflare/`** (Vite+React 18+Router 6).
  **바닐라 기능 100% 반영 완료** (2026-09-17) — 홈·티어·공지·커스텀 메이커(꾸미기)·
  행운 뽑기·인증·게시판(본인 글 수정 포함)·마이페이지·알림·문의·관리자
- 남은 건 **8단계 배포뿐** — 창시자 지시 전까지 React 를 실무 배포로 전환하지 않는다
- 티어표는 한 페이지 + 내부 navbar. 등급별 색 = `tier-board.css` 변수 블록 한 곳
- backend 기본 정적 루트 = `root-cloudflare/dist` (미빌드면 빈 화면)
- **Cloudflare 추가 작업 금지**

## Do

1. 바닐라 CSS·티어 데이터·`tier-media` 가 바뀌면 **`npm run sync:render`** 를 먼저 돌린다 (손으로 복사 금지)
2. React 전용 스타일은 **`src/styles/react-extra.css`** 에만. 나머지 `src/styles/*.css` 는 동기화 산출물
3. 티어·캐릭터는 `src/data/tiers.js` 하나만 본다. 변경은 `root-render/tier-class` → `npm run extract:tiers`
4. API 는 `lib/api.js` 만 — 유저 `apiRequest`, 관리자 `adminRequest`. 이미지는 `tierImageUrl()`
5. 커스텀 메이커 저장 형식·localStorage 키는 게시판 DB 와 호환 유지.
   수정 모드(`editId`)에서는 localStorage 저장하지 않는다
6. `requireAdmin` · SHA-256 재설정 · 토큰 규칙 유지 (프론트 가드는 UX 용)
7. 검증: `npm run build`(root-cloudflare) → `npm start`(backend) → `:5000`

## Do not

- 지시 없이 React 를 실무 배포로 전환
- `src/styles/*.css`(동기화 산출물) 직접 수정
- 등급별 색·세부등급 하드코딩 (변수 블록·tiers.js 한 곳 유지)
- `root-render/` 바닐라 삭제, Express→Workers, CF CI 재개
- Pages = 풀기능

## Checklist

- [ ] 바닐라 변경이면 `sync:render` 먼저
- [ ] 새 스타일은 `react-extra.css`
- [ ] `npm run build` 경고 0 + `:5000` 수동 확인
- [ ] 시크릿 미노출
