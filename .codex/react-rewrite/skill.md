---
name: react-rewrite
description: >
  정식 버전 React 이식. 바닐라 기능 100% 반영 완료, 배포 전환은 지시 대기.
  Codex: react app maintenance.
---

# Codex 스킬 — React 정식 버전 (`root-cloudflare/`)

## When

- React / 정식 버전 / 리액트 이식, React 쪽 기능 추가·수정

## Read first

- `RDMD/features/react-rewrite.md`
- `.agents/react-rewrite/skill.md` (정본)
- `root-cloudflare/README.md`

## 현재

바닐라 **0.5.0**(`root-render/`, Render 실무 정본) 기능이 React(`root-cloudflare/`)에 **100% 반영 완료**.
남은 건 8단계 배포뿐 — React 실무 배포 전환은 창시자 지시 후. CF 작업 중지.

## Do

1. 바닐라 CSS·티어 데이터·`tier-media` 변경 시 **`npm run sync:render`** 먼저 (손 복사 금지)
2. React 전용 스타일은 **`src/styles/react-extra.css`** 에만 (나머지는 동기화 산출물)
3. 티어 데이터는 `src/data/tiers.js` 하나 — 변경은 `root-render/tier-class` → `npm run extract:tiers`
4. API 는 `lib/api.js` — 유저 `apiRequest`, 관리자 `adminRequest`. 이미지는 `tierImageUrl()`
5. `requireAdmin`·SHA-256 재설정·토큰 규칙 유지 (프론트 가드는 UX 용)
6. 검증: `npm run build`(root-cloudflare) → `npm start`(backend) → `:5000`

## Do not

지시 없이 React 실무 배포 전환, `src/styles/*.css` 직접 수정, Express→Workers, Pages=풀기능.

## Checklist

- [ ] 바닐라 변경이면 `sync:render` 먼저
- [ ] 새 스타일은 `react-extra.css`
- [ ] `npm run build` 경고 0 + `:5000` 수동 확인
- [ ] 시크릿 미노출
