---
name: tier-class
description: >
  공식 1~9 티어표, tiers.json, 캐릭터 추가·이동·이미지 교체. Codex: official tier pages.
---

# Codex 스킬 — 공식 티어표

> 정본 `.agents/tier-class/skill.md`. 2026-10-02 React 기준으로 다시 씀.

## When

- 공식 티어표 캐릭터 추가·이동·재배치·이미지 교체, 등급 색·카드 스타일
- `root-cloudflare/src/data/tiers.json`, `src/pages/TierPage.jsx`, `public/tier-media/tier-image/` 변경

## Code map

- **정본** `root-cloudflare/src/data/tiers.json` → 파생 `src/data/tiers.js`(`TIERS`·`ALL_CHARACTERS`)
- `src/pages/TierPage.jsx`(`/tier/:n`), `src/styles/tier-board.css`(등급 색 `.tier-scope[data-tier="N"]`), `tier-nav.css`
- 이미지 `root-cloudflare/public/tier-media/tier-image/N tier/`, 주소는 `src/lib/paths.js` `tierImageUrl()`
- 같은 데이터를 쓰는 곳: 커스텀 메이커(`ALL_CHARACTERS`), 게시글 상세, 서버 `backend/data/tierCatalog.js`(이벤트 퀴즈 — 같은 파일을 읽음)
- **따로 관리**: 행운 뽑기 `backend/data/luckPool.js`(티어별 이름·이미지 경로)
- (보관본·수정 금지) `root-render/tier-class/tierN.html`, `root-cloudflare/scripts/extract-tiers.mjs`

## Read first

- `RDMD/features/tier-class.md` (특히 "주의 — extract 금지")

## 현재 (작업 전 이해)

- DB 없음. 티어표는 `tiers.json` 한 파일이 정본이고, 2026-09-19 이후 수정은 전부 이 파일에 직접 한다
- `npm run extract:tiers` / `npm run sync:render` 는 바닐라 HTML 로 `tiers.json` 을 **통째로 덮어쓴다** — 바닐라에는 09-20 이후 수정이 없어 실행하면 최근 수정이 되돌아간다. **실행 금지**
- 이미지 폴더 = 티어 번호(`6 tier` 이미지는 6티어). 같은 파일명으로 덮어쓰면 데이터 수정 불필요, 파일명·확장자가 바뀌면 `tiers.json` + `luckPool.js` 둘 다

## Do

1. 추가: 이미지를 `public/tier-media/tier-image/N tier/` 에 넣고 `tiers.json` 지정 세부등급·위치에 `{ img, alt, name }`
2. 티어 이동: `git mv` 로 이미지 폴더 이동 + `tiers.json` 항목 이동·`img` 경로 수정 + `luckPool.js` 에 있으면 티어 키·경로 수정
3. 같은 티어 재배치: `tiers.json` 항목 순서만
4. 수정 후 `npm run build` → `/tier/N` 화면과 커스텀 메이커 풀 확인, 이미지 로딩 실패 0건
5. 등급 색은 `tier-board.css` 의 해당 블록에서만

## Do not

- `npm run extract:tiers` · `npm run sync:render` 실행, `root-render/tier-class/` 수정
- 화면 코드에 캐릭터·세부등급 하드코딩 (전부 `tiers.json` → `tiers.js`)
- 이미지 무단 대량 삭제, 이미지만 옮기고 `tiers.json` 경로를 안 고침(또는 그 반대)
- 이미지 파일명을 바꾸고 `luckPool.js` 를 빠뜨림

## Checklist

- [ ] `tiers.json` 이 올바른 JSON(빌드 성공)
- [ ] 모든 `img` 가 실제 파일과 일치(파일명·확장자), 바뀐 파일은 `luckPool.js` 도 확인
- [ ] 같은 이미지가 같은 등급에 두 번 들어가지 않았는지(의도한 중복 제외)
- [ ] `/tier/N` · 커스텀 메이커 풀에서 확인
