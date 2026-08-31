---
name: my-page
description: >
  유저 프로필 드롭다운, 마이페이지, 내 게시글·행운 뽑기 집계. Canonical for ANY AI.
---

# 공통 스킬 — 마이페이지 (my-page)

## When

- 헤더 프로필 아이콘 클릭 동작(`#user-profile`, `#user-profile-panel`) 변경
- `my-page/` 페이지, 내 활동 통계·목록 변경

## Code map

- `my-page/` (html·css·js·README)
- `common.js` → `renderUserProfile`, `toggleUserProfileMenu`, `closeUserProfileMenu*`, `bindUserProfileMenuActions`
- `Header_Footer.css` → `.user-profile-panel*`
- `backend/controllers/tierController.js` (`mine=true` 옵션), `backend/controllers/luckDrawController.js` (`getStats`), `backend/models/LuckProfile.js` (누적 포인트·횟수·최고티어의 실제 출처)

## Read first

- `RDMD/features/my-page.md`
- `my-page/README.md`

## 현재 (작업 전 이해)

- **일반 유저 + 어드민 둘 다 드롭다운**(`common.js` `renderUserProfile()`). 관리자 메뉴 구성은 `admin` 스킬 소관 — 마이페이지·게시글·행운뽑기 항목은 일반 유저 전용, 어드민은 "관리하기"/"로그아웃"만
- 드롭다운은 알림 벨(`#notification-panel`)과 **동일한 패턴**(`.is-open` 토글 + outside-click 닫기) — 새 UI 패턴 발명 금지, 벨과 동시에 열리지 않도록 서로 닫아줌
- **행운 포인트는 실제 적립형** (`luck-draw` 스킬의 `LuckProfile` 참고) — 마이페이지는 이 값을 **표시만** 함, 여기서 새로 계산/저장하지 않음. `User` 스키마에는 여전히 포인트 필드 추가 안 함
- 게시글 목록은 `GET /api/tierlists?author=&mine=true` — `mine=true` 는 **요청자 닉네임과 author가 일치할 때만** `isPublic` 필터를 건너뜀 (다른 사람 비공개 글 유출 금지, 검증 완료)
- 뽑기 통계는 `GET /api/luck-draw/stats` — `LuckProfile` 누적치를 그대로 반환(포인트·총횟수·최고티어). `LuckDraw`(이력)는 최근 5건만 있어서 집계에 쓰면 안 됨
- 비로그인 접근 시 `my-page/my-page.html` → 로그인 페이지로 리다이렉트

## Do

1. 프로필 패널 관련 변경은 `common.js` 안에서만 (새 파일로 쪼개지 않음 — 헤더 로직이 흩어지지 않게)
2. 새 통계 항목 추가 시 **기존 API 응답을 조합**하는 방향을 먼저 검토, 새 스키마는 최후 수단
3. `mine=true` 처럼 소유자 전용 필터를 추가할 땐 **요청자 신원과 대상 일치 여부**를 서버에서 반드시 확인
4. 경로/API: `getBasePath()` / `getApiBase()` / `getAuthHeaders()` 재사용
5. 이벤트: `addEventListener` + `data-action` 위임 (패널 메뉴에 `onclick` 재도입 금지)

## Do not

- `User` 스키마에 포인트/뱃지 필드 추가 (포인트는 `luck-draw` 의 `LuckProfile` 소관)
- 마이페이지에서 포인트·통계를 독자적으로 재계산 (항상 `/api/luck-draw/stats` 응답을 그대로 표시)
- 어드민 드롭다운에 마이페이지·게시글·뽑기 메뉴 추가 (관리자는 "관리하기"/"로그아웃"만 — `admin` 스킬 참고)
- `mine=true` 를 인증 없이 또는 다른 사람 대상으로 우회 가능하게 만들기
- 알림 벨과 다른 새 드롭다운 CSS/JS 패턴을 별도로 만들기

## Checklist

- [ ] 로그인 유저 프로필 클릭 → 드롭다운 오픈/아웃사이드 클릭 닫힘
- [ ] 알림 벨과 동시에 안 열림
- [ ] 마이페이지 통계 5칸 정상 (게시글 수/좋아요 합/뽑기 횟수/최고 티어/포인트)
- [ ] 비공개 글이 `mine=true` + 본인 토큰에서만 보임
- [ ] 비로그인 마이페이지 접근 → 리다이렉트
- [ ] 어드민 로그인 시 드롭다운(관리하기/로그아웃) 정상, 마이페이지 메뉴는 안 뜸
