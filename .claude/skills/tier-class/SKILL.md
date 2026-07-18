---
name: tier-class
description: >
  공식 1~9 티어표, tier-class, tier-image, 캐릭터 추가. Use when /tier-class.
---

# Claude 스킬 — 공식 티어표

## When

- `tier-class/tierN.html` 수정, 캐릭터·이미지 추가
- 메인 티어 카드 연동, 커스텀 메이커 풀 소스 영향

## Code map

- `tier-class/tier1.html` ~ `tier9.html` + `tierN.css`
- `tier-image/`
- `index.html` 티어 카드

## Read first

- `RDMD/features/tier-class.md`
- 대상 HTML 카드 마크업 패턴

## Do

1. 정적 HTML 유지 (불필요한 DB 도입 금지)
2. 캐릭터 추가: `tier-image/` → `tierN.html` 동일 카드 구조 → 경로 확인
3. 메이커 파싱 영향 시 `custom-maker` 스킬 확인
4. CSS는 해당 tier 파일 우선, 전역 레이아웃 회귀 금지
5. header/footer + common.js depth 유지

## Do not

- 관리 로직을 티어 페이지에 하드코딩
- 이미지 무단 대량 삭제
- `body { text-align: center }` 전역 회귀

## Tasks

**A. 캐릭터 추가** — 티어/이름/이미지 → 배치 → HTML → 메이커 풀 확인 안내  
**B. 스타일** — tierN.css → 다른 티어 톤  
**C. 메인 연동** — index 상대 링크 + getBasePath  

## Checklist

- [ ] 이미지·header OK
- [ ] 메이커 영향 검토
- [ ] API 불필요 변경 없음
