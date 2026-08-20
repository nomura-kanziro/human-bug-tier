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
- `tier-image/1 tier/` ~ `9 tier/` (6~9도 이미지 있음)
- `index.html` 티어 카드

## Read first

- `RDMD/features/tier-class.md`
- 대상 HTML 카드 마크업 패턴

## 현재 (작업 전 이해)

- 공식 티어는 **정적 HTML**. DB 없음
- 카드 = `img` + 이름. 커스텀 메이커는 `.char` 파싱 → HTML이 풀의 정본
- 이미지 폴더는 티어 번호와 같아야 함

## Do

1. 정적 HTML 유지 (불필요한 DB 도입 금지)
2. **추가**: `tier-image/N tier/` + `tierN.html` 동일 카드, `img src` 일치
3. **티어 이동**: `git mv` 이미지 폴더 + 출발 HTML 제거 + 도착 칸 삽입 + src 수정
4. **같은 티어 재배치**: HTML 순서만
5. 메이커 파싱 영향 시 `custom-maker` 스킬 확인
6. CSS는 해당 tier 파일 우선, 전역 레이아웃 회귀 금지
7. header/footer + common.js depth 유지

## Do not

- 관리 로직을 티어 페이지에 하드코딩
- 이미지 무단 대량 삭제
- HTML만 옮기고 이미지 폴더를 안 옮김 (또는 그 반대)
- `body { text-align: center }` 전역 회귀

## Tasks

**A. 캐릭터 추가** — 티어/이름/이미지 → 배치 → HTML → 메이커 풀 확인 안내  
**B. 티어 이동** — 폴더 `git mv` + HTML 양쪽  
**C. 스타일** — tierN.css → 다른 티어 톤  
**D. 메인 연동** — index 상대 링크 + getBasePath  

## Checklist

- [ ] 이미지 경로가 실제 파일과 일치
- [ ] 티어 이동 시 폴더+HTML
- [ ] 메이커 풀 확인
- [ ] API 불필요 변경 없음
