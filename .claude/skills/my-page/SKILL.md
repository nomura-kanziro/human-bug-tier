---
name: my-page
description: >
  마이페이지, 유저 프로필 드롭다운, 내 게시글·행운 뽑기 집계, mine=true, luck-draw stats. Use when /my-page.
---

# Claude 스킬 — 마이페이지

## When

- 헤더 프로필 드롭다운(`#user-profile-panel`) 변경
- `my-page/` 페이지, 내 활동 통계 변경

## Code map

- `my-page/my-page.html|css|js`
- `common.js` (`getCurrentIdentity`, `renderUserProfile` 이하 프로필 패널 함수들)
- `Header_Footer.css` (`.user-profile-panel*`)
- `backend/controllers/tierController.js`(`mine`), `backend/controllers/luckDrawController.js`(`getStats`), `backend/models/LuckProfile.js`(포인트·횟수·최고티어 실제 출처)

## Read first

- `.agents/my-page/skill.md` (정본, 최우선)
- `RDMD/features/my-page.md`
- `my-page/README.md`

## Do

1. `.agents/my-page/skill.md` 와 모순 없이 작업 (정본 우선)
2. 일반 유저 + 어드민 **완전히 동일한** 드롭다운. 어드민은 "관리하기" 한 줄만 추가(그 항목 자체는 `admin` 스킬 소관) — 마이페이지·게시판·사진변경은 어드민도 그대로 씀
3. 알림 벨(`#notification-panel`)과 동일한 열기/닫기 패턴 재사용 — 새 패턴 발명 금지
4. 게시글 통계는 기존 `tierlists` API 조합. 행운 통계(포인트 포함)는 `luck-draw` 의 `/stats` 응답을 **표시만** — 마이페이지에서 재계산·재저장 금지
5. `mine=true` 같은 소유자 필터는 서버에서 **요청자==대상** 검증 필수
6. 경로/API: `getBasePath()` / `getApiBase()` / `getAuthHeaders()` 재사용

## Do not

- `User` 스키마에 포인트/뱃지 필드 추가 (포인트는 `LuckProfile` 소관)
- 어드민 드롭다운을 일반 유저와 다르게 축소하기 (사용자가 명시적으로 "관리자 티 안 나게" 통일해달라고 요청함)
- 소유자 필터를 인증 없이 우회 가능하게 두기
- 패널 메뉴에 `onclick` 재도입 (`data-action` + `addEventListener` 위임 유지)

## Checklist

- [ ] 프로필 드롭다운 열기/닫기, 알림 벨과 상호 배타
- [ ] 마이페이지 통계 5항목 정상(게시글/좋아요/뽑기횟수/최고등급/포인트)
- [ ] 비공개 글 노출 범위(본인만) 확인
- [ ] 비로그인 접근 시 리다이렉트
- [ ] 어드민 드롭다운이 일반 유저와 동일(+ "관리하기"), 마이페이지 정상 진입
