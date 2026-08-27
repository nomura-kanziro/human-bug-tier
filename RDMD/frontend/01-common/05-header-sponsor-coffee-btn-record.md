---
area: frontend
feature: common
---

# 헤더 후원(커피) 버튼

## 개요
후원 사이트 프로필로 가는 커피 아이콘을 헤더 오른쪽에 추가했다.  
링크는 코드에 박지 않고 `common.js` 상수에 직접 넣도록 했다.

## 관련 커밋
- **689ee4c** — `feat(common): 헤더에 후원 커피 버튼 추가`

## 변경된 파일
- `header.html` — `#header-sponsor-btn` (커피 SVG)
- `common.js` — `SPONSOR_PROFILE_URL`, `renderSponsorButton()`
- `Header_Footer.css` — 원형 아이콘 버튼 · 모바일 44px
- `RDMD/features/common-infra.md`, `.agents/common/skill.md`, `.claude/skills/common/SKILL.md`

## 주요 구현
1. **로그아웃**: 로그인 버튼 왼쪽
2. **로그인**: 알림 버튼 왼쪽 (알림이 없으면 프로필 왼쪽)
3. URL은 `common.js` 맨 위 `SPONSOR_PROFILE_URL` 한곳만 수정
4. 값이 비어 있으면 클릭해도 이동하지 않음. 값이 있으면 새 탭
5. `fixRootLinksInElement`가 외부 URL을 내부 경로로 바꾸지 않도록 `https?://` 로 세팅

## 변경 전/후
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 헤더 후원 진입 | 없음 | 커피 아이콘 버튼 |
| 후원 URL | — | `SPONSOR_PROFILE_URL`에 직접 입력 |

## 테스트
1. URL 비움 → 버튼은 보이지만 클릭 시 이동 없음
2. URL 입력 → 새 탭으로 후원 프로필
3. 로그아웃: 로그인 왼쪽
4. 로그인: 알림 왼쪽
5. 루트 · `tier-class/tier1` · `admin/comments/` 깊은 경로에서도 헤더에 동일 표시

## 날짜
2026-08-27
