---
name: hbu-common
description: >
  common.js, header/footer, getBasePath, getApiBase, 링크 404, 네비게이션.
  헤더/푸터/경로/공통 스크립트 작업 시 사용.
---

# 에이전트 스킬 — 공통 인프라 (common)

## When

- Header/Footer 깨짐, 404, 로고·메뉴 링크 오류
- `getBasePath`, `getApiBase`, `getAuthHeaders` 변경
- 모든 페이지에 영향 주는 공통 UI/스크립트
- GitHub Pages 서브패스 / 하위 폴더 경로 이슈

## Code map

| 경로 | 역할 |
|------|------|
| `common.js` | base path, API base, auth headers, header 로드, 알림 |
| `common.css` | 전역 스타일 |
| `Header_Footer.css` | 헤더·푸터·사이드 메뉴 |
| `header.html` / `footer.html` | 마크업 (동적 주입) |

## Read first

- `RDMD/features/common-infra.md`
- `RDMD/guides/path-and-api.md`
- `common.js` 상단 주석 및 핵심 함수

## Do

1. 변경 전 `getBasePath` / `getApiBase` / `fixRootLinksInElement` / `getAuthHeaders` 동작 읽기
2. **전 페이지 회귀**를 염두에 두고 최소 수정
3. 내부 링크: 선행 `/` 하드코딩 지양 → 상대 경로 또는 fixRootLinks 대상
4. 새 헬퍼 추가 시 API base 분기(로컬 포트 / GH Pages / 동일 오리진) **기존과 동일**
5. header 이벤트는 로드 후 `addEventListener` 패턴 유지 (`onclick` 재도입 금지)
6. 변경 후 검증 시나리오를 사용자에게 제시:
   - 루트 `index.html`
   - `tier-class/tier1.html`
   - `admin/comments/comment-management.html` (깊은 경로)
   - 로컬 `:5000` 권장

## Do not

- `localhost:5000` 을 프로덕션 경로에 고정
- GH Pages에서 API가 된다고 가정
- header.html 링크만 고치고 `common.js` 보정 로직과 모순 만들기
- `body { text-align: center }` 같은 전역 레이아웃 회귀 유발 CSS

## Agent tasks (요청 유형별)

### A. 링크 404 수정
1. 재현 경로(어느 HTML 깊이) 확인  
2. `getBasePath()` 계산 결과 추적  
3. `header.html` 상대 경로 + `fixRootLinksInElement` 적용 여부 확인  
4. 최소 diff로 수정  

### B. API 연결 실패
1. `window.location.port` / hostname 확인  
2. `getApiBase()` 반환값 확인  
3. backend가 5000에서 떠 있는지 안내  
4. 모듈별 `auth_api.js` / `admin_api.js` 도 동일 규칙인지 확인  

### C. 공통 UI 추가 (메뉴 항목 등)
1. `header.html` (및 필요 시 footer) 수정  
2. 상대 경로로 링크  
3. `attachHeaderEvents` 등 이벤트 재바인딩 필요 여부  
4. 사이드 메뉴·데스크탑 네비 둘 다 확인  

## Checklist

- [ ] 하위 폴더 2단 이상에서 header/footer 로드
- [ ] 메뉴 이동 깨지지 않음
- [ ] API base 분기 유지
- [ ] RDMD information 기록 제안 (큰 변경 시)
