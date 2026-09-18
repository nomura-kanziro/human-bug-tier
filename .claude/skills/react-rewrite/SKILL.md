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

## 현재 (2026-09-19 창시자 지시)

- ✅ **`root-cloudflare/`(React)가 유일한 작업 대상** — 모든 신규 기능·버그수정을 여기서만
- ⛔ **`root-render/`(바닐라)는 베타 종료 — 수정 금지**(보관용)
- ⛔ **`npm run sync:render` 금지** — 돌리면 `src/styles/*.css` 가 바닐라 구본으로 덮어쓰임.
  이제 `src/styles/*.css` 도 직접 고쳐도 된다
- **바닐라 기능 100% 반영 완료** (2026-09-17) — 홈·티어·공지·커스텀 메이커(꾸미기)·
  행운 뽑기·인증·게시판(본인 글 수정 포함)·마이페이지·알림·문의·관리자
- 티어표는 한 페이지 + 내부 navbar. 등급별 색 = `tier-board.css` 변수 블록 한 곳
- backend 기본 정적 루트 = `root-cloudflare/dist` (미빌드면 빈 화면)
- Cloudflare **배포 인프라**만 지시 대기 (코드 작업과 별개)

## Do

1. **React 가 정본.** 바닐라는 참고만 하고 고치거나 동기화하지 않는다
2. 스타일은 `src/styles/` 에서 직접 수정. React 전용 규칙은 `react-extra.css` 에 모으면 추적이 쉽다
3. 티어·캐릭터는 `src/data/tiers.js` 하나만 본다 (하드코딩 금지)
4. API 는 `lib/api.js` 만 — 유저 `apiRequest`, 관리자 `adminRequest`. 이미지는 `tierImageUrl()`
5. 커스텀 메이커 저장 형식·localStorage 키는 게시판 DB 와 호환 유지.
   수정 모드(`editId`)에서는 localStorage 저장하지 않는다
6. `requireAdmin` · SHA-256 재설정 · 토큰 규칙 유지 (프론트 가드는 UX 용)
7. 검증: `npm run build`(root-cloudflare) → `npm start`(backend) → `:5000`

## Do not

- **`root-render/` 수정** (베타 종료 — 참고만)
- **`npm run sync:render` 실행**
- 등급별 색·세부등급 하드코딩 (변수 블록·tiers.js 한 곳 유지)
- Express→Workers, CF **배포** CI 재개
- Pages = 풀기능

## Checklist

- [ ] 바닐라 변경이면 `sync:render` 먼저
- [ ] 새 스타일은 `react-extra.css`
- [ ] `npm run build` 경고 0 + `:5000` 수동 확인
- [ ] 시크릿 미노출
