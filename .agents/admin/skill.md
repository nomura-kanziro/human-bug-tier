---
name: admin
description: >
  관리자 로그인, 대시보드, 차단, 티어 신고. Canonical for ANY AI.
---

# 공통 스킬 — 관리자

## When

- admin-login, 대시보드, 차단, 티어 신고, 관리 401/403

## Code map

- (현행 React) `root-cloudflare/src/pages/AdminLogin.jsx`(`/admin/login`), `AdminDashboard.jsx`(`/admin`, 빠른 이동 `quickItems`), `AdminCommentDetail.jsx`(`/admin/comment`)
- (현행 React) `src/components/AdminQuickNav.jsx`, `AdminEventManager.jsx`(이벤트 관리), `AdminLuckManager.jsx`(행운 뽑기 관리), `AdminPagination.jsx`, `NoticeEditor.jsx`; `src/lib/api.js`(`adminRequest`·`getAdminAuthHeaders`), `src/lib/adminApi.js`
- (바닐라 보관본·수정 금지) `root-render/admin/admin-login.*`, `admin_api.js`, `admin/comments/comment-management.*`, `comment-detail.*`
- `backend/middleware/auth.js` (requireAdmin)
- adminRoutes, admin controllers
- 헤더 프로필 드롭다운: `common.js` `getCurrentIdentity()`, `renderUserProfile()` — 관리자도 **일반 유저와 완전히 동일한 메뉴**(마이페이지/게시판/사진변경/로그아웃)를 쓰고 "관리하기"만 추가로 붙음 (`my-page` 스킬 참고)

## Read first

- `.agents/common-rules.md` (C절)
- `RDMD/features/admin.md`
- `RDMD/frontend/07-admin/11-admin-quicknav-record.md`, `12-admin-luck-manager-record.md`
- `RDMD/guides/security.md`

## 현재 (작업 전 이해)

- 공지는 작성뿐 아니라 **수정**(PUT/PATCH `/api/notices/:id`)도 관리 페이지에서 함
- 티어 신고: `/api/admin/tier-reports/*`
- **이벤트 관리**(`AdminEventManager`): 메모리 기록 이벤트·티어표 공개 열기/마감/정산 — 여는 순간 회원 전체 알림(되돌릴 수 없음)
- **행운 뽑기 관리**(`AdminLuckManager`, 2026-10-01): 조회 전용. `GET /api/admin/luck/users`, `/users/:userId`, `/users/:userId/points` — 회원별 3모드 기록·포인트 원장. 지갑 주인 [관리자]/[탈퇴] 배지
- 관리자 로그인은 관리자 토큰을 `adminAuthToken` **과 `authToken` 둘 다**에 저장한다(`AdminLogin.jsx`). 그래서 관리자가 일반 기능(행운 뽑기 등)을 쓰면 `req.auth.sub` 가 **Admin 문서 id** 가 된다 — 회원 id 로 찾는 코드는 관리자를 못 찾으니 관리자도 함께 찾을 것(예: `adminLuckController.resolveAccounts`)
- 회원 삭제: `DELETE /api/admin/users/:id` (`requireAdmin`, 계정+커스텀 글·댓글·문의 정리)
- 헤더 프로필 아이콘 클릭 시 관리자도 일반 유저와 **완전히 같은** 드롭다운(`#user-profile-panel`)을 씀 — 예전엔 전체화면 모달(`showAdminModal`), 그다음엔 관리자 전용 축소 메뉴였으나 최종적으로 "테스트 중 관리자 티가 나면 안 된다"는 이유로 일반 메뉴 전체 + "관리하기" 한 줄 추가로 정리됨
- 관리자도 `localStorage.authToken` 이 세팅돼 있어(`admin-login.js` 가 `adminAuthToken` 과 같이 저장) 마이페이지·행운뽑기 등 **일반 회원 API를 그대로 쓸 수 있다** — 백엔드는 `isAdmin` 여부를 안 가리고 토큰만 검증하므로 별도 처리 불필요

## Do

1. 모든 관리 fetch → **getAdminAuthHeaders()**
2. 새 관리 라우트 → **requireAdmin**
3. 토큰: `adminAuthToken` / `isAdmin` (유저 토큰 분리)
4. UI 패턴: 큰 기능은 `src/components/Admin*Manager.jsx` + `<section id="admin-xxx" data-admin-anchor>`, `AdminDashboard.jsx` 의 `quickItems` 에 빠른 이동 태그를 같은 순서로 추가. 저장·삭제 후 목록 다시 불러오기
5. 공지 필터 색 #10b981, 공지 수정 폼 저장/취소 유지
6. 파괴 동작 confirm
7. ADMIN_INPUT_* 값 출력 금지

## Do not

- requireAdmin 누락
- 일반 JWT로 관리 API 성공 착각
- 비밀번호 하드코딩

## Checklist

- [ ] 관리자 로그인→대시보드
- [ ] 일반 토큰 → 403
- [ ] 헤더 누락 없는 fetch
- [ ] 헤더 프로필 드롭다운 → 마이페이지/게시판/사진변경/**관리하기**/로그아웃 전부 정상, 알림 벨과 상호 배타
