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
- `tier-image/1 tier/` ~ `9 tier/` (6~9도 이미지 있음)
- `index.html` 티어 카드

## Read first

- `RDMD/features/tier-class.md`

## 현재 (작업 전 이해)

- 공식 티어는 **정적 HTML**. DB 없음
- 카드 = `img` + 이름. 커스텀 메이커는 `.char` 를 파싱해 풀을 만듦 → HTML이 풀의 정본
- 이미지 폴더는 티어 번호와 같아야 함 (`6 tier` 이미지는 6티어 페이지)

## Do

1. 정적 HTML 유지 (불필요 DB 금지)
2. **추가**: `tier-image/N tier/` 이미지 + `tierN.html` 동일 카드, `img src` 파일명 일치
3. **티어 이동(승격·추락)**: `git mv`로 이미지 폴더 이동 + 출발 HTML에서 카드 제거 + 도착 페이지 지정 칸에 삽입 + src 경로 수정
4. **같은 티어 재배치**: HTML 카드 순서만. 폴더는 그대로
5. 메이커 풀 영향 시 `custom-maker` skill 확인
6. CSS는 tierN 우선, 전역 레이아웃 회귀 금지
7. header/footer + common.js depth 유지

## Do not

- 관리 로직을 티어 페이지에 하드코딩
- 이미지 무단 대량 삭제
- HTML만 옮기고 이미지 폴더를 안 옮김 (또는 그 반대)
- `body { text-align: center }` 전역 회귀

## Checklist

- [ ] 이미지 경로가 실제 파일과 일치
- [ ] 티어 이동 시 폴더+HTML 둘 다
- [ ] header OK, 메이커 풀 확인
