---
name: hbu-tier-class
description: >
  공식 1~9 티어표, tier-class 페이지, tier-image 캐릭터 추가/수정.
  티어표·캐릭터 카드 작업 시 사용.
---

# 에이전트 스킬 — 공식 티어표 (tier-class)

## When

- `tier-class/tierN.html` 수정
- 캐릭터 추가·이미지·설명 변경
- 메인 티어 카드 연동
- 커스텀 메이커 캐릭터 풀 소스(티어 페이지 파싱) 영향

## Code map

| 경로 | 역할 |
|------|------|
| `tier-class/tier1.html` ~ `tier9.html` | 티어별 페이지 |
| `tier-class/tierN.css` | 페이지 스타일 |
| `tier-image/` | 캐릭터·로고 이미지 |
| `index.html` | 티어 카드 진입점 |

## Read first

- `RDMD/features/tier-class.md`
- 수정 대상 `tierN.html` 기존 카드 마크업 패턴

## Do

1. **정적 HTML** 유지 — 불필요하게 DB/API 도입하지 않음
2. 캐릭터 추가 순서:
   - 이미지를 `tier-image/` 적절한 폴더에 배치
   - `tierN.html`에 기존 카드와 동일 구조로 마크업
   - 이미지 경로가 하위 폴더·base path에서 동작하는지 확인
3. 커스텀 메이커가 tier-class를 파싱하면 → `custom-maker` 쪽 풀 반영 여부 확인 (`groks/custom-maker/grok_skill.md`)
4. CSS는 해당 `tierN.css` 또는 공통만 — 전역 레이아웃 회귀 주의
5. header/footer placeholder + `common.js` 경로 depth 유지

## Do not

- 티어 페이지에 관리자 전용 로직 하드코딩
- 이미지 대량 바이너리를 설명 없이 삭제
- `text-align: center` 전역으로 레이아웃 재파괴

## Agent tasks

### A. 캐릭터 1명 추가
1. 사용자에게 티어 번호·이미지 파일·표시 이름 확인 (없으면 추론 가능한 것만)  
2. 이미지 경로 배치  
3. HTML 카드 추가  
4. 브라우저에서 `tierN` + (가능 시) 커스텀 메이커 풀 확인 안내  

### B. 티어 페이지 스타일 수정
1. 해당 `tierN.css`만 우선  
2. 다른 티어와 톤 맞추기  
3. 모바일/기존 레이아웃 깨짐 체크 요청  

### C. 메인 카드 연동
1. `index.html` 티어 카드 링크가 `tier-class/tierN.html` 상대 경로인지 확인  
2. `getBasePath` 환경에서도 동작하는지 확인  

## Checklist

- [ ] 이미지 로드 OK
- [ ] header/footer OK
- [ ] 커스텀 메이커 영향 검토
- [ ] 불필요한 API 변경 없음
