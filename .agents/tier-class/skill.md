---
name: tier-class
description: >
  공식 1~9 티어표, tier-class, tier-image. Canonical for ANY AI.
---

# 공통 스킬 — 공식 티어표

## When

- `tier-class/tierN.html`, 캐릭터·이미지, 메인 티어 카드

## Code map

- `tier-class/tier1.html` ~ `tier9.html` + css
- `tier-image/`, `index.html`

## Read first

- `RDMD/features/tier-class.md`

## Do

1. 정적 HTML 유지 (불필요 DB 금지)
2. 캐릭터: `tier-image/` → `tierN.html` 동일 카드 구조
3. 메이커 풀 영향 시 `custom-maker` skill 확인
4. CSS는 tierN 우선, 전역 레이아웃 회귀 금지
5. header/footer + common.js depth 유지

## Do not

- 관리 로직을 티어 페이지에 하드코딩
- 이미지 무단 대량 삭제
- `body { text-align: center }` 전역 회귀

## Checklist

- [ ] 이미지·header OK
- [ ] 메이커 영향 검토
